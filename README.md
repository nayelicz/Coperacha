# Coperacha 🧡💚

**El impulso colectivo de tu barrio, confirmado al instante con CoDi.**

Coperacha es una plataforma web para que los negocios de barrio de la Ciudad de México junten dinero con el apoyo de su comunidad. Un negocio pide lo que necesita (por ejemplo $5,000 a 30 días) y sus vecinos y clientes **le entran** con aportaciones pequeñas que pagan desde la app de su banco con **CoDi®** de Banco de México. Cuando el barrio junta el **80%**, se enciende el **Impulso SEDECO** con el **20%** restante, sin intereses. Al final del plazo, cada persona recibe su dinero más su ganancia: **+4% en efectivo** a su banco o **+8% en saldo** para gastar en el negocio.

Proyecto para el **Hackatón México 2026 · CDMX**, construido sobre la [API pública de pey](https://docs.pey.mx).

> ⚠️ El **Impulso SEDECO / FONDESO** es un modelo que proponemos; no existe un convenio todavía. En esta demo se **simula**.

---

## ¿Cómo funciona? (sin guardar dinero ajeno)

Coperacha **nunca retiene dinero en una cuenta propia**. Todo pasa directo entre cuentas bancarias:

| Momento | Qué pasa | Llamada a pey |
|---|---|---|
| Alguien le entra | Se le manda una solicitud CoDi a su celular (o un QR). Al autorizar, el dinero va **directo a la CLABE del negocio**. | `POST /codi/pn` o `POST /codi/qr` con `bankAccountId` de la CLABE del negocio |
| pey confirma | pey avisa a `POST /api/pey/webhook`. La aportación aparece en vivo con la insignia **“Confirmado al instante con CoDi / Banxico”**. | webhook `codi.pn.payment_received` / `codi.qr.payment_received` |
| Se junta el 80% | Se enciende el Impulso SEDECO (20%) y se cobra la **tarifa Coperacha de 1%** con una solicitud CoDi aparte al celular del negocio. | `POST /codi/pn` (a la cuenta de la plataforma) |
| Toca regresar | Por cada persona, al celular del negocio le llega una solicitud CoDi **con el `bankAccountId` de la CLABE de esa persona**. El negocio autoriza y el dinero va directo de su cuenta a la de cada quien. | `POST /codi/pn` con `bankAccountId` de quien recibe |
| Todo regresado | Se emite el **Certificado de Buen Pagador Verificado con CoDi**, que sube el límite de la próxima coperacha ($5,000 → $10,000 → $20,000). | — |

Para que el dinero llegue directo, cada CLABE debe estar **registrada en pey y en estado `ACTIVE`** (`POST /bank-account`). El registro con Banxico tarda hasta 5 días hábiles; para el hackatón usamos las CLABEs pre-autorizadas del evento. Si una CLABE todavía no está `ACTIVE`, **el regreso no se manda** (nunca se desvía a la cuenta de la plataforma) y queda como “Falta registrar la CLABE”.

### Ganancias y tarifa (ejemplo con $5,000)

- Barrio: $4,000 · SEDECO: $1,000 (0% interés) · Tarifa Coperacha: $50 (1%, solo si se completa).
- Quien puso $1,000 con **+4%** recibe $1,040 en su banco; con **+8%** recibe $1,080 en saldo para gastar en el negocio (código de bono).

---

## Reglas importantes que ya están programadas

- **Idempotencia del webhook:** cada `transactionId` y cada `webhook-id` se guardan; si pey reintenta, el pago **no se cuenta dos veces** (respondemos 200 para que deje de reintentar).
- **Firma:** si configuras `PEY_WEBHOOK_SECRET`, se valida la firma Standard Webhooks (`webhook-id`, `webhook-timestamp`, `webhook-signature`, HMAC-SHA256, ventana de 5 min). Firma inválida → 401.
- **Casos borde:**
  - Si la coperacha ya llegó al 80% o venció, `POST /api/pey/cobrar` **bloquea** el cobro (409).
  - No puedes poner más de lo que falta para la meta.
  - Si un pago llega **tarde** (alguien autorizó una solicitud vieja), la aportación queda como **`devolucion_pendiente`** y se le regresa completa, sin ganancia.
  - Si una aportación rebasa lo que faltaba, solo cuenta lo necesario y el **excedente** se regresa.
  - Pagos que no corresponden a nada se guardan como **huérfanos** para revisión.
  - Escrituras en fila (candado en memoria) para que dos webhooks simultáneos no se pisen.
- **Modo Demo $0.01:** interruptor en la barra superior, **activado por defecto**. La pantalla muestra los montos de la historia ($5,000, $200…), pero a pey se le pide **$0.01** por cada cobro (pey aún no tiene sandbox y las transacciones de $0.01 del evento no se devuelven).
- **Simulación vs pago real:** el botón discreto **“Simular pago CoDi confirmado”** pasa por la misma lógica que el webhook real, pero el pago queda marcado como **“Simulación · no es pago real”** en gris punteado. Los pagos reales llevan la insignia verde de CoDi / Banxico.

---

## Pantallas

| Ruta | Qué es |
|---|---|
| `/` | Inicio: historia destacada **“Negocio Local de Miriam — Compra de insumos (CDMX)”** por $5,000 ($4,000 barrio + $1,000 SEDECO, CLABE de Miriam Nava), negocios del barrio y formulario de 3 pasos **“Armar mi coperacha”**. |
| `/coperacha/[id]` | Pantalla compartida en vivo: barra de dos tramos (naranja barrio / verde SEDECO que se enciende y celebra al 80%), lista en tiempo real (polling cada 3 s) y tarjeta **“Entrarle a esta coperacha”**. |
| `/coperacha/[id]/pagar` | Lo que le toca a cada quien, botón **“Regresar dinero con CoDi”** y **Certificado de Buen Pagador** (descargar como PDF / compartir). |
| `/cuentas` | Registrar CLABEs en pey y ver si ya están `ACTIVE`. |

## Endpoints

| Método y ruta | Para qué |
|---|---|
| `POST /api/pey/cobrar` | Crea la aportación y pide el cobro CoDi (`metodo: "pn"` al celular, o `"qr"`). |
| `POST /api/pey/webhook` | Recibe los avisos de pey. Idempotente, con firma y casos borde. |
| `POST /api/pey/simular` | `{ aportacionId }` o `{ regresoId }`: simula un pago confirmado (para la demo en vivo). |
| `POST /api/pey/regresar` | `{ coperachaId }`: calcula y manda las solicitudes de regreso. |
| `GET/POST /api/pey/cuentas` | Registrar CLABE (`POST /bank-account`), guardar un `bankAccountId` existente o refrescar su estado. |
| `GET/POST /api/coperachas`, `GET/PATCH /api/coperachas/[id]` | Listar, crear y consultar coperachas. |
| `GET/POST /api/config` | Leer o cambiar el Modo Demo. |

---

## Correr el proyecto

Requisitos: Node.js 18.17+ (recomendado 20+).

```bash
npm install
cp .env.example .env.local   # y llena PEY_API_KEY y PEY_WEBHOOK_SECRET
npm run dev                  # http://localhost:3000
```

Sin `PEY_API_KEY` la app funciona completa en **modo simulación**: los cobros se registran y puedes confirmarlos con el botón de simular.

Los datos viven en `data/coperachas.json` (se crea solo, con la historia de Miriam). Para empezar de cero: `npm run reset-data`.

### Variables de entorno (`.env.local`)

| Variable | Qué es |
|---|---|
| `PEY_API_KEY` | API key de pey (portal → Desarrollador). |
| `PEY_BASE_URL` | `https://api.pey.mx` |
| `PEY_WEBHOOK_SECRET` | Secreto de firma que muestra el portal al crear el webhook. |
| `SEDECO_BANK_ACCOUNT_ID` | (Opcional) `bankAccountId` donde SEDECO recibiría su devolución. Vacío = simulado. |
| `PEY_BANK_ACCOUNTS` | (Opcional) JSON `{"CLABE":"bankAccountId"}` de cuentas ya registradas. |

### Pasos con pey

1. Crea tu API key en el portal de pey y ponla en `.env.local`.
2. Registra la CLABE del negocio en `/cuentas` (o pega su `bankAccountId` si ya lo tienes) y espera a que esté `ACTIVE`.
3. Expón tu app con un túnel y registra el webhook en el portal:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   # o: ngrok http 3000
   ```
   URL del webhook: `https://TU-TUNEL/api/pey/webhook`. Copia el secreto a `PEY_WEBHOOK_SECRET` y reinicia.

## Probar los webhooks

**Con un pago real de $0.01:** abre `/coperacha/miriam-insumos`, entra con tu celular, autoriza la solicitud CoDi en tu banco y mira cómo aparece solita en la lista.

**Sin banco (webhook firmado de prueba):**

```bash
# 1) Crea una aportación (o hazlo desde la pantalla)
curl -s -X POST http://localhost:3000/api/pey/cobrar -H 'Content-Type: application/json' \
  -d '{"coperachaId":"miriam-insumos","nombre":"Ana","celular":"5512345678","clabeRetorno":"012180015826225713","monto":200,"ganancia":"efectivo4","metodo":"pn"}'

# 2) Manda un webhook firmado igual que pey (usa PEY_WEBHOOK_SECRET de .env.local)
node scripts/probar-webhook.mjs <aportacionId> tx_001

# 3) Mándalo otra vez: responde "duplicado" y no se cuenta dos veces
node scripts/probar-webhook.mjs <aportacionId> tx_001
```

**Sin nada:** usa el botón **“Simular pago CoDi confirmado”** en la pantalla de la coperacha.

---

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Lucide Icons · `qrcode` · persistencia en archivo JSON.

> El archivo JSON es perfecto para correr local y en la demo. En Vercel (sistema de archivos efímero) los datos no persisten: para producción, cambia `lib/db.ts` por una base de datos (Postgres, SQLite en un volumen, etc.).

## Aviso

Captar dinero del público prometiendo un rendimiento puede requerir autorización bajo la Ley Fintech (instituciones de financiamiento colectivo, CNBV). Este es un prototipo de hackatón; antes de operar con usuarios reales hay que revisar el marco regulatorio.

CoDi® es una marca de Banco de México. pey® es marca de su titular.
