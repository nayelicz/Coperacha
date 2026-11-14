import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { BaseDeDatos, Coperacha } from "./types";

const ARCHIVO = path.join(process.cwd(), "data", "coperachas.json");
const DIA = 24 * 60 * 60 * 1000;

export function nuevoId(prefijo = ""): string {
  return prefijo + crypto.randomBytes(6).toString("hex");
}

export function historiaDestacada(ahora = new Date()): Coperacha {
  const monto = 5000;
  return {
    id: "trini-insumos",
    nombre: "Trini",
    alcaldia: "Cuauhtémoc · Mercado Juárez, CDMX",
    proposito: "Compra de insumos para la temporada",
    montoMeta: monto,
    plazoDias: 30,
    clabeDestino: "012180015355682429",
    titularDestino: "Miriam Nava",
    celularNegocio: "",
    padronSedeco: true,
    destacada: true,
    estado: "juntando",
    creadaEn: ahora.toISOString(),
    juntarHasta: new Date(ahora.getTime() + 7 * DIA).toISOString(),
    aportaciones: [],
    sedeco: { monto: monto * 0.2, desbloqueado: false, simulado: true },
    tarifa: { monto: monto * 0.01, estado: "no_aplica" },
    regresos: [],
  };
}

function baseInicial(): BaseDeDatos {
  let cuentas: BaseDeDatos["cuentas"] = {};
  try {
    const mapa = JSON.parse(process.env.PEY_BANK_ACCOUNTS || "{}") as Record<string, string>;
    for (const [clabe, id] of Object.entries(mapa)) {
      cuentas[clabe] = { clabe, bankAccountId: id, codiStatus: "ACTIVE", alias: clabe, actualizadaEn: new Date().toISOString() };
    }
  } catch {
    cuentas = {};
  }
  return {
    config: { modoDemo: true },
    coperachas: [historiaDestacada()],
    cuentas,
    procesados: [],
    huerfanos: [],
    historial: {},
  };
}

async function leer(): Promise<BaseDeDatos> {
  try {
    const txt = await fs.readFile(ARCHIVO, "utf8");
    return JSON.parse(txt) as BaseDeDatos;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = baseInicial();
    await escribir(db);
    return db;
  }
}

async function escribir(db: BaseDeDatos) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  const tmp = ARCHIVO + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, ARCHIVO);
}

// Candado en memoria: todas las escrituras pasan en fila, una por una.
// Así dos webhooks simultáneos no pueden contar el mismo pago dos veces.
let fila: Promise<unknown> = Promise.resolve();

export function conBase<T>(fn: (db: BaseDeDatos) => Promise<T> | T): Promise<T> {
  const tarea = fila.then(async () => {
    const db = await leer();
    const r = await fn(db);
    await escribir(db);
    return r;
  });
  fila = tarea.catch(() => undefined);
  return tarea;
}

export async function soloLeer(): Promise<BaseDeDatos> {
  await fila.catch(() => undefined);
  return leer();
}
