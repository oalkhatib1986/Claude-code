# Erg Race Board → "Trainer & Programs" tile

**Owner-approved exception to DESIGN.md §0.** The owner has approved these
specific edits to `auth.js`, `admin-store.js` and `app.js`. They are needed to
switch the Trainer & Programs tile on and to control who can open it. Make
**only** the edits below. Change nothing else in those files.

## What this does
- The **Trainer & Programs** placeholder tile goes live. It opens the Erg Race
  Board, which already has the restyled ATHL3TE look.
- The board is its own page (`erg/app.html`), kept **exactly as built**. Do not
  edit, reformat, minify or "tidy" anything in `erg/`. It is generated and
  tested elsewhere: about 50 test suites, plus a strict no-overflow layout test.
- **Sign-in check (already inside the board):** the board reads the module
  app's session (`localStorage['afmaster:session']`).
  - It opens for anyone whose modules include `trainer`, or `*` for the owner.
  - Anyone else goes back to `../#/login`, and the app then takes a signed-in
    person to their launcher.
- **TV:** the TV link (`erg/tv.html`, or `erg/app.html#screen` / `#workout`)
  opens **without** a sign-in, in a screen-only mode:
  - It shows the leaderboard or the workout screen and nothing else.
  - There are no tabs, no Launcher button and no settings.
  - If it ever leaves that view, it goes to the login.
- **Tablets:** sign in once on each tablet with an account that has the tile.
  Then use the board's own tablet lock, which already has its own exit code.
- **Who sees the tile** is set in **Admin**, like every other module. There is a
  new tick, "Open the Erg Race Board", under "Trainer & Programs". Nobody gets
  it automatically except the owner (`*`).
- The board keeps its own saved workouts and settings, in its own
  localStorage keys (`af_*`). It shares nothing with the café or the other
  modules' data. No Firestore changes and no `firestore.rules` change.

## Step 1: copy the folder
Copy the `erg/` folder from this pack into the **root** of the app, next to
`index.html`, so you have `athl3te-app/erg/app.html`. Keep every file:
- `app.html` and `leaderboard.html` (the same board)
- `tv.html`
- `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`
- `buzzer-beep.wav`, `buzzer-final.wav`
- `version.txt`

The board uses the buzzers for the countdown, and `version.txt` for its
update check.

## Step 2: `src/core/auth.js`. Switch the tile on
In `MODULES`, change only the trainer row's status:
```js
  { id: 'trainer', name: 'Trainer & Programs', status: 'live' },
```

## Step 3: `src/core/admin-store.js`. Add the permission to Admin
In `CAP_GROUPS`, add this group **just before** the `finance` group:
```js
  {
    module: 'trainer',
    title: 'Trainer & Programs',
    caps: [
      { id: 'trainer.board', label: 'Open the Erg Race Board', hint: 'Build workouts, run classes and use the TV and tablets. The TV link shows the leaderboard without signing in.' },
    ],
  },
```
Do not add it to any `ROLE_PRESETS`. The owner chooses who gets it, person by
person.

## Step 4: `src/core/app.js`. Open the board from the tile
In `openModule`, add this branch just before the `admin` branch:
```js
  } else if (moduleId === 'trainer') {
    // The Erg Race Board is its own page (erg/app.html), kept exactly as built.
    // It checks the same sign-in itself before it opens.
    // replace, not href: Back from the board lands on the launcher, not on
    // this route, which would only send them straight back to the board.
    location.replace('erg/app.html');
```
The `canAccessModule` check above it still runs first, so someone without the
tile sees "Access denied" and never reaches the board.

## Step 5: check it (1280×600)
1. Sign in as **osk**. The Trainer & Programs tile shows "Live", and tapping it
   opens the board. The board's "← Launcher" pill brings you back, and so does
   the browser's Back button.
2. Sign in as **reception**. There is no Trainer & Programs tile. Typing
   `/erg/app.html` in the address bar sends you back to the launcher.
3. **Live (Firebase) login:** in **Admin**, give someone the "Open the Erg
   Race Board" tick. They get the tile at their next sign-in, so use "Sign out
   now" to make it happen at once. Taking the tick away removes it the same
   way.
   **Demo mode** (Admin has no people list there): in the browser console, add
   `'trainer'` to reception's `modules` in `localStorage['afmaster:users']` and
   reload. The tile appears and the board opens. Remove it and both are gone.
4. Sign out, then open `/erg/tv.html`. The leaderboard shows, with no tabs or
   buttons. Opening `/erg/app.html` instead goes to the login.
5. The board's buzzers sound on a countdown (the `.wav` files load, with no 404s
   in the console).

Commit as: "Trainer & Programs: the Erg Race Board, behind the app's sign-in".
