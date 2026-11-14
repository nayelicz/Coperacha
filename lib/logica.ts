import type { Aportacion, BaseDeDatos, Coperacha, Regreso } from "./types";
import { nuevoId } from "./db";

const DIA = 24 * 60 * 60 * 1000;
export const r2 = (n: number) => Math.round(n * 100) / 100;

export function metaBarrio(c: Coperacha) {
  return r2(c.montoMeta * 0.8);
}

export function juntadoBarrio(c: Coperacha) {
  return r2(
    c.aportaciones.filter((a) => a.estado === "confirmada").reduce((s, a) => s + a.montoAceptado, 0),
  );
}

export function faltaBarrio(c: Coperacha) {
  return Math.max(0, r2(metaBarrio(c) - juntadoBarrio(c)));
}

/** Límite de monto según certificados de Buen Pagador. */
export function limitePorNivel(certificados: number) {
  if (certificados >= 2) return 20000;
  if (certificados === 1) return 10000;
  return 5000;
}

/** Actualiza estados que dependen del tiempo (coperacha vencida, cobros expirados). */
export function refrescarTiempos(c: Coperacha, ahora = Date.now()) {
  for (const a of c.aportaciones) {
    if (a.estado === "pendiente" && new Date(a.expiraEn).getTime() < ahora) a.estado = "expirada";
  }
  if (c.estado === "juntando" && new Date(c.juntarHasta).getTime() < ahora) c.estado = "vencida";
}

/** ¿Se puede aceptar un cobro nuevo? Devuelve el motivo si no. */
export function motivoBloqueo(c: Coperacha): string | null {
  refrescarTiempos(c);
  if (c.estado === "vencida") return "Esta coperacha ya venció. Ya no se aceptan aportaciones.";
  if (c.estado !== "juntando" || faltaBarrio(c) <= 0)
    return "¡La meta del barrio ya se juntó! Ya no se aceptan más aportaciones.";
  return null;
}

export type ResultadoPago =
  | { tipo: "duplicado"; mensaje: string }
  | { tipo: "aplicado"; estado: Aportacion["estado"] | Regreso["estado"]; coperachaId: string; completo: boolean; mensaje: string }
  | { tipo: "huerfano"; mensaje: string };

export interface PagoEntrante {
  transactionId: string;
  amount: number;
  aportacionId?: string;
  regresoId?: string;
  codiQrId?: string;
  simulado: boolean;
}

/**
 * Aplica un pago confirmado (del webhook de pey o del botón de simulación).
 * Idempotente: el mismo transactionId nunca se cuenta dos veces.
 * Debe llamarse dentro de conBase() para que corra en fila.
 */
