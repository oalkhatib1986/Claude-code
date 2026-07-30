# ATHL3TE Erg Leaderboard — standing rules

Single-file app: `leaderboard.html` (source of truth). `app.html` is a byte-for-byte
copy for cache-free serving; `version.txt` holds the build number.

## Non-negotiable layout rules (Omar's hard requirements)

- **Everything must fit. Always.** No element may cross the viewport edge and the
  page must never scroll horizontally — on ANY tab/subtab, in ANY combination of
  options (solo/teams, scored/no-score, together/stations, share/waves/rotate,
  per-block rests, collab, long names), at 390px phone width and on TV.
  Before shipping ANY layout-touching change, run
  `test_fitall.js` (scratchpad) — 3 config states × 9 pages, zero tolerance.
- **Content wider than its own box is always a bug — clipped OR spilling.**
  `overflow:hidden` cuts it mid-glyph; `overflow:visible` draws it outside its own
  border (a pill's text sitting past the pill). Both look broken. `test_fitall.js`
  flags ANY element whose `scrollWidth > clientWidth`, whatever the overflow mode;
  the only exemptions are real scroll containers (`overflow-x:auto/scroll`),
  deliberate `text-overflow:ellipsis`, and the `.tk-logo` crop mask. Never widen
  that exemption list to make a test pass; fix the layout instead.
  Removing `overflow:hidden` is NOT a fix — it converts a clip into a spill and
  hides it from the weaker `scrollWidth` reading.
- **Chips and pills wrap, they never clip.** Grid tracks use
  `minmax(min(100%,Npx),1fr)` so they drop to one column rather than squeeze,
  and the chip itself is `flex-wrap:wrap` with the name ellipsised (`.tn`) and
  the value tag (`.mtag`) kept whole.
- **The workout summary line fits on ONE line, time last.** It auto-scales
  (`fitSummary()`); never add a chip without re-checking worst cases.
- **No orphaned wraps.** Label+field pairs (`.bgrp`, `.fmtpair`) wrap as units.
- **No fixed widths on value-bearing fields.** iOS draws text wider than headless
  Chromium; a field that "just fits" in tests clips on iPhone. Use
  `width:auto;min-width:Npx` (see `.ifmt`/`.ifn`/`.brounds`/`.brrest`).
- **Consistency tiers:** pills 12px/34px · primary .btn 13px/38px · secondary
  .btn.small 12px/30px · nav tabs/subtabs 11px/29px. All left edges align.
- Wording: use **Solo** (never "Single") for the one-athlete who-option; wording
  follows format (solo vs teams) everywhere via kw()/kws() helpers.

## Ship ritual

1. Bump `const BUILD=N;` in leaderboard.html; `echo N > version.txt`;
   `cp leaderboard.html app.html`.
2. Run the relevant Playwright suites in the session scratchpad (all green).
3. Commit + push to `claude/gym-erg-leaderboard-pyztry` from the repo root.
4. Republish the artifact (same file path, favicon 🚣).

## Architecture notes

- localStorage: cfg `af_erg_cfg_v8`, presets `af_presets_v1`, tablet `af_tablet_sel`,
  results `af_results_v1`. Boot migrations live right after cfg load.
- Engine: per-block `rounds`/`rrest`/`aRest`; per-item `fmt` (share/waves/rotate)
  with `shareN`/`wavesN`; `cfg.together` = everyone-together class flow;
  `R().sameRest===false` enables per-block rest-after.
- **The gym owns the equipment; the exercise names what it needs.** `cfg.gear`
  (Layout > Gym equipment) is `[{name,n}]`; `cfg.exGear` maps a lowercased exercise
  name to a gear name, `""` meaning "none, deliberately". `gearFor()` prefers the
  stored link, then a genuine substring match ("Sled Push" -> Sled) and never guesses
  past that. Change a count once and every workout using that exercise re-splits.
  Setup is rebuilt on entry (`show()`), or a rename in Layout leaves stale names on
  the exercise rows. `it.stations` survives only as a fallback for saved workouts.
- **Stations are physical, and counted.** `itStations()` reads gear first, then
  `it.stations`, then `shareN`, then one each;
  `blockStations()` takes the hungriest part so nobody is left without one;
  `machSlots()` allocates per STATION and hands them out (`floor(j/per)`). Never
  number stations per athlete — that is what printed "M1..M12" for four racks.
- **A part is named by its WORK, not by its exercise.** `partLabel()` is the one
  label for a part wherever the trainer reads a list of them (session timeline,
  start-flow line): exercise + amounts + format + station count. Three parts that
  differ only in reps must never render as three identical rows — `audit.js` walks
  every surface (timeline, start flow, NOW/NEXT, overview card, TV board, lane,
  tablet) with a 6/4/2-rep block and fails if any of them drops the prescription.
- **Athletes who share an answer share a card.** Control > Athletes groups the rows
  into one `.stgrp` per station: the heading is the place, the NOW/NEXT pair sits
  under it once, then the name rows. `regroupCrews()` runs live (at build time the
  engine has not placed anyone yet) and bails while an input has focus. The group
  key is the WHOLE answer — now.where + both cells' work/where/note — because three
  athletes can share a rack now and split across stations in the next block; keying
  on the station alone would tell two of them the wrong thing. Cells drop a `where`
  that merely repeats the heading. Anything reading these panels must select
  `#crewList .stgrp`, not `.crew`.
- **Start the clock and the board stops being a plan.** `renderBlockCards()` marks the
  block the class is in `.live` (all of them when `cfg.together===false`), heads it with
  round · part n of m · time left over a `.bprog` bar, and hands `segAt()` to
  `exLines(b,seg)` so the running part is `.pnow` (tag NOW) and the one after it `.pnxt`
  (tag NEXT — the next PART of this block, or the top of the next round when it repeats).
  Other blocks dim to `.queued`/`.donez`. The big screen shows no standing advice line
  (`body.wkscreen .phase .pdesc{display:none}`) — a TV across the gym is for the workout.
  `livebd.js` gates it.
- **The running part is a slab, not a shade of grey.** `.exg.pnow` is a solid light
  ground with black type; `.exg.pnxt` is the same shape drawn in outline, so the pair
  reads as one control. The part's countdown is its own headline (`.bclk`, 52px on TV)
  beside the block name, with round · part n of m on its own line (`.bwhere`) — a
  status string small enough to squeeze onto the title row is too small to read from
  the floor.
- **A board measured once is measured wrong — it GROWS.** Starting the clock turns a
  part into a slab and adds a countdown, so the picture gets taller after `fitTvBoard()`
  ran. A `ResizeObserver` on `#tvFit` re-fits (or re-fills, in `tvfull`) whenever its
  own box changes; the room it was given lives on the element (`f._avail`, `f._fill`)
  because `fitTvBoard` is called during init, before any closure `let` is initialised.
  `tvfit.js` asserts nothing hangs past `#viewBoard` on 1920/2560/1366 and in the phone
  preview, idle and live.
- **`% 1RM` is prescription, so it rides in `exTxt()`** and reaches every surface at once.
  `exRM()` returns 0 for anything `machineOf()` recognises — an erg has no one-rep max,
  so the field is not even drawn on its row.
- **NOW and NEXT are one component used twice.** `crewWhere()` returns
  `{now,nxt}`, each `{lab, work, where, note}`: the work with its reps, the place
  (`Block A · Station 1`), one note. `crewStLine()` has a single `cell()` builder so
  the boxes cannot drift apart. "Next" resolves nearest-first — the swap inside this
  part, the next part of this block, then the next block, which is the only case that
  says `end of <block>`. The station number never rides on the exercise name.
- **The machine is not the question — the person is.** The tablet is bolted to the
  erg, so before the clock starts each screen offers itself: `.tk-claim` replaces the
  instruction card while `phase==="pre" && !sessionActive`, and tapping a name in
  writes it straight into the crew slot that machine already maps to
  (`machSlots().byKey` -> `{bi,j}` -> `teamsAt(bi)[j]`). No new state: a claim IS the
  name, an unclaimed slot is one `unnamed()` still holds. Freeing it restores the
  placeholder. `claimBarText()` tells the trainer who has tapped in and which machines
  are still empty. Claiming is the FIRST placement only — every rotation after it is
  the same engine as before. The redraw guard must cover `#tbClaim` as well as
  `#tbName`, or the 400ms tick wipes what someone is typing. `claim.js` gates it.
- **The Erg Tablet tab shows the erg tablet.** `tbPrev` defaults to TRUE, so the tab
  opens on the real 1005x600 landscape frame (turned on its side under 820px) and the
  button offers `Phone view`; `fitTablet()` re-labels it every time so it cannot go
  stale. A real tablet in landscape kiosk gets there anyway via `TBKQ`. The rotated
  frame is fitted to `stage.clientWidth - 3` — at exactly the stage width it rounds a
  pixel past the viewport and the page picks up a sideways scroll. In phone view the
  target rail is short and wide, so `.tk-pills` turns into a ROW: stacked with
  `flex:1 1 0` its buttons collapsed into each other and printed 500 on top of 600.
  `tbland.js` gates both layouts.
- TVs load `#screen` / `#workout` and must always start in TV mode; the Big Screen
  tab on a phone defaults to phone view (`scrFit`). Under 1100px, TV mode frames the
  board at a true 1920x1080 and scales it (`body.tvprev`, `#smStage`) instead of
  squeezing the page, so the nav tabs stay full size and tappable. The frame excludes
  the header, so `.tvbrand` draws the mark inside it — preview only; a real TV keeps
  the header, which also carries the partner logo (`#coLogoWrap`). `fitTvBoard()`
  scales `#tvFit` so the picture always fits the screen and centres. Chrome above the
  board costs picture: full screen (`body.tvfull`) hides everything and is the mode to
  cast from. It is not a pill of its own — the sub-tab row stays Leaderboard ·
  Workout+Timer · Phone/TV view · PDF. You enter it by tapping the TV preview frame,
  or via the corner control when already projecting; `.tvctl` then offers switch-view
  and exit. Never read a stage's own inline width as "available" —
  measure the free space or the frame can never grow back.
- **Full screen FILLS the screen, edge to edge.** `body.tvfull` drops the 1920x1080
  conceit entirely: `#viewBoard` is sized to the real viewport (turned on its side
  when the device is held upright) and `fillTvBoard()` picks the width the board is
  *authored* at — `W = cw * H(W) / ch` — so the uniform scale lands on exactly
  cw x ch. Wider than the screen means it scales down, narrower means it scales up;
  either way there are no black bands on either axis. Fitting inside a fixed frame
  (`fitTvBoard`) is for the *preview* only. `fsfill.js` asserts ≥94% coverage on both
  axes and nothing painted outside, on 1920/2560/3840 TVs and phone both ways.
