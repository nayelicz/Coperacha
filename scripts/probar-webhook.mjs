// Manda a tu app un webhook firmado igual que pey (Standard Webhooks).
// Uso:
//   node scripts/probar-webhook.mjs <aportacionId> [transactionId] [monto]
// Variables: APP_URL (default http://localhost:3000), PEY_WEBHOOK_SECRET (el mismo de .env.local)
import crypto from "crypto";
import { readFileSync } from "fs";

function leerEnv() {
  try {
    for (const linea of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
leerEnv();

const [aportacionId, transactionId = "tx_prueba_" + Date.now(), monto = "0.01"] = process.argv.slice(2);
if (!aportacionId) {
  console.error("Uso: node scripts/probar-webhook.mjs <aportacionId> [transactionId] [monto]");
  process.exit(1);
}
const url = (process.env.APP_URL || "http://localhost:3000") + "/api/pey/webhook";
const cuerpo = JSON.stringify({
  type: "codi.pn.payment_received",
  transactionId,
  amount: Number(monto),
  apiKeyId: "prueba",
  concept: "Coperacha (prueba)",
  datePaid: Math.floor(Date.now() / 1000),
  numRef: "1234",
  metadata: { externalMetadata: { aportacionId } },
});

const headers = { "Content-Type": "application/json" };
const secreto = process.env.PEY_WEBHOOK_SECRET;
if (secreto) {
  const id = "msg_" + crypto.randomBytes(8).toString("hex");
  const ts = String(Math.floor(Date.now() / 1000));
  const llave = secreto.startsWith("whsec_") ? Buffer.from(secreto.slice(6), "base64") : Buffer.from(secreto, "utf8");
  headers["webhook-id"] = id;
  headers["webhook-timestamp"] = ts;
  headers["webhook-signature"] = "v1," + crypto.createHmac("sha256", llave).update(`${id}.${ts}.${cuerpo}`).digest("base64");
}

const r = await fetch(url, { method: "POST", headers, body: cuerpo });
console.log(r.status, await r.text());
