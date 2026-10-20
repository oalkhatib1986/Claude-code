In the athl3te-app repo, do a one-off **security hardening** of the app (Firebase project `athlete-fitness-dxb`, live at athlete-fitness-dxb.web.app). Read CLAUDE.md and DESIGN.md first and follow them. Work on a new branch `claude/security`; do not touch master until I approve. Plan first: list each item below, what you'll change, and anything that needs me (a console click, the Blaze plan, a cost). Stop for my OK before changing anything.

## 1. Two-step sign-in
- **Who:** my owner account, and any account with finance or admin access (Identity Platform MFA, enforced for those roles). Not trainers, reception, café staff, the erg tablet or TV screens.
- **How:** a 6-digit code from **Google Authenticator** (TOTP — scan a QR code once). **No SMS** as a second factor (SIM-swap risk). Users stay signed in on their own devices, so the code is only asked on a new sign-in or new device. We're already on Blaze; tell me the cost and walk me through switching on Identity Platform and TOTP MFA in the console. Stop until I confirm.
- **Recovery:** I'll turn on Google Authenticator's cloud backup (tied to my Google account). Last resort: if I'm locked out of the app, I sign in to Google/Firebase and you (or a small owner-only admin script you add, run from the command line) remove my app MFA so I can enrol again. Write these steps in `docs/RESTORE.md`. Build the enrol and sign-in screens in the app's style (DESIGN.md) and test the whole flow, including recovery, before enforcing it.

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
- Google account that owns Firebase: turn on 2-step verification with a **passkey** (phone Face ID / fingerprint), turn on Google Authenticator cloud backup, and **print Google's backup codes** to keep somewhere safe offline.
- GitHub: turn on 2-step verification (passkey or authenticator app) and save its recovery codes.
- Check who else is a member of the Firebase / Google Cloud project and the GitHub repo, and remove anyone who shouldn't be there.

## 8. Fit with the AI team
- If the AI team is built (branch `claude/ai-team` or merged into master): make sure its logging records each nightly backup result for the CTO, check the AI Team's Firestore collections and functions in the rules review (item 5), and once everything here is done, tell me so I can mark the Today item "Run security hardening before launching the client app" as done.

## Part 2 — before the client-facing app launches (do NOT start until I say)
When I tell you the client app is about to launch, do this as a second round on a new branch `claude/client-launch-security`, plan first and stop for my OK:
- **Client accounts:** email verification, strong password policy, limits on repeated failed logins, Firebase App Check enforced, optional two-step sign-in for clients who want it.
- **App store requirements (Apple App Store and Google Play):** in-app account deletion; privacy policy (English and Arabic) linked in the app and store listings; Apple "App Privacy" and Google "Data safety" answers drafted from what we really collect; Sign in with Apple if any other social sign-in is offered; a proper native app build (e.g. Capacitor) with real app features such as notifications — not a bare website wrapper; HealthKit/Health Connect and in-app payment rules if we use them. Check the current guidelines of both stores and give me a checklist with each item done / to do.
- **UAE data protection:** consent screens, data download and delete, minimum data kept with retention periods, a one-page data-flow list for my lawyer, and a short breach plan (who does what, who we tell, how fast).
- **Independent penetration test:** help me write the scope for an outside security firm, and fix what they find before launch.

## Finish
Do Part 1 now (items 1–8); Part 2 only when I say. Before handing over: `node tools/audit.mjs` (expect HIGH 2 · MED 12 · LOW 1 — no new findings), `node tools/stress.mjs` (0 failed), and the new rules tests. Then deploy hosting and rules. Change existing modules only where these items need it — no restyling. Ask me whenever something is unclear rather than guessing. Report: the branch, each item done / waiting on me, the audit and stress lines, the monthly cost added, and what I need to do next.