export function aplicarPago(db: BaseDeDatos, p: PagoEntrante): ResultadoPago {
  if (db.procesados.some((e) => e.clave === p.transactionId)) {
    return { tipo: "duplicado", mensaje: `La transacción ${p.transactionId} ya estaba registrada. No se cuenta dos veces.` };
  }

  // 1) ¿Es el pago de un regreso (el negocio regresando dinero)?
  for (const c of db.coperachas) {
    const reg = c.regresos.find(
      (r) => (p.regresoId && r.id === p.regresoId) || (r.peyTransactionId && r.peyTransactionId === p.transactionId),
    );
    if (reg) {
      if (reg.estado === "pagado" || reg.estado === "simulado") {
        return { tipo: "duplicado", mensaje: "Ese regreso ya estaba pagado." };
      }
      reg.estado = p.simulado ? "simulado" : "pagado";
      reg.simulado = p.simulado;
      reg.actualizadoEn = new Date().toISOString();
      db.procesados.push({ clave: p.transactionId, regresoId: reg.id, coperachaId: c.id, resultado: reg.estado, en: reg.actualizadoEn });
      revisarCertificado(db, c);
      return { tipo: "aplicado", estado: reg.estado, coperachaId: c.id, completo: c.estado === "pagada", mensaje: "Regreso confirmado." };
    }
    if (c.tarifa.peyTransactionId && c.tarifa.peyTransactionId === p.transactionId) {
      c.tarifa.estado = "pagada";
      db.procesados.push({ clave: p.transactionId, coperachaId: c.id, resultado: "tarifa_pagada", en: new Date().toISOString() });
      return { tipo: "aplicado", estado: "pagado", coperachaId: c.id, completo: true, mensaje: "Tarifa Coperacha pagada." };
    }
  }

  // 2) ¿Es una aportación?
  let coperacha: Coperacha | undefined;
  let ap: Aportacion | undefined;
  for (const c of db.coperachas) {
    const a = c.aportaciones.find(
      (x) =>
        (p.aportacionId && x.id === p.aportacionId) ||
        (x.peyTransactionId && x.peyTransactionId === p.transactionId) ||
        (p.codiQrId && x.codiQrId === p.codiQrId),
    );
    if (a) {
      coperacha = c;
      ap = a;
      break;
    }
  }
  if (!coperacha || !ap) {
    db.huerfanos.push({ en: new Date().toISOString(), payload: p });
    db.procesados.push({ clave: p.transactionId, resultado: "huerfano", en: new Date().toISOString() });
    return { tipo: "huerfano", mensaje: "Pago recibido, pero no corresponde a ninguna aportación. Quedó guardado para revisión." };
  }

  if (ap.estado === "confirmada" || ap.estado === "devolucion_pendiente") {
    return { tipo: "duplicado", mensaje: "Esa aportación ya estaba confirmada." };
  }

  const c = coperacha;
  const ahora = new Date().toISOString();
  ap.montoRecibido = p.amount;
  ap.simulado = p.simulado;
  ap.peyTransactionId = ap.peyTransactionId || p.transactionId;
  ap.confirmadaEn = ahora;

  // El monto recibido debe coincidir con lo que pedimos (0.01 en demo).
  if (!p.simulado && Math.abs(p.amount - ap.montoCobrado) > 0.001) {
    ap.nota = `pey reportó $${p.amount} y se pidió $${ap.montoCobrado}. Revisar.`;
  }

  refrescarTiempos(c);
  if (ap.estado === "expirada") ap.estado = "pendiente"; // pagó justo al límite: el banco manda

  const cerrada = c.estado !== "juntando" || faltaBarrio(c) <= 0;
  if (cerrada) {
    // Pago tardío: la meta ya se cumplió o venció → se regresa completo.
    ap.estado = "devolucion_pendiente";
    ap.montoAceptado = 0;
    ap.excedente = ap.monto;
    ap.nota = c.estado === "vencida" ? "Llegó después de que venció la coperacha." : "Llegó cuando la meta ya estaba completa.";
  } else {
    const falta = faltaBarrio(c);
    ap.montoAceptado = Math.min(ap.monto, falta);
    ap.excedente = r2(ap.monto - ap.montoAceptado);
    ap.estado = "confirmada";
    if (ap.excedente > 0) ap.nota = `Sobraron $${ap.excedente}: se le regresan sin ganancia.`;
  }

  db.procesados.push({ clave: p.transactionId, aportacionId: ap.id, coperachaId: c.id, resultado: ap.estado, en: ahora });

  let completo = false;
  if (c.estado === "juntando" && faltaBarrio(c) <= 0) {
    c.estado = "completa";
    c.completadaEn = ahora;
    c.regresarEl = new Date(Date.now() + c.plazoDias * DIA).toISOString();
    c.sedeco.desbloqueado = true;
    c.sedeco.desbloqueadoEn = ahora;
    completo = true;
  }
  return {
    tipo: "aplicado",
    estado: ap.estado,
    coperachaId: c.id,
    completo,
    mensaje: completo
      ? "¡Meta del barrio completa! Se desbloqueó el Impulso SEDECO."
      : ap.estado === "devolucion_pendiente"
        ? "Pago recibido tarde: quedó como devolucion_pendiente para regresárselo completo."
        : "Aportación confirmada.",
  };
}

