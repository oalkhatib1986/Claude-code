In the athl3te-app repo, build a new feature: an **AI management team** — seven AI agents, each holding one management position, reading the app's data for its area and reporting up a chain of command to me. The org chart I agreed is here: https://claude.ai/artifact/8W84NmuHW3ZegPTeVgxvP7 (open it; this prompt matches it). Mockups of Ask, the expanded chat with an action card, the Boardroom and reception booking on a phone: https://claude.ai/artifact/DenTiaAgKAPVjaE58xAVXS (sample numbers; follow DESIGN.md over the mockups where they differ). Read CLAUDE.md and DESIGN.md first and follow them (Karpathy rules, hard rules, brand rules). Work on a new branch `claude/ai-team`; do not touch master until I approve. Build in the three phases at the end and stop for my OK between them.

## The team and the chain of command

- **I talk only to the CEO.** Every report and every answer reaches me through the CEO.
- The six heads report to the CEO. When I ask a question, the CEO decides which heads know, asks them, and replies to me with one answer that says where each part came from (e.g. "CFO: café margin fell 6 points. COO: oat milk up 18%, wastage doubled").
- **For now, I am the only person with access.** Everything goes to me only. Later I will give access to trainers and partner trainers myself, one person at a time, in Settings — build that, but with nobody else switched on.
- When I do: **trainers talk only to the Chief Training Officer**, about their own clients and classes. They never see finance or other private data.

