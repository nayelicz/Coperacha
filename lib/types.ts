// Modelo de datos de Coperacha (persistido en /data/coperachas.json)

export type TipoGanancia = "efectivo4" | "tienda8";

export type EstadoCoperacha =
  | "juntando" // la gente está entrándole
  | "completa" // se juntó el 80% del barrio y se desbloqueó el Impulso SEDECO
  | "regresando" // se pidieron los pagos de regreso
  | "pagada" // todos los regresos confirmados → certificado
  | "vencida"; // se acabó el tiempo sin juntar la meta

export type EstadoAportacion =
  | "pendiente" // cobro CoDi enviado, esperando que la persona autorice en su banco
  | "confirmada" // pago confirmado por pey/Banxico (o simulado)
  | "devolucion_pendiente" // llegó tarde o sobró: hay que regresarlo
  | "expirada" // la solicitud de cobro venció sin pagarse
  | "error";

export interface Aportacion {
  id: string;
  nombre: string;
  celular: string;
  clabeRetorno: string;
  monto: number; // monto de la historia (lo que se muestra)
  montoCobrado: number; // lo que de verdad se pidió a pey (0.01 en Modo Demo)
  ganancia: TipoGanancia;
  metodo: "pn" | "qr";
  estado: EstadoAportacion;
  modoDemo: boolean;
  simulado: boolean; // true si se confirmó con el botón "Simular pago"
  numRef: string;
  peyTransactionId?: string;
  codiId?: string;
  codiQrId?: string;
  qrString?: string;
  montoAceptado: number; // lo que cuenta para la meta
  excedente: number; // lo que sobró y hay que regresar
  montoRecibido?: number; // lo que reportó el webhook
  creadaEn: string;
  expiraEn: string;
  confirmadaEn?: string;
  nota?: string;
}

export type TipoRegreso = "aportacion" | "excedente" | "sedeco" | "tarifa";

export interface Regreso {
  id: string;
  tipo: TipoRegreso;
  aportacionId?: string;
  paraQuien: string;
  clabe?: string;
  monto: number; // monto de la historia
  montoCobrado: number; // lo que se pidió a pey
  estado: "por_pedir" | "solicitado" | "pagado" | "simulado" | "bono_emitido" | "requiere_cuenta" | "error";
  simulado: boolean;
  peyTransactionId?: string;
  codiId?: string;
  bonoCodigo?: string;
  nota?: string;
  actualizadoEn: string;
}

export interface Coperacha {
  id: string;
  nombre: string;
  alcaldia: string;
  proposito: string;
  montoMeta: number; // total (100%)
  plazoDias: 15 | 30;
  clabeDestino: string;
  titularDestino: string;
  celularNegocio: string;
  padronSedeco: boolean;
  destacada?: boolean;
  estado: EstadoCoperacha;
  creadaEn: string;
  juntarHasta: string; // después de esta fecha no se aceptan cobros
  completadaEn?: string;
  regresarEl?: string; // completadaEn + plazoDias
  aportaciones: Aportacion[];
  sedeco: { monto: number; desbloqueado: boolean; desbloqueadoEn?: string; simulado: boolean };
  tarifa: {
    monto: number;
    estado: "no_aplica" | "solicitada" | "pagada" | "simulada" | "error";
    peyTransactionId?: string;
    nota?: string;
  };
  regresos: Regreso[];
  certificado?: { folio: string; emitidoEn: string; nivelDesbloqueado: number };
}

export interface CuentaPey {
  clabe: string;
  bankAccountId: string;
  codiStatus: "PENDING" | "PROCESSING" | "ACTIVE" | "ERROR" | string;
  alias: string;
  actualizadaEn: string;
  errorMessage?: string;
}

export interface EventoProcesado {
  clave: string; // transactionId o webhook-id
  aportacionId?: string;
  regresoId?: string;
  coperachaId?: string;
  resultado: string;
  en: string;
}

export interface BaseDeDatos {
  config: { modoDemo: boolean };
  coperachas: Coperacha[];
  cuentas: Record<string, CuentaPey>; // por CLABE
  procesados: EventoProcesado[]; // para idempotencia del webhook
  huerfanos: { en: string; payload: unknown }[]; // pagos que no pudimos ligar a nada
  historial: Record<string, { certificados: number }>; // por CLABE destino
}
