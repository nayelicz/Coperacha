// Cliente mínimo de la API de pey (https://docs.pey.mx).
// Endpoints usados:
//   POST /codi/pn          → solicitud de cobro CoDi al celular (push notification)
//   POST /codi/qr          → QR de CoDi para escanear
//   POST /bank-account     → registrar una CLABE para recibir CoDi directo (bankAccountId)
//   GET  /bank-account/:id → ver si la CLABE ya está ACTIVE
//   GET  /transaction/:id  → consultar estado (PENDING / PAID)
import crypto from "crypto";

export const PEY_BASE_URL = (process.env.PEY_BASE_URL || "https://api.pey.mx").replace(/\/$/, "");

export function peyConfigurado(): boolean {
  return Boolean(process.env.PEY_API_KEY);
}

export class PeyError extends Error {
  constructor(public status: number, public tipo: string, mensaje: string, public requestId?: string) {
    super(mensaje);
  }
}

async function llamar<T>(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown): Promise<T> {
  const key = process.env.PEY_API_KEY;
  if (!key) throw new PeyError(0, "SIN_API_KEY", "Falta PEY_API_KEY en .env.local");
  const res = await fetch(PEY_BASE_URL + ruta, {
    method: metodo,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    cache: "no-store",
  });
  const texto = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = texto ? JSON.parse(texto) : {};
  } catch {
    json = { message: texto };
  }
  if (!res.ok) {
    const err = (json.error as Record<string, string>) || (json as Record<string, string>);
    throw new PeyError(res.status, err.type || "ERROR", err.message || `pey respondió ${res.status}`, err.requestId);
  }
  return json as T;
}

/** Monto que se manda a pey: en Modo Demo siempre $0.01. */
export function montoParaPey(montoHistoria: number, modoDemo: boolean): number {
  return modoDemo ? 0.01 : Math.round(montoHistoria * 100) / 100;
}

/** numRef: de 1 a 7 dígitos. */
export function nuevoNumRef(): string {
  return String(crypto.randomInt(1, 9_999_999));
}

type Metadata = Record<string, string | number | boolean>;

export function crearPushNotification(p: {
  amount: number;
  phoneNumber: string;
  concept: string;
  numRef: string;
  expiration?: number; // segundos, mínimo 360
  bankAccountId?: string;
  metadata?: Metadata;
}) {
  return llamar<{ transactionId: string; codiId: string }>("POST", "/codi/pn", {
    expiration: 360,
    ...p,
  });
}

export function crearQr(p: {
  amount: number;
  concept: string;
  numRef: string;
  expiration?: number; // 0 = sin vencimiento; si se pone, mínimo 360
  bankAccountId?: string;
  metadata?: Metadata;
}) {
  return llamar<{ id: string; qrString: string; qrImage?: string | null }>("POST", "/codi/qr", {
    expiration: 600,
    generateImage: false,
    ...p,
  });
}

export function registrarCuenta(p: { alias: string; name: string; clabe: string; entity: "BUSINESS" | "PERSON" }) {
  return llamar<{ id: string; codiStatus: string }>("POST", "/bank-account", p);
}

export function consultarCuenta(id: string) {
  return llamar<{ id: string; codiStatus: string; errorMessage?: string; clabe: string; alias: string }>(
    "GET",
    `/bank-account/${encodeURIComponent(id)}`,
  );
}

export function consultarTransaccion(id: string) {
  return llamar<{ id?: string; status: "PENDING" | "PAID" | string }>("GET", `/transaction/${encodeURIComponent(id)}`);
}

// ---------- Firma del webhook (Standard Webhooks) ----------
// pey firma cada entrega con Standard Webhooks (https://www.standardwebhooks.com):
//   headers: webhook-id, webhook-timestamp, webhook-signature ("v1,<base64>" separados por espacio)
//   firma = base64(HMAC-SHA256(secreto, `${id}.${timestamp}.${cuerpo}`))
//   el secreto puede venir con prefijo "whsec_" (base64).
export function verificarFirma(cuerpo: string, headers: Headers, secreto: string): { ok: boolean; motivo?: string } {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const firmas = headers.get("webhook-signature");
  if (!id || !ts || !firmas) return { ok: false, motivo: "Faltan headers webhook-id / webhook-timestamp / webhook-signature" };

  const segundos = Number(ts);
  if (!Number.isFinite(segundos) || Math.abs(Date.now() / 1000 - segundos) > 5 * 60) {
    return { ok: false, motivo: "Timestamp fuera de la ventana de 5 minutos" };
  }

  const llave = secreto.startsWith("whsec_") ? Buffer.from(secreto.slice(6), "base64") : Buffer.from(secreto, "utf8");
  const esperada = crypto.createHmac("sha256", llave).update(`${id}.${ts}.${cuerpo}`).digest("base64");
  const esperadaBuf = Buffer.from(esperada);

  for (const parte of firmas.split(" ")) {
    const [version, firma] = parte.split(",");
    if (version !== "v1" || !firma) continue;
    const buf = Buffer.from(firma);
    if (buf.length === esperadaBuf.length && crypto.timingSafeEqual(buf, esperadaBuf)) return { ok: true };
  }
  return { ok: false, motivo: "Firma inválida" };
}

/** Para pruebas locales: genera headers firmados igual que pey. */
export function firmarParaPrueba(cuerpo: string, secreto: string) {
  const id = "msg_" + crypto.randomBytes(8).toString("hex");
  const ts = String(Math.floor(Date.now() / 1000));
  const llave = secreto.startsWith("whsec_") ? Buffer.from(secreto.slice(6), "base64") : Buffer.from(secreto, "utf8");
  const firma = crypto.createHmac("sha256", llave).update(`${id}.${ts}.${cuerpo}`).digest("base64");
  return { "webhook-id": id, "webhook-timestamp": ts, "webhook-signature": `v1,${firma}` };
}