| Code | Position | Reads (only these) | Responsible for | Delivers |
|---|---|---|---|---|
| CEO | Chief Executive Officer | The heads' reports and answers — not raw data | My one point of contact. Daily brief: the three things that matter most today, decisions needed, one line per department with a link. Answers my questions by asking the right heads. Weekly review and month-end pack. Chases open tasks across the team. | Daily brief, weekly review, month-end pack, answers — to me |
| CFO | Chief Financial Officer | Financial Cockpit, Café sales, Purchases, Petty Cash | Month to date vs last month over the same days and vs my targets; break-even (earned so far, still to earn, the day we pass it); margins by business line; costs out of line or still estimates; month-end forecast and cash needed for payroll and bills; alerts for sales well below a normal day, refund/void spikes, a till or petty cash that doesn't balance; month-end pack and questions for the accountant. Privilee's revenue is part of what it reads through the cockpit. | Daily finance report, weekly review, month-end pack — to the CEO |
| COO | Operations & Purchasing Director | Inventory, Purchases, Café stock | Stock running low, out or past its date; what to order this week and from whom; supplier prices that moved; unpaid or overdue invoices; café wastage and stock counts; alerts for an item running out before a rush or a delivery not received; tasks for reception (sent to me until I give reception access), followed up next day. | Daily operations report — to the CEO; tasks — to me for now, later to reception |
| CTrO | Chief Training Officer | PT, erg workouts and leaderboard (`erg/`), classes | Client attendance and progress, personal bests; clients gone quiet; PT packages running out; class numbers, which sessions fill or don't; each trainer's clients, sessions and retention. | Up: daily training report to the CEO. Down (only once I switch a trainer on): a morning brief to that trainer (who's coming, who to call, what to push), and answers to their questions |
| CMO | Chief Membership & Marketing Officer | Glofox sales, memberships, class packs, Privilee and ClassPass | Memberships and packs about to expire; members at risk of leaving from falling attendance; Privilee and ClassPass visits and trends and how many visitors could become members; intro offers that convert; campaign ideas and draft messages for my approval. Never sends anything to a member itself. | Daily membership report, weekly campaign ideas — to the CEO |
| CDO | Chief Data Officer | Every module, the data imports, my targets | Missing or late data — Glofox not imported, invoices not entered, classes not logged, stock counts overdue, accountant's figures not loaded — tells me who is responsible (later, once they have access, tells them directly) and keeps chasing; trends across modules the others would miss; digs into numbers when the CEO needs an answer that spans several areas. | Daily data check — to the CEO; nudges — to me for now, later to whoever owes the data |
| CTO | Chief Technology & Security Officer | App error log, failed saves, logins, access changes, backups, usage, feedback | The app itself — working, safe, fast, and getting better: errors, failed saves, slow screens and sync problems on every till and tablet; which features are used and which aren't; feedback from me and the team. **Security:** unusual logins (bursts of failed passwords, odd hours, a new device on the owner account), changes to who can access what, leavers still switched on, tills left signed in; confirms last night's backup worked; a monthly review of who can see what. Recommends fixes and improvements as **ready-to-paste prompts for PowerShell Claude**; never edits the app and never changes anyone's access itself. A week after a change I approve, checks whether it worked. | Daily app health, security alerts straight away, weekly improvement proposals, monthly access review — to the CEO |

## Abilities — each one switchable per agent in the app

These are things the agents do, not separate tools. In the app I switch each on or off **per agent**, and can pause the whole team with one switch. Defaults as in the org chart's table.

- **Daily report** — at the time each recipient chooses.
- **Instant alerts** — straight away when something can't wait (each head watches its own area through the day; minor things wait for the daily report). Alerts go to me through the CEO (later also to the person who must act, once they have access).
- **Targets** — I set goals per agent (monthly revenue, gross-margin floor, overheads ceiling, PT sessions per trainer, café wastage…); reports say on track / behind by X / what's needed per day.
- **Tasks & follow-up** — a recommendation becomes a task with an owner; I approve it; the next day the agent checks the data to see whether it happened and chases it if not.
- **Answers questions** — I ask the CEO (in the app or on WhatsApp); trainers ask the CTrO, once I give them access. The other heads answer only through the CEO.
- **Weekly review** (Monday, one page) and **month-end pack** (results vs target, what changed and why, next month's forecast, decisions needed).
- **Forecasts** — month end, break-even day, cash, orders.
- **Draft messages** — written for my approval; never sent to a member on their own.
- **Improvement proposals** — CTO only.
- **Delivery by email, WhatsApp or both** — each recipient chooses.

## Ground rules — always on, cannot be switched off

- **Read-only on their own.** No agent changes any data by itself, and no agent can change who has access: the CTO alerts, I act. The only exception is **Actions** (below): when a person asks for something to be done and confirms it.
- **Only real numbers.** Every figure comes from the app's own calculations; when data is missing they say so plainly (e.g. "no Glofox sales imported for September") instead of guessing.
- **I approve contact and changes.** Nothing goes to a member, and no app change is made, without my approval.
- **Spend cap.** A monthly AI budget I set in the app; when reached, the team pauses and tells me.

## How it works

- **Back end:** there is none yet (static hosting + Firestore). Add Firebase Cloud Functions (Node 20) in a new `functions/` folder, using the Admin SDK to read Firestore server-side. This needs project `athlete-fitness-dxb` on the Blaze plan — tell me how to switch, and stop until I confirm.
- **Numbers must match the app exactly.** Do not re-implement any money or stock maths. Reuse the app's own pure modules (`src/modules/finance/fin-calc.js` — `buildPnl`, `proRate`, `breakEven`; `finance.js` — `pnlFor` and `sameDaysPnl`; `fin-sources.js`; `purch-calc.js`; `inv-calc.js`), with a small server-side data adapter that gives them the same records the browser store does. Never touch `cafe-finance.js` maths. Add tests that the CFO's figures equal what the Financial Cockpit shows for the same month and days.
- **What each agent sees:** a compact, pre-computed JSON summary for its area only (figures, like-for-like comparisons, lists of exceptions) — never raw database dumps, never another area's data. Each agent's instructions: its position and responsibilities from the table above; use only the numbers given; say when data is missing; short; lead with what needs action.
- **The CEO as orchestrator:** give the CEO each head as a tool it can call ("ask the CFO …"), so questions are routed, answered from data, and combined. Log every question, which heads were asked, and the answer, so I can see how an answer was reached.
- **Period:** yesterday plus month to date, compared with last month over the same days (the cockpit's rule). Asia/Dubai time throughout.
- **The AI:** Anthropic Claude API — `claude-sonnet-5-5` for the six heads, `claude-opus-5-5` for the CEO. Check the current model list and pricing first, and tell me the expected monthly cost for the abilities switched on before building further. Track actual spend per agent per day for the spend cap.
- **Email:** Resend (resend.com). Branded HTML: dark, ATHL3TE wordmark, lime #c1ff72 as accent only (never for money — DESIGN.md), Geist with fallbacks, readable on a phone, plain-text version, a button to the full report in the app.
- **WhatsApp:** the Meta WhatsApp Cloud API (WhatsApp Business). Daily reports and alerts go out as approved message templates (needed for messages the business starts); questions to the CEO come in through a webhook function, and the CEO replies in the same chat. Only my number — and later the numbers of people I switch on in Access — may talk to the team; anyone else gets no reply. Walk me through creating the WhatsApp Business account, the phone number and the templates, and stop until it's set.
- **Secrets:** `ANTHROPIC_API_KEY`, `RESEND_API_KEY` and the WhatsApp token stored with `firebase functions:secrets:set` — never in git or browser code.
- **Schedule — everyone chooses their own time and channel:** one scheduled function builds the day's reports early morning Dubai (default 04:00, changeable); another runs every 15 minutes and delivers to each recipient at their chosen time, once a day, never duplicated (record what was sent). Alerts are checked through the day (every 15–30 minutes, switchable). If generation fails, retry once, then send me a short "today's reports failed: <reason>" instead of nothing.
- **For the CTO:** add lightweight logging in the app — uncaught errors, failed Firestore writes and slow screens, plus which screens are opened (no personal data) — into a new collection, and a small "Feedback" button for staff. Also log sign-ins (success and failure, device, time — no passwords), changes to users' roles and capabilities, and the result of each nightly backup. The CTO reads only those. Its proposals are saved in the app with a copy button for the prompt; I approve or reject each.
- **People:** at launch the only recipient is me (the owner). Build an **Access** section in Settings where I can later switch people on one at a time — picked from the people the app already has (users / staff list / PT trainers — find where emails and phone numbers live and use that; do not create a second list), plus partner trainers I add by name, email and phone. Everyone starts switched off. For each person I choose: which agent they talk to (trainers: CTrO only), which of their clients and classes it may discuss, report on/off, channel and time. A trainer only ever sees their own clients and classes where the data allows; switching someone off stops everything to them immediately. Log every access change (the CTO reports them).

## Ask — a chat on every page

- **A chat button on every screen of the app** (bottom corner, out of the way of tiles and tills). It opens a **side panel**; an **expand** button turns it into a **full-screen chat** (and back), keeping the conversation. On a phone it opens full screen. The conversation is the same one as the Ask tab and WhatsApp.
- **It knows where you are:** it receives the current screen and what's selected (month, tile, client, item), so "why is this tile red?" or "how has this client done this month?" works without explaining.
- **Answers in the best form:** text for a fact, a **table** for lists, a **chart** for trends (drawn with the app's own chart style, DESIGN.md), and always "how I got this" — data, period, filters — plus a **link to the page** that shows it. Under each answer: **Pin** (adds it as a tile on my dashboard), **Save as report** (e.g. every Monday), **Export** (Excel/PDF), **Draft email**.
- **Safe lookups only:** the AI never queries Firestore freely. Give it a fixed set of tools built on the app's own calculations (e.g. sales by membership type and period, P&L lines, stock on hand, client attendance, bookings, PT packages), each checking the asking person's capabilities (`users/<uid>.caps`) server-side. Numbers must match the screens.
- **Who can use it:** me from Phase 2 (through the CEO, who calls the heads). Later, when I switch people on in Access: trainers and partner trainers (CTrO, own clients only), reception (memberships, bookings, how-to), café staff (stock, how-to) — each limited to what their role can already see in the app, each with a daily question limit I set.
- **One list, not two — the launcher's Today panel is it:** the AI uses the existing Today panel (To do / Heads-up, the reminders and calendar behind its buttons) as the single list. Agents' alerts and tasks appear **in Today** too, tagged with the head that raised them (e.g. "COO · Inventory"), never in a separate AI inbox. The Ask panel shows a compact **Today** strip at the top with "See all". In chat I can say "what's on today?", "remind me Thursday at 10 to call Barakat", "snooze the stock alert to Monday", "mark September sign-off done" — reminders land in Today (and its calendar), and done/snooze follow the same rules as the panel (an item done only when the underlying work is actually done, e.g. September is really signed off). Find how Today is built in the launcher and reuse it; don't build a second one.
- **App help:** anyone can ask "how do I…" about any screen; answer from the app's own screens and a short help text you write per module.
- **Voice and Arabic:** hold-to-talk on phones; replies in the language asked.

## Actions — the AI does things, only when asked and confirmed

- A person can ask for something to be done, e.g. "pause Omar Al Khatib's membership for two weeks starting Sunday". The AI never does it straight away: it shows a **confirmation card** — who, what, dates, and the effect (e.g. "new end date: 14 Mar") — and only a tap on **Confirm** does it. Ambiguity (two people called Omar, unclear dates) → it asks first.
- Actions run through the app's **own existing functions** — exactly what would happen if the person did it by hand — with **the asking person's permissions**: if they couldn't do it in the app, the AI can't either.
- Every action is logged (who asked, what, when, confirmation) and has **Undo** where the app allows it. Money actions (refunds, payments, prices, payroll) and access changes are never available as AI actions.
- Start with a short list I approve (e.g. pause/extend a membership, book or cancel a class for a client, add a note to a client, create a task, record a stock count), each switchable in Settings. **Memberships and bookings live in Glofox:** connect the app to Glofox's API so these actions happen in Glofox itself (the member gets Glofox's usual confirmation). Tell me exactly what API access and keys we need from Glofox, walk me through getting them, and stop until I have them. Example to test end to end: reception types "book Omar for 8:00 today" → the AI finds the member (asks which one if two match), shows the class, time, spaces left and what it uses from their membership or pack → reception taps **Book** → booked in Glofox, logged, undoable.

## The Boardroom — a new module

- A tile on the launcher (owner only): my meeting room with the team.
- **Weekly board meeting:** the CEO prepares an agenda from the week's data; each head presents in turn (with tables and charts); I can question, push back and ask for more. **Ad-hoc meetings:** "call the CFO and COO — why did café margin drop?"
- **Decisions and actions** agreed become tasks (owner, date) that the team follows up; **minutes** are saved and searchable.
- Later, a trainer gets their own small room with the CTrO about their own clients (only once I give them access).

## In the app: a new "AI Team" module

Owner only, on the launcher like the other modules (follow how the Financial Cockpit is registered, gated and styled — same header, tabs, type and colours, DESIGN.md).

- **Brief** — today's CEO brief, then each head's report in its own card.
- **Ask** — a chat with the CEO (the same conversation as WhatsApp), showing which heads were asked for each answer.
- **Tasks** — open and done tasks by owner, with approve / reject.
- **History** — past days' reports, weekly reviews and month-end packs.
- **Team** — the seven agents as an org chart: position, what it reads, last run, and its abilities as on/off switches.
- **Targets** — the goals per agent.
- **Improvements** — the CTO's proposals with the ready-to-paste prompt and approve / reject.
- **Settings** — recipients (just me at launch; others via **Access**) with their report, channel (email / WhatsApp / both), delivery time and on/off; generation time; monthly spend cap and spend so far; **Run now** (builds today's reports without sending); **Send me a test**; pause everything.
- Firestore: new collections only (e.g. `ai_reports`, `ai_settings`, `ai_tasks`, `ai_chat`, `ai_deliveries`, `ai_spend`, `app_log`, `app_feedback`), with rules in `firestore.rules`: owner reads and edits the AI Team data; staff may only add to `app_log` and `app_feedback`; only the functions write reports.

## Build in three phases — stop for my OK after each

**Phase 1 — the core (me only).** Plan first: tell me where each agent's data comes from, what you'll reuse, and the files you'll add or change; stop for my OK. Then: data summaries and their tests (show me each summary, numbers matching the cockpit) → CEO, CFO, COO, CTrO with daily reports and **Run now** → email via Resend with **Send me a test** (to me only) → per-person delivery times with a full-day dry run before real sending → the AI Team page (Brief, History, Team, Settings) → spend cap.

**Phase 2 — talk and react.** WhatsApp delivery and the WhatsApp chat with the CEO (my number only); **Ask** on every page (side panel, expandable to full screen) and the in-app Ask tab, with tables, charts, pin, save, export; the **Boardroom** module; **Actions** with confirmation cards (start with the list I approve); instant alerts; targets; the **Access** section with trainer briefs and the trainer ↔ CTrO chat built and tested on a test account, but nobody switched on until I do it myself.

**Phase 3 — the full team.** CMO, CDO and CTO (with the app logging and Feedback button); tasks & follow-up; weekly review and month-end pack; forecasts; draft messages; improvement proposals.

Before handing over each phase: `node tools/audit.mjs` (expect HIGH 2 · MED 12 · LOW 1 — no new findings), `node tools/stress.mjs` (0 failed), and the new tests; then deploy hosting, functions and rules. Change existing modules only where needed to register the new module, add the logging, or reuse their logic — no restyling or "improvements" elsewhere. Ask me whenever something is unclear rather than guessing. At the end of each phase, report: the branch, what was added, the audit and stress lines, the monthly cost so far and expected, and what I need to do next.
