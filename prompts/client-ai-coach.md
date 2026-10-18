In the athl3te-app repo, plan (and later build) the **ATHL3TE Coach**: a personal AI coach for every client on the client-facing side of the app, like the WHOOP assistant but built on our gym's data. Read CLAUDE.md and DESIGN.md first and follow them. Work on a new branch `claude/client-coach`; do not touch master until I approve. This depends on the client-facing app (client sign-in, profile, logging) — if that doesn't exist yet, tell me what's missing and plan the Coach on top of it. Plan first and stop for my OK.

## What it is
One coach that knows each client's whole history. It **analyses their data and trends over time**, spots patterns, and tells them what to do next and why — in plain, short, encouraging language, backed by their own numbers ("your 2k erg time has dropped 9 seconds in 6 weeks, but you've trained legs once in 14 days").

## What it reads — each client's own data only
Classes and workouts attended, erg results and PBs (`erg/`), PT sessions and trainer notes meant for the client, their goals, and anything they log (how they feel, soreness, sleep, weight and body measurements, nutrition, water). Optional: their WHOOP data (recovery, HRV, resting heart rate, sleep, strain, workouts) through the WHOOP developer API with OAuth, if they link it — in the first version.

## Trends and analysis — the core
Pre-compute a compact summary per client (never raw dumps): week-on-week and month-on-month trends, rolling averages, training load vs recovery, frequency by type and body area, streaks and gaps, PB progression and plateaus, progress vs goal and the rate needed to hit it, and correlations in their own data (e.g. sleep vs performance, attendance vs weight). The AI interprets these; all numbers come from the computed summary, never invented. When data is thin it says so and asks them to log.

## What it does
- **Daily insight:** today's recommendation — push, maintain, or recover — with the reason from their trends.
- **Weekly report:** what improved, what slipped, one or two focus points for next week.
- **Ask the Coach:** chat about their own training, performance, recovery, nutrition, habits and goals, answered from their data.
- **Recommendations from our gym:** specific classes (with times and spaces), workouts, trainers or PT packages that fit, and videos/content from our library — never outside content.
- **Goals:** set and track (fat loss, strength, erg or race targets, events); says whether they're on track and what to change.
- **Consistency:** notices when they go quiet or a pattern changes, and checks in.

## Content library
A library module (owner/trainers manage it): videos and guides tagged by type (strength, conditioning, mobility, recovery, nutrition, technique…), body area, level, equipment and duration. The Coach recommends only from it. Start small; it grows.

## Ground rules — always on
- **Not medical advice.** Pain, injury, illness, dizziness, pregnancy, eating-disorder signs, extreme weight change → it tells the client to stop and see a professional and flags their trainer. No diagnoses, no supplements or medication advice.
- **Trainer stays in charge.** A trainer's plan overrides the Coach. Trainers see what the Coach told their clients; worrying patterns go to the trainer and to the Chief Training Officer (AI team, `prompts/ai-management-team.md`).
- **Consent and privacy.** Opt-in with a clear consent screen (health data, UAE PDPL); the client can see, export and delete their data and unlink WHOOP at any time. Firestore rules: a client reads only their own data; no client data reaches another client.
- **Light selling only:** suggests packs or PT only where it genuinely fits, and only if I switch that on.
- **Spend cap:** a monthly AI budget I set; per-client daily message limit.

## How it works
Firebase Cloud Functions (same `functions/` as the AI team) build each client's summary nightly and on new data; Claude API — `claude-haiku-5-5` for daily insights, `claude-sonnet-5-5` for chat and weekly reports (check current models and pricing first and tell me the expected monthly cost per 100 active clients). Secrets via `firebase functions:secrets:set`. Push notifications or in-app inbox for the daily insight. Owner settings: on/off, what's included for all members vs premium, selling on/off, spend cap, which data sources are used.

## Build in phases — stop for my OK after each
1. Plan, data summaries and trend analysis with tests (show me 3 real clients' summaries); content library.
2. Daily insight and weekly report in the client app, consent screen, trainer view, safety flags.
3. Ask the Coach chat; goals; class/PT recommendations.
4. WHOOP linking.

Before each handover: `node tools/audit.mjs` (no new findings), `node tools/stress.mjs` (0 failed), the new tests; deploy. Report the branch, what was added, the audit and stress lines, cost so far and expected, and what I need to do next. Ask me whenever something is unclear rather than guessing.
