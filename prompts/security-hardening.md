In the athl3te-app repo, do a one-off **security hardening** of the app (Firebase project `athlete-fitness-dxb`, live at athlete-fitness-dxb.web.app). Read CLAUDE.md and DESIGN.md first and follow them. Work on a new branch `claude/security`; do not touch master until I approve. Plan first: list each item below, what you'll change, and anything that needs me (a console click, the Blaze plan, a cost). Stop for my OK before changing anything.

## 1. Owner two-step sign-in
- Add multi-factor authentication for my owner account (and optionally any account with finance access): a code by SMS or an authenticator app at sign-in, via Firebase Authentication with Identity Platform. We're already on Blaze; tell me the cost (it should be close to zero at our size) and walk me through switching on Identity Platform and MFA in the console. Stop until I confirm.
- Build the enrol and sign-in screens in the app's existing style (DESIGN.md). Give me a way back in if I lose my phone (backup codes or a second factor), and test it before turning it on.

## 2. Daily backups
- Turn on daily Firestore backups with 14-day retention (scheduled backups; we're already on Blaze), plus a weekly export to a Cloud Storage bucket kept for 3 months. Tell me the monthly storage cost.
- Write down in `docs/RESTORE.md`, step by step, how to restore one collection or everything, and do a test restore into a separate database to prove it works.

## 3. Shared tills and tablets
- Signed-in sessions on shared devices (café till, reception, erg tablet) should lock after a period of no use (default 15 minutes, settable by me), needing the PIN or password again. Finance and settings screens should lock sooner (default 5 minutes).
- Owner and finance screens must never stay open on a shared device: if someone opens them there, ask for my password again.

## 4. Erg results to the cloud
- The erg board (`erg/app.html`, `leaderboard.html`, `tv.html`) keeps results only in the tablet's localStorage, so they're lost if the tablet is reset. Sync them to Firestore (new collection, rules: the erg tablet may add results, only the owner may edit or delete), keep working offline and upload when back online, and import what is already on the tablet once without duplicates. Don't change how the erg board looks or works.

## 5. Check the rules and the leaks
- Review `firestore.rules` line by line against what each role really needs. Report anything too open; fix only with my OK. Add rules tests (Firebase emulator) covering: a trainer can't read finance, can't read other trainers' clients, a disabled account can't read anything, nobody but the owner can change roles or capabilities.
- Search the repo and the built site for anything secret (API keys other than the public Firebase web config, passwords, tokens) and tell me what you found.
- Restrict the Firebase web API key in Google Cloud to our domains, and turn on Firebase App Check if it won't break the tills (tell me first).
- Turn on email enumeration protection and a sensible password policy (at least 10 characters) in Firebase Authentication.

## 6. Staff accounts
- List every account with its role, last sign-in and whether it's active. Flag anyone who hasn't signed in for 30 days or who has left (compare with the staff list), so I can switch them off. Don't switch anyone off yourself.

## 7. What I do myself (just tell me the steps, on my phone)
- Turn on 2-step verification on the Google account that owns Firebase, and on my GitHub account.
- Check who else is a member of the Firebase / Google Cloud project and the GitHub repo, and remove anyone who shouldn't be there.

## Finish
Before handing over: `node tools/audit.mjs` (expect HIGH 2 · MED 12 · LOW 1 — no new findings), `node tools/stress.mjs` (0 failed), and the new rules tests. Then deploy hosting and rules. Change existing modules only where these items need it — no restyling. Ask me whenever something is unclear rather than guessing. Report: the branch, each item done / waiting on me, the audit and stress lines, the monthly cost added, and what I need to do next.
