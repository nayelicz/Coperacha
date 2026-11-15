"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Landmark, Loader2, Plus, RefreshCw, RotateCcw, ShieldCheck, X } from "lucide-react";
import SelectorCuenta from "@/components/SelectorCuenta";
import { fondoTarjeta } from "@/components/TarjetaCoperacha";
import { Aviso, BotonIcono, Hoja } from "@/components/ui";
import { CLABES_EVENTO } from "@/lib/clabes";
import { api, mensajeDe } from "@/lib/cliente";

type Cuenta = { clabe: string; bankAccountId: string; codiStatus: string; alias: string; errorMessage?: string };

const ESTADO: Record<string, string> = {
  ACTIVE: "Activa para CoDi",
  PENDING: "En revisión con Banxico",
  PROCESSING: "En revisión con Banxico",
  ERROR: "Con error",
};

export default function Cuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [pey, setPey] = useState(false);
  const [f, setF] = useState({ clabe: CLABES_EVENTO[3].clabe as string, otra: "", name: CLABES_EVENTO[3].nombre as string, entity: "PERSON", bankAccountId: "" });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);

  const clabe = f.clabe === "otra" ? f.otra : f.clabe;

  const cargar = () =>
    api<{ cuentas: Cuenta[]; peyConfigurado: boolean }>("/api/pey/cuentas")
      .then((d) => {
        setCuentas(d.cuentas);
        setPey(d.peyConfigurado);
      })
      .catch(() => undefined);
  useEffect(() => {
    cargar();
  }, []);

  async function enviar(cuerpo: Record<string, unknown>, cual: string) {
    setCargando(cual);
    setMsg(null);
    try {
      const d = await api<{ codiStatus: string; bankAccountId?: string }>("/api/pey/cuentas", cuerpo);
      setMsg({ ok: true, texto: `Listo: estado ${d.codiStatus}${d.bankAccountId ? ` · bankAccountId ${d.bankAccountId}` : ""}` });
    } catch (e) {
      setMsg({ ok: false, texto: mensajeDe(e) });
    }
    setCargando(null);
    cargar();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <section className="flex items-start justify-between gap-4 pt-4">
        <div>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">Cuentas</h1>
          <p className="mt-1 text-[15px] text-humo">CLABEs registradas en pey para recibir CoDi directo.</p>
        </div>
        <a href="#registrar" className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-papel px-4 text-[14px] font-semibold text-carbon">
          <Plus className="h-4 w-4" /> Registrar
        </a>
      </section>

      <PanelPey />

      {/* Tarjetas digitales */}
      {cuentas.length === 0 ? (
        <div className="grid min-h-[180px] place-items-center rounded-[26px] border-2 border-dashed border-white/10 p-6 text-center text-humo">
          <div>
            <Landmark className="mx-auto h-8 w-8" />
            <p className="mt-2">Ninguna cuenta registrada todavía.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {cuentas.map((c, i) => {
            const activa = c.codiStatus === "ACTIVE";
            return (
              <div key={c.clabe} className={`relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-[26px] p-5 text-carbon ${activa ? fondoTarjeta(i) : "bg-[#D9D2CA]"}`}>
                <span className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-white/20" aria-hidden />
                <div className="relative flex items-start justify-between">
                  <p className="text-[14px] font-semibold opacity-70">Cuenta CoDi</p>
                  <p className="cifras text-[15px] font-semibold opacity-80">•••• {c.clabe.slice(-4)}</p>
                </div>
                <div className="relative">
                  <p className="text-xl font-bold">{c.alias}</p>
                  <p className="cifras truncate text-[12px] opacity-60">{c.bankAccountId}</p>
                  {c.errorMessage && <p className="mt-1 text-[13px] font-semibold text-red-800">{c.errorMessage}</p>}
                </div>
                <div className="relative flex items-center justify-between">
                  <span className={`chip ${activa ? "bg-carbon text-white" : "bg-carbon/10"}`}>
                    {activa && <ShieldCheck className="h-3.5 w-3.5" />} {ESTADO[c.codiStatus] || c.codiStatus}
                  </span>
                  {pey && (
                    <BotonIcono titulo="Consultar estado en pey" onClick={() => enviar({ clabe: c.clabe, refrescar: true }, c.clabe)}>
                      <RefreshCw className={`h-4 w-4 ${cargando === c.clabe ? "animate-spin" : ""}`} />
                    </BotonIcono>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[14px] leading-relaxed text-humo">
        Para que el dinero llegue <b className="text-white">directo</b> a cada CLABE (sin pasar por Coperacha), la CLABE debe estar registrada en pey y en estado{" "}
        <b className="text-white">ACTIVE</b>. El registro en Banxico tarda hasta 5 días hábiles.
      </p>

      {/* Registrar */}
      <Hoja id="registrar" className="scroll-mt-20">
        <h2 className="text-xl font-bold">Registrar una CLABE</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="etiqueta">CLABE</p>
            <SelectorCuenta
              valor={f.clabe}
              onCambio={(v, nombre) => setF((x) => ({ ...x, clabe: v, name: nombre || x.name }))}
              otra={f.otra}
              onOtra={(v) => setF((x) => ({ ...x, otra: v }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="etiqueta" htmlFor="titular">Titular</label>
              <input id="titular" className="campo" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div>
              <p className="etiqueta">Tipo</p>
              <div className="grid grid-cols-2 gap-1 rounded-full bg-carbon/[0.06] p-1">
                {[["PERSON", "Persona"], ["BUSINESS", "Negocio"]].map(([v, t]) => (
                  <button key={v} type="button" onClick={() => setF({ ...f, entity: v })}
                    className={`rounded-full py-2.5 text-[15px] font-semibold transition ${f.entity === v ? "bg-white shadow-sm" : "text-ceniza"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="boton-carbon w-full" disabled={Boolean(cargando) || !pey || clabe.length !== 18}
            onClick={() => enviar({ clabe, name: f.name, alias: f.name, entity: f.entity }, "registrar")}>
            {cargando === "registrar" && <Loader2 className="h-5 w-5 animate-spin" />} Registrar en pey
          </button>

          <div className="border-t border-carbon/10 pt-4">
            <label className="etiqueta" htmlFor="baid">¿Ya tienes el bankAccountId (ULID) de esta CLABE?</label>
            <div className="flex gap-2">
              <input id="baid" className="campo cifras" placeholder="01J…" value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })} />
              <button className="boton-suave shrink-0" disabled={Boolean(cargando) || !f.bankAccountId || clabe.length !== 18}
                onClick={() => enviar({ clabe, bankAccountId: f.bankAccountId, alias: f.name }, "guardar")}>
                {cargando === "guardar" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar"}
              </button>
            </div>
          </div>
          {msg && <Aviso tipo={msg.ok ? "info" : "error"}>{msg.texto}</Aviso>}
        </div>
      </Hoja>
    </div>
  );
}

type Config = {
  modoDemo: boolean;
  peyConfigurado: boolean;
  firmaWebhook: boolean;
  webhookUrl: string;
  almacenamiento: "redis" | "archivo";
  sedecoConfigurado: boolean;
  cuentasActivas: number;
  ultimoWebhook: string | null;
  huerfanos: number;
};

/** Estado de la conexión con pey: lo que hay que tener listo para la demo con dinero real. */
function PanelPey() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  useEffect(() => {
    api<Config>("/api/config").then(setCfg).catch(() => undefined);
  }, []);
  if (!cfg) return null;

  const items: { ok: boolean; texto: string; ayuda: string }[] = [
    { ok: cfg.peyConfigurado, texto: "API key de pey", ayuda: "PEY_API_KEY en las variables de entorno" },
    { ok: cfg.firmaWebhook, texto: "Firma del webhook", ayuda: "PEY_WEBHOOK_SECRET (whsec_…) del portal de pey" },
    { ok: Boolean(cfg.ultimoWebhook), texto: "Webhook recibido", ayuda: cfg.ultimoWebhook ? new Date(cfg.ultimoWebhook).toLocaleString("es-MX") : "Registra la URL de abajo en el portal" },
    { ok: cfg.cuentasActivas > 0, texto: "CLABE del negocio ACTIVE", ayuda: `${cfg.cuentasActivas} cuenta(s) activas` },
    { ok: cfg.almacenamiento === "redis", texto: "Base persistente", ayuda: cfg.almacenamiento === "redis" ? "Redis (Upstash)" : "Archivo local: en Vercel no persiste" },
  ];

  return (
    <section className="panel space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conexión con pey</h2>
        <span className={`chip ${cfg.modoDemo ? "bg-barrio/15 text-barrio" : "bg-impulso/15 text-impulso"}`}>{cfg.modoDemo ? "Modo Demo $0.01" : "Montos reales"}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.texto} className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${i.ok ? "bg-impulso text-carbon" : "bg-white/10 text-humo"}`}>
              {i.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            </span>
            <span className="text-[15px]">
              {i.texto}
              <span className="block text-[13px] text-humo">{i.ayuda}</span>
            </span>
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-1.5 text-[13px] text-humo">URL del webhook (portal.mipey.mx → Desarrollador)</p>
        <button type="button" onClick={async () => { await navigator.clipboard.writeText(cfg.webhookUrl); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}
          className="flex w-full items-center gap-2 rounded-2xl bg-capa2 px-4 py-3 text-left text-[14px] transition hover:bg-[#2a2a2e]">
          <span className="cifras min-w-0 flex-1 truncate">{cfg.webhookUrl}</span>
          {copiado ? <Check className="h-4 w-4 text-impulso" /> : <Copy className="h-4 w-4 text-humo" />}
        </button>
      </div>
      {cfg.huerfanos > 0 && <p className="text-[13px] text-sol">{cfg.huerfanos} pago(s) recibidos que no corresponden a ninguna aportación (quedaron guardados para revisión).</p>}
      {cfg.modoDemo && (
        <button type="button" disabled={reiniciando} className="boton-oscuro w-full text-[15px]"
          onClick={async () => {
            if (!confirm("¿Reiniciar la demo? Se borran todas las aportaciones y coperachas, y vuelve la historia de Trini.")) return;
            setReiniciando(true);
            await api("/api/demo/reiniciar", {}).catch(() => undefined);
            window.location.href = "/";
          }}>
          {reiniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reiniciar demo
        </button>
      )}
    </section>
  );
}
