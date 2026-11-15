import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import type { BaseDeDatos, Coperacha } from "./types";

// En Vercel sin Redis solo /tmp es escribible (por instancia, no persiste): sirve para que no truene, no para la demo.
const ARCHIVO = process.env.VERCEL ? "/tmp/coperachas.json" : path.join(process.cwd(), "data", "coperachas.json");
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

// ---------- Almacenamiento ----------
// Local: archivo data/coperachas.json.
// Vercel (sistema de archivos efímero y varias instancias): Redis de Upstash (Vercel Marketplace),
// con un candado distribuido para que dos webhooks simultáneos no se pisen.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LLAVE = process.env.COPERACHA_DB_KEY || "coperacha:db";
const LLAVE_CANDADO = LLAVE + ":candado";

let redis: Redis | null = null;
function cliente(): Redis | null {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  return (redis ||= new Redis({ url: REDIS_URL, token: REDIS_TOKEN }));
}

export function almacenamiento(): "redis" | "archivo" {
  return cliente() ? "redis" : "archivo";
}

async function leer(): Promise<BaseDeDatos> {
  const r = cliente();
  if (r) {
    const db = await r.get<BaseDeDatos>(LLAVE);
    if (db) return db;
    const nueva = baseInicial();
    await r.set(LLAVE, nueva, { nx: true });
    return (await r.get<BaseDeDatos>(LLAVE)) || nueva;
  }
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
  const r = cliente();
  if (r) {
    await r.set(LLAVE, db);
    return;
  }
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  const tmp = ARCHIVO + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, ARCHIVO);
}

/** Candado distribuido en Redis (SET NX PX + liberación solo si es nuestro). */
async function conCandado<T>(fn: () => Promise<T>): Promise<T> {
  const r = cliente()!;
  const token = crypto.randomBytes(8).toString("hex");
  const limite = Date.now() + 15_000;
  while (!(await r.set(LLAVE_CANDADO, token, { nx: true, px: 10_000 }))) {
    if (Date.now() > limite) throw new Error("La base está ocupada, intenta de nuevo.");
    await new Promise((ok) => setTimeout(ok, 60 + Math.random() * 90));
  }
  try {
    return await fn();
  } finally {
    await r
      .eval('if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end', [LLAVE_CANDADO], [token])
      .catch(() => undefined);
  }
}

// Candado en memoria: dentro de una misma instancia, todas las escrituras pasan en fila.
let fila: Promise<unknown> = Promise.resolve();

export function conBase<T>(fn: (db: BaseDeDatos) => Promise<T> | T): Promise<T> {
  const trabajo = async () => {
    const db = await leer();
    const r = await fn(db);
    await escribir(db);
    return r;
  };
  const tarea = fila.then(() => (cliente() ? conCandado(trabajo) : trabajo()));
  fila = tarea.catch(() => undefined);
  return tarea;
}

export async function soloLeer(): Promise<BaseDeDatos> {
  await fila.catch(() => undefined);
  return leer();
}

/** Reinicia la base a la historia de Trini (para repetir la demo). */
export async function reiniciar(): Promise<void> {
  const nueva = baseInicial();
  if (cliente()) await conCandado(() => escribir(nueva));
  else await escribir(nueva);
}
