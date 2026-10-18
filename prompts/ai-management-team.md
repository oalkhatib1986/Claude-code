In the athl3te-app repo, build a new feature: an **AI management team** — AI agents that each play a management role, read the app's data for their area every day, and email a short report. Read CLAUDE.md and DESIGN.md first and follow them (Karpathy rules, hard rules, brand rules). Work on a new branch `claude/ai-team`; do not touch master until I approve.

## What it is

Four agents, each with one job:

1. **CFO** — reads the Financial Cockpit (P&L, break-even, tiles), Café, Purchases and Petty Cash. Reports how the month is going against last month over the same days, the break-even (earned so far vs still to earn), margins by business line, costs that are out of line or still estimates, and what to do about it.
2. **Operations & Purchasing Manager** — reads Inventory, Purchases, Café stock and Privilee. Reports stock running low or past its date, orders that look due, supplier prices that moved, unpaid invoices, and day-to-day issues the data shows.
3. **Chief Training Officer** — reads PT and the erg workouts/leaderboard data (`erg/`). Reports client attendance and progress, clients who have gone quiet, PT packages running out, class numbers, and writes a **daily brief for the trainers**.
4. **CEO** — runs last. Reads the other three reports (not the raw data) and writes my daily brief: the three things that matter most today, anything that needs my decision, and one line per department with a link to its full report.

They **advise only**. Nothing they do may change any data in the app.

## How it works

- **Back end:** there is none yet (the app is static hosting + Firestore). Add Firebase Cloud Functions (Node 20, TypeScript or plain JS — match what fits the repo) in a new `functions/` folder, using the Admin SDK to read Firestore server-side. This needs the project `athlete-fitness-dxb` on the Blaze (pay-as-you-go) plan: tell me exactly how to switch it, and stop until I confirm.
- **The numbers must match the app exactly.** Do not re-implement any money or stock maths. Import and reuse the app's own pure modules (e.g. `src/modules/finance/fin-calc.js` — `buildPnl`, `proRate`, `breakEven`; `src/modules/finance/finance.js` — `pnlFor`; `purch-calc.js`, `inv-calc.js`; the café's figures exactly as the Financial Cockpit reads them in `fin-sources.js`). Where a module reads Firestore through the browser store, add a small server-side data adapter that gives those functions the same records. Never touch `cafe-finance.js` maths. Add a test that the CFO's input figures equal what the Financial Cockpit shows for the same month and days.
- **What each agent sees:** build a compact, pre-computed JSON summary per agent (figures, comparisons, lists of exceptions) and give the agent only that — not raw database dumps. Each agent's instructions must say: use only the numbers given, never invent or estimate a figure, say plainly when data is missing (e.g. "no Glofox sales imported for September"), keep it short, lead with what needs action.
- **Period:** each report covers yesterday plus the month to date, compared like-for-like with last month over the same days (the same rule the Financial Cockpit uses). Dubai time throughout (Asia/Dubai).
- **The AI:** Anthropic Claude API. Use `claude-sonnet-5-5` for the three department agents and `claude-opus-5-5` for the CEO. Check the current Anthropic model list and pricing first and tell me the expected monthly cost before going further.
- **Email:** send with Resend (resend.com). Branded HTML email: dark background, ATHL3TE wordmark, lime #c1ff72 used only as an accent (never for money — DESIGN.md rule), Geist with system fallbacks, readable on a phone, a plain-text version too, and a button linking to the full report in the app. From address on the gym's domain once verified; until then Resend's test sender, to me only.
- **Secrets:** `ANTHROPIC_API_KEY` and `RESEND_API_KEY` stored with `firebase functions:secrets:set` — never in git, never in the browser code. Walk me through getting each key and stop until I've set them.
- **Schedule — everyone chooses their own time:**
  - One scheduled function generates all four reports once a day, early morning Dubai (default 04:00, changeable in settings), and saves them in Firestore.
  - A second scheduled function runs every 15 minutes and sends each recipient their report at the time they chose (15-minute steps). Each person gets one email per day, never duplicates (record what was sent).
  - If generation fails, retry once; if it still fails, email me a short "today's reports failed: <reason>" note instead of nothing.

## Who gets what

- **Me (owner):** the CEO brief, with links to all department reports.
- **Trainers:** only the Chief Training Officer's trainers' brief. It contains client data, so it goes only to active staff with the trainer role, and only about their own clients and classes where the data allows.
- Recipients, their email, which report they get, their delivery time, and on/off are set in the app (below). Find where staff and users and their emails are stored (auth / staff list / PT trainers) and use that — do not create a second people list.

## In the app: a new "AI Team" module

Add it to the launcher like the other modules (owner only; follow how modules are registered, gated and styled — Financial Cockpit is the model). Same header, tabs, type and colours as the Financial Cockpit (DESIGN.md).

- **Today** — the CEO brief, then the three department reports, each in its own card.
- **History** — past days' reports, newest first, by date.
- **Team** — each agent: name, role, what it reads, last run, on/off.
- **Settings** — recipients (from the existing people), each with their report, delivery time and on/off; generation time; a **Run now** button that builds today's reports without sending; **Send me a test** that emails me only; pause everything.
- Firestore: new collections only (e.g. `ai_reports`, `ai_settings`, `ai_deliveries`), with rules in `firestore.rules`: owner reads and edits; nothing else can read them; only the functions write reports.

## Build and check in this order

1. Read the codebase and tell me your plan: where each agent's data comes from (collections and functions), what you will reuse, the files you will add or change. Stop for my OK.
2. Build the data summaries and their tests first, with no AI and no email. Show me each agent's summary for the current month — numbers must match the cockpit.
3. Add the agents and **Run now**; show me the four reports it writes. No emails yet.
4. Add Resend and **Send me a test** (to me only). Show me the email.
5. Add the schedules and delivery times. Run a full day as a dry run (log who would get what, at what time) before turning real sending on.
6. Before handing over: `node tools/audit.mjs` (expect HIGH 2 · MED 12 · LOW 1 — no new findings) and `node tools/stress.mjs` (0 failed), plus the new tests. Then deploy hosting, functions and rules, and send me the first real CEO brief.

Rules: change existing modules only where needed to register the new module or to reuse their logic — no restyling or "improvements" elsewhere. Ask me whenever something is unclear rather than guessing. At the end, report: the branch, what was added, the audit and stress lines, the monthly cost estimate, and the deploy URL.
