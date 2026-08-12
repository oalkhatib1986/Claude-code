# Build with AI — one-time setup (~10 minutes)

The "Build with AI" box on the Setup page needs a tiny private relay that holds
your AI key so it never appears in the public web page. You create it once;
every phone/tablet then just pastes the relay link.

## 1. Get an Anthropic API key (~3 min)

1. Go to **console.anthropic.com** and sign in / create an account.
2. Add a payment method (Billing). Typical cost is **1–2 US cents per workout built**.
3. Open **API Keys → Create Key**, name it `athl3te-relay`, and copy the key
   (starts with `sk-ant-…`). Keep it somewhere safe — you'll paste it in step 2.

## 2. Create the free relay on Cloudflare (~5 min)

1. Go to **dash.cloudflare.com** and create a free account.
2. In the left menu: **Workers & Pages → Create → Create Worker**.
   Name it `athl3te-ai` and hit **Deploy** (the hello-world is fine for now).
3. Click **Edit code**, delete everything, and paste the entire contents of
   **`ai-relay-worker.js`** from this project. Hit **Deploy**.
4. Go to the worker's **Settings → Variables and Secrets → Add**:
   - Type: **Secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-…` key from step 1.
   Save (and deploy if prompted).
5. Copy the worker's URL from its overview page — it looks like
   `https://athl3te-ai.<your-account>.workers.dev`.

## 3. Connect the app (~1 min)

1. Open the leaderboard app → **Workout → Setup → Build with AI**.
2. Paste the worker URL into the relay-link box and hit **Save**
   (once per device; it's remembered).
3. Describe a workout and hit **Build it**. Review what it set up below,
   then save the workout a name in the Workout card as usual.

## 4. Shared workout library (~3 min, optional but recommended)

With this on, a workout saved on ANY device appears on EVERY device that has
the relay link — and a board deleted anywhere stays deleted everywhere.

1. In Cloudflare's left menu: **Storage & Databases → KV** →
   **Create a namespace**. Name it `athl3te-lib` and create it.
2. Go to your worker (**athl3te-ai**) → **Settings** → **Bindings**
   (or "Variables and Secrets" → Bindings) → **Add** → **KV Namespace**:
   - Variable name: `LIB` (exactly)
   - KV namespace: `athl3te-lib`
   Save (and deploy if prompted).
3. Make sure the worker is running the latest `ai-relay-worker.js` from this
   project (Edit code → paste → Deploy) — the library endpoints ship in it.
4. Paste the same relay link into **Build with AI** once on each device
   (phones, the trainer's laptop, tablets). The library syncs automatically:
   on load, every 5 minutes, and the moment a board is saved or deleted.

## 5. Live session sync (~3 min) — the TV follows the trainer's phone

With this on, whatever device the trainer acts on becomes the remote control:
pick a board, start, pause or reset on the phone and the Samsung TV, the erg
tablets and every other screen follow within a few seconds — all showing the
SAME clock.

1. Cloudflare left menu: **Storage & Databases → D1 SQL Database** →
   **Create database**. Name it `athl3te-sess` and create it.
2. Your worker (**athl3te-ai**) → **Bindings** → **Add** → **D1 database**:
   - Variable name: `DB` (exactly)
   - Database: `athl3te-sess`
   Save/deploy.
3. Make sure the worker runs the latest `ai-relay-worker.js` (Edit code →
   paste → Deploy).
4. Every device that should follow needs the relay link (same one as always).
   On a TV, skip the typing: open
   `https://oalkhatib1986.github.io/Claude-code/app.html?relay=YOUR-WORKER-URL#screen`
   once — the link is remembered from the URL.

## Notes

- The key lives only inside Cloudflare — never in the web page or the repo.
- To revoke access at any time, delete the key in the Anthropic console.
- The relay only accepts the workout-builder call shape and caps message
  sizes, so even if someone finds the URL they can only spend pennies on
  workout JSON — and you can rotate the key or add an allowed-origin check
  in the worker if you ever want to lock it down harder.
