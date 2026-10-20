In the athl3te-app repo, do a one-off **security hardening** of the app (Firebase project `athlete-fitness-dxb`, live at athlete-fitness-dxb.web.app). Read CLAUDE.md and DESIGN.md first and follow them. Work on a new branch `claude/security`; do not touch master until I approve. Plan first: list each item below, what you'll change, and anything that needs me (a console click, the Blaze plan, a cost). Stop for my OK before changing anything.

## 1. Owner two-step sign-in
- Add multi-factor authentication for my owner account (and optionally any account with finance access): a 6-digit code from an **authenticator app** (TOTP — Google Authenticator, Microsoft Authenticator or similar; scan a QR code once) at sign-in, via Firebase Authentication with Identity Platform. Authenticator app is the main method (free, works offline, safer than SMS). SMS only as an optional backup second factor. We're already on Blaze; tell me the cost (it should be close to zero at our size) and walk me through switching on Identity Platform and MFA in the console. Stop until I confirm.
- Build the enrol and sign-in screens in the app's existing style (DESIGN.md). Give me a way back in if I lose my phone: let me enrol a second factor (my phone number by SMS, or the authenticator on a second device), tell me whether Identity Platform supports backup codes or whether you'd need to build them, and write the recovery steps in `docs/RESTORE.md`. Test it before turning it on. Also tell me whether "remember this device" is possible so I'm not asked for the code every time on my own laptop.

## 2. Daily backups
- Turn on daily Firestore backups with 14-day retention (scheduled backups; we're already on Blaze), plus a weekly export to a Cloud Storage bucket kept for 3 months. Tell me the monthly storage cost.
- Write down in `docs/RESTORE.md`, step by step, how to restore one collection or everything, and do a test restore into a separate database to prove it works.

## 3. Shared tills, tablets and screens
- **Two-step sign-in is only for my owner account (and finance accounts if I choose). Never on the erg tablet, TV/leaderboard screens, tills or any other shared device** — they must keep working without anyone entering a code.
- **Erg tablet and TV/leaderboard screens (`erg/app.html`, `leaderboard.html`, `tv.html`):** run as kiosks under their own limited device accounts (no MFA, never auto-lock, no time-outs). The erg tablet's account can only add erg results and read what the erg board needs; the TV/leaderboard account can only read what's on screen. Neither can open any other module. Check how they sign in today and keep that working.
- **Staff devices (café till, reception):** signed-in sessions lock after a period of no use (default 15 minutes, settable by me), needing the staff PIN or password again — not a code. Finance and settings screens lock sooner (default 5 minutes).
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

## 8. Fit with the AI team
- If the AI team is built (branch `claude/ai-team` or merged into master): make sure its logging records each nightly backup result for the CTO, check the AI Team's Firestore collections and functions in the rules review (item 5), and once everything here is done, tell me so I can mark the Today item "Run security hardening before launching the client app" as done.

## Finish
Before handing over: `node tools/audit.mjs` (expect HIGH 2 · MED 12 · LOW 1 — no new findings), `node tools/stress.mjs` (0 failed), and the new rules tests. Then deploy hosting and rules. Change existing modules only where these items need it — no restyling. Ask me whenever something is unclear rather than guessing. Report: the branch, each item done / waiting on me, the audit and stress lines, the monthly cost added, and what I need to do next.
