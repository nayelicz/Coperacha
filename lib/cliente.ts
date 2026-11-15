"use client";

// Helpers del lado del navegador para hablar con /api/* (que a su vez habla con pey).
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoperachaPublica } from "./logica";

export type RespuestaCoperacha = {
  coperacha: CoperachaPublica;
  modoDemo: boolean;
  cuentaNegocioActiva: boolean;
  certificados: number;
};

/** fetch JSON que lanza un Error con el mensaje de la API si la respuesta no es 2xx. */
export async function api<T = Record<string, unknown>>(url: string, cuerpo?: unknown, metodo?: "POST" | "PATCH"): Promise<T> {
  const r = await fetch(url, {
    method: metodo || (cuerpo !== undefined ? "POST" : "GET"),
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error || `Error ${r.status}`);
  return d as T;
}

export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : "Algo salió mal.");

/**
 * Carga una coperacha y la mantiene "en vivo" (polling cada 3 s, igual que antes).
 * También recarga cuando se cambia el Modo Demo desde la barra superior.
 */
export function useCoperacha(id: string, cadaMs = 3000) {
  const [datos, setDatos] = useState<RespuestaCoperacha | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [recienEncendido, setRecienEncendido] = useState(false);
  const antes = useRef<boolean | null>(null);
  const vueltas = useRef(0);

  const cargar = useCallback(async () => {
    // Respaldo del webhook: cada ~9 s, si hay solicitudes CoDi esperando, se le pregunta a pey directamente.
    vueltas.current += 1;
    if (vueltas.current % 3 === 0) {
      await fetch("/api/pey/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coperachaId: id }),
      }).catch(() => undefined);
    }
    const r = await fetch(`/api/coperachas/${id}`, { cache: "no-store" }).catch(() => null);
    if (!r) return;
    if (r.status === 404) return setNoExiste(true);
    if (!r.ok) return;
    const d = (await r.json()) as RespuestaCoperacha;
    if (antes.current === false && d.coperacha.sedeco.desbloqueado) {
      setRecienEncendido(true);
      setTimeout(() => setRecienEncendido(false), 6000);
    }
    antes.current = d.coperacha.sedeco.desbloqueado;
    setDatos(d);
  }, [id]);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, cadaMs);
    window.addEventListener("modo-demo", cargar);
    return () => {
      clearInterval(t);
      window.removeEventListener("modo-demo", cargar);
    };
  }, [cargar, cadaMs]);

  return { datos, noExiste, cargar, recienEncendido };
}