/** Lo que le toca recibir a cada persona al final. */
export function calcularRegresos(c: Coperacha): Omit<Regreso, "id" | "estado" | "simulado" | "montoCobrado" | "actualizadoEn">[] {
  const lista: Omit<Regreso, "id" | "estado" | "simulado" | "montoCobrado" | "actualizadoEn">[] = [];
  for (const a of c.aportaciones) {
    if (a.estado === "confirmada" && a.montoAceptado > 0) {
      const factor = a.ganancia === "efectivo4" ? 1.04 : 1.08;
      lista.push({
        tipo: "aportacion",
        aportacionId: a.id,
        paraQuien: a.nombre,
        clabe: a.clabeRetorno,
        monto: r2(a.montoAceptado * factor),
        nota: a.ganancia === "efectivo4" ? "Su dinero + 4% en efectivo a su banco" : "Su dinero + 8% en saldo para gastar en el negocio",
      });
    }
    if (a.excedente > 0 && (a.estado === "confirmada" || a.estado === "devolucion_pendiente")) {
      lista.push({
        tipo: "excedente",
        aportacionId: a.id,
        paraQuien: a.nombre,
        clabe: a.clabeRetorno,
        monto: a.excedente,
        nota: "Devolución íntegra (llegó tarde o sobró)",
      });
    }
  }
  if (c.sedeco.desbloqueado) {
    lista.push({ tipo: "sedeco", paraQuien: "Impulso SEDECO / FONDESO", monto: c.sedeco.monto, nota: "Devolución íntegra, 0% de interés" });
  }
  return lista;
}

export function totalARegresar(c: Coperacha) {
  return r2(calcularRegresos(c).filter((r) => !esBono(c, r)).reduce((s, r) => s + r.monto, 0));
}

function esBono(c: Coperacha, r: { tipo: string; aportacionId?: string }) {
  if (r.tipo !== "aportacion") return false;
  return c.aportaciones.find((a) => a.id === r.aportacionId)?.ganancia === "tienda8";
}
export { esBono };

export function revisarCertificado(db: BaseDeDatos, c: Coperacha) {
  if (c.regresos.length === 0) return;
  const listo = c.regresos.every((r) => ["pagado", "simulado", "bono_emitido"].includes(r.estado));
  if (!listo || c.certificado) return;
  c.estado = "pagada";
  const h = (db.historial[c.clabeDestino] ||= { certificados: 0 });
  h.certificados += 1;
  c.certificado = {
    folio: "CBP-" + nuevoId().toUpperCase().slice(0, 8),
    emitidoEn: new Date().toISOString(),
    nivelDesbloqueado: limitePorNivel(h.certificados),
  };
}

/** Datos públicos para el front (sin celulares completos). */
export function vistaPublica(c: Coperacha) {
  refrescarTiempos(c);
  return {
    ...c,
    celularNegocio: c.celularNegocio ? "•••• " + c.celularNegocio.slice(-4) : "",
    tieneCelularNegocio: Boolean(c.celularNegocio),
    aportaciones: c.aportaciones
      .filter((a) => a.estado !== "expirada" && a.estado !== "error")
      .map((a) => ({
        ...a,
        celular: "•••• " + a.celular.slice(-4),
        clabeRetorno: "•••• " + a.clabeRetorno.slice(-4),
        qrString: a.estado === "pendiente" ? a.qrString : undefined,
      })),
    regresos: c.regresos.map((r) => ({ ...r, clabe: r.clabe ? "•••• " + r.clabe.slice(-4) : undefined })),
    calculo: {
      metaBarrio: metaBarrio(c),
      juntadoBarrio: juntadoBarrio(c),
      faltaBarrio: faltaBarrio(c),
      personas: c.aportaciones.filter((a) => a.estado === "confirmada").length,
      pendientes: c.aportaciones.filter((a) => a.estado === "pendiente").length,
      porRegresar: calcularRegresos(c).map((r) => ({ ...r, clabe: r.clabe ? "•••• " + r.clabe.slice(-4) : undefined })),
      totalARegresar: totalARegresar(c),
    },
  };
}
export type CoperachaPublica = ReturnType<typeof vistaPublica>;
