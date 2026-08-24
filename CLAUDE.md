# ATHL3TE Erg Leaderboard — standing rules

Single-file app: `leaderboard.html` (source of truth). `app.html` is a byte-for-byte
copy for cache-free serving; `version.txt` holds the build number.

## Non-negotiable layout rules (Omar's hard requirements)

- **Everything must fit. Always.** No element may cross the viewport edge and the
  page must never scroll horizontally — on ANY tab/subtab, in ANY combination of
  options (solo/teams, scored/no-score, together/stations, share/waves/rotate,
  per-block rests, collab, long names), at 390px phone width and on TV.
  Before shipping ANY layout-touching change, run
  `test_fitall.js` — 3 config states × 9 pages, zero tolerance.
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
  (`fitSummary()`); never add a chip without re-checking worst cases. Below a 0.6
  scale it WRAPS whole chips instead (`#evSummary.wrap2`, separators dropped — a
  dot leading a wrapped row reads as a typo): a board authored at phone width
  (upright full screen) cannot carry six chips at any readable size. And measure
  the span from first chip's left to last chip's right — the TV head justifies
  flex-end, so overflow goes LEFT where `scrollWidth` cannot see it, and the fit
  scales about `right center` there or the spill survives the scale.
- **Full screen NEVER turns the picture sideways.** A window taller than wide gets
  an upright board with fewer columns (`fillTvBoard` minW 320 in tvfull), never a
  rotated one — Omar: "why does the screen change direction?!". The tablet PREVIEW
  frame on a phone still rotates (it is a miniature of a fixed landscape device);
  the leaderboard is not a device, it is a page. `fsfill.js` pins the no-rotate
  contract and coverage on 402x874 both ways.
- **Rank and Team are ONE header cell each** (`grid-row:1/3`), titled "Rank" and
  "<Team|Athlete> name"; the pager rides inside the team box (`.gwho i#boardPage`).
  Machines and Score keep two rows because their second row says something (the
  unit). The row-2 spacer cells are GONE from `buildBoardHead()` — auto-placement
  puts the subs straight into column 3.
- **Every `display:` rule on the tablet-table board rides on a fully-:where'd
  selector** — `:where(body.bigscreen:not(.mobscreen)) #board :where(...)` is
  (1,0,0), under `#board.no-mach .hgrp`'s (1,2,0). Half-measures repeat the
  column-shift bug: with only the span part in `:where()`, the body prefix alone
  outranks the hide rules, and the first phone-width fullscreen board (no-mach)
  resurrected every hidden cell and snaked the header.
- **No orphaned wraps.** Label+field pairs (`.bgrp`, `.fmtpair`) wrap as units.
- **No fixed widths on value-bearing fields.** iOS draws text wider than headless
  Chromium; a field that "just fits" in tests clips on iPhone. Use
  `width:auto;min-width:Npx` (see `.ifmt`/`.ifn`/`.brounds`/`.brrest`).
- **The two menus read as one, so they start at the same place.** The main tabs were
  pinned right (`margin-left:auto`); on a laptop that put them on the far side of the
  screen while the sub-tabs sat on the left, and the eye had to cross the page to get
  from one row of pills to the other. `.mark` takes the first row outright
  (`flex:0 0 100%`) so `.tabs` wraps under it at its own width, left edge shared with
  the sub-tabs, the title and the cards. `align.js` gates it.
- **Consistency tiers:** pills 12px/34px · primary .btn 13px/38px · secondary
  .btn.small 12px/30px · nav tabs/subtabs 11px/29px. All left edges align.
- **THE BROWSER'S OWN WIDGETS FOLLOW THE SITE.** `body{color-scheme:dark;
  accent-color:var(--accent)}` (`.tk` is `light` — white card): the native date
  calendar, select dropdowns, checkboxes and scrollbars must render dark with the
  site's accent, never Chrome-blue on white (Omar: "stuff like this must be in the
  same format of the website! remember this always"). Any NEW input type (date,
  time, month…) must also be added to the shared `input[type=…]` styling rule —
  an unlisted type falls back to UA styling and sticks out immediately.
- Wording: use **Solo** (never "Single") for the one-athlete who-option; wording
  follows format (solo vs teams) everywhere via kw()/kws() helpers.

## Ship ritual

1. Bump `const BUILD=N;` in leaderboard.html; `echo N > version.txt`;
   `cp leaderboard.html app.html`.
2. Run the suites the change can actually affect (see below), all green.
3. Commit + push to `claude/gym-erg-leaderboard-pyztry` from the repo root.

Omar tests on https://oalkhatib1986.github.io/Claude-code/app.html. Do NOT publish
a Claude artifact — he never opens it, and it is one more permission prompt.

## Which suites to run

SUITES LIVE IN `tests/` IN THE REPO (committed; node_modules gitignored, `npm i
playwright` once per machine). The old scratchpad suites were LOST when the
session container was reclaimed (Aug 2026) — every suite named below that is
not yet in `tests/` is gone and gets REBUILT in `tests/` the next time its
surface changes. Never keep a suite only in the scratchpad again.

There are ~41 suites and a full sweep is 8-10 minutes, so it is not the default.
Run the ones the change can reach, plus `test_fitall.js` for ANY layout change:

- board/lane/columns -> `lanecols` `lanenext` `livebd` `tvfit` `fsfill`
- tablet -> `claim` `tbland` `tbtap` `steady`
- setup/exercise fields -> `stnfield` `fmtalign` `rm1` `freshex` `amtrange` `winblock`
- stations/sharing/equipment -> `sharestn` `cardtag` `stncount` `gearlink` `ergauto`
- NOW/NEXT, athlete cards -> `crewwhere` `grouped` `nextpart` `idlenext` `audit`
- fullscreen/TV chrome -> `fsfill` `fsctl` `fsentry` `fsswitch` `tvfit`
- footer/chrome -> `foot` `align` `cardtype`
- class size / roster -> `latein` `gymfit` `freechip`

Run the FULL sweep only when the engine changes — the allocator (`machSlots`,
`itStations`, `blockStations`, `spreadIx`), the rotation (`segAt`, `stationOf`,
`setTeamCount`), or anything that moves who stands where.

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
  `exLines(b,seg)` so the running part is `.pnow` (tag NOW). ONLY the running part is
  marked — the card already lists the parts in order, so boxing the one after it just
  repeats the list; "next" belongs on the tablet and in the trainer's NOW/NEXT panel.
  Other blocks dim to `.queued`/`.donez`. The big screen shows no standing advice line
  (`body.wkscreen .phase .pdesc{display:none}`) — a TV across the gym is for the workout.
  `livebd.js` gates it.
- **The parts sit in one row while they fit, and in EVEN rows when they do not.**
  `repeat(auto-fit,minmax(230px,1fr))` packs as many cards across as will go and drops
  the remainder underneath, so four parts printed A · B · C with D orphaned below.
  `fitBlockCols()` measures the box, works out how many columns it can really hold,
  and spreads the parts over the fewest rows that need — `--bcols` is that balanced
  count. It is re-run by a `ResizeObserver` on `#blockCards` WIDTH only: the height
  changes as a result of the fit, so watching it would chase its own tail.
  On the WALL the count comes from the count alone, capped at 3: `fillTvBoard()`
  chooses the width that makes the board fill the screen, so measuring that width to
  pick the columns — which changes the height, which changes the width it picks — is
  a loop with no fixed point, and four wide cards leave a band of empty floor
  (`fsfill` drops to 90%). A · B · C across, four as a square. `bcols.js` gates it.
- **A line of work is read in one go, so it sits on one line.** At a fixed 34px the
  longest exercise ran past the card and the wrap stranded the unit — "20" ending one
  line and "reps" starting the next. Three things together: the workout board gets a
  wider measure (see above); the prescription is one atom (`exHtml()` wraps
  `· 30 reps` and `@ 75% 1RM` in `.amt{white-space:nowrap}`, and a heading glues its
  LAST WORD to `· 4:00` so a wrapped title never opens on a dot); and `fitBlockText()`
  measures the longest line with wrapping switched off and sets `--bfs` to the largest
  size at which every line still fits — ONE size for all the cards, or the columns
  stop looking like columns. The floor is a proportion of the board's own authored
  width, not a pixel count: 24px on an 1820 board and on a 1302 one are two different
  sizes to the eye. Measured at authored width, so it never chases `fitTvBoard`.
  `wallfit.js` gates it on 1920/2560/1366 and the phone preview.
- **A slab is as tall as the work it holds.** `.exg.pnow` shared a `height:8px` rule
  with `.bprog` — the running part was squashed to a stripe and painted its own light
  ground straight across the words. A height that belongs to a progress bar belongs to
  nothing else; `livebd.js` now measures the slab and fails if any line spills out.
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
- **The gym owns the machines; the headcount is whoever turns up.** A tablet is bolted
  to an erg and never moves, so EVERY erg today's workout can use is live and claimable
  before the clock starts — including the ones the class size has not reached yet.
  `claimSlots()` probes the floor at each hypothetical class size (`withCrews(n,fn)`
  overrides `worstTeamsPerBlock` for the length of one read, nothing is rebuilt) and
  records the smallest class each machine exists in as `need`; anything the gym does not
  own (`num > invOf(type)`) is never offered. `takeFree()` grows the roster to `need`,
  turns `cfg.autoCrews` off (a claim is a fact, not a proposal) and writes the name into
  the slot that machine maps to. The team selector is now a starting number, not a gate.
  The trainer's bar keeps the class as the denominator and counts spare machines
  SEPARATELY — "2 more free if anyone else turns up" is an offer, not four missing people.
  Clear the claim box BEFORE the redraw: a box with text in it reads as "someone is
  mid-type" and freezes the picture. `openclaim.js` gates it.
- **A name is taken where the person is, whenever they get there.** Someone who starts
  on the floor has no tablet in front of them; they get one the moment the rotation puts
  them on an erg, and THAT is when they tap in. So an unclaimed slot offers itself for
  the whole session (`claiming = team && !finished && (preClock || !claimed)`), not just
  before the clock — mid-block it reads "You're up here now / Tap your name in" and the
  work list stays on screen underneath. Confirming ("you're on this one", with a way to
  give it back) is the pre-clock state only. `floorclaim.js` gates it.
- **The overview card lists the FLOOR, not the roster.** `renderBlockCards()` draws one
  chip per crew slot AND one `.spare` chip per machine in `claimSlots()` the class size
  has not reached. Leaving them off made a gym with five runners look like it had three.
  A spare is quiet and never goes `.late` — it is an offer, not a missing person.
- **An unclaimed machine is a place, not a person.** The overview chip leads with the
  station and is tagged `free` while `unnamed()` holds the slot; a claim flips it to
  name + station. It is quiet before the clock starts and only goes red (`.late`) once
  the session is running, when an empty machine really is a problem. Anything reading
  station numbers off the card must take `.mtag` unless it says "free", then `.tn`.
  `freechip.js` gates it.
- **One job per line.** `wkText()`/`wkSwap()` join exercises with `BRK` (U+2028), not
  " · " — Pair 1 and Pair 2 are two people, and one line reads as one instruction.
  `crewStLine()`'s `cell()` runs it through `brk()`; the lane flattens it back because
  a lane is one line. The character stays inside the grouping key, so `crewWhereKey()`
  is unaffected.
- **No ergs, nothing to assign.** The tablets are bolted to the ergs, so a workout
  without one carries no screens: nothing to claim, no station to hand out, nobody to
  count. `hasErgs()` drives `body.noergs` (hide the card's `.teams` chips, the claim
  bar; the Erg Tablet tab says it once instead of per machine) and `body.noroster`
  (`noergs && !showLeaderboard()` — then the headcount goes too; a SCORED floor
  workout keeps it, the leaderboard needs the rows). The class reads the big screen
  and splits itself. `noergs.js` gates it.
- **Before the clock, the only thing that moves is the warm-up numbers.** Repainting
  the whole tablet once a second to animate them is what made the target pills, the
  claim box and Save "not work": the element under the finger was a fresh one by the
  time the tap landed. `tickTbVitals()` patches `[data-v=...] b` in place and the
  pre-start screen stops moving at all. `stillpre.js` marks the buttons and fails if
  they are not the SAME elements three ticks later. Every control on `#tbScreen` is
  ALSO delegated to the container and carries its meaning in data attributes
  (`.tswp[data-k][data-a][data-who]`, `#tbClaimGo[data-tid|data-slot]`,
  `#tbFree[data-tid]`) — never bind a handler to an element a timer can replace.
- **Once the clock runs, the work comes first.** Before the start there is nothing else
  to show, so the claim card owns the instruction zone (`claiming = team && !finished &&
  preClock`). After it starts, the person on the machine needs to know what they are
  doing: the ask drops to a slim green band above the work (`.tk-name.up`, "You're up
  here now — tap your name in") and never covers `tk-inst`. `.tk-who` reads
  "Nobody yet" whenever the slot is unclaimed, in both states. `floorclaim.js` and
  `claim.js` assert the band, the instruction and the work are all on screen together.
- **Nobody on the machine, nothing coming off it.** An erg with no name on it is an
  empty erg: `frameRotation` sets `effort=0` and `e.hot=false` for any crew
  `unnamed()` holds, so there is no split, no watts, no metres, no calories and no
  score; the tablet draws no `.tk-vit` strip at all (not even a warm-up), and
  `tickTbVitals()` bails. Counting for a slot nobody has claimed is counting a ghost.
  The lane's name is repainted in `renderLanesRot()`, NOT written once in `build()` —
  a claim has to reach the board or it calls them "Athlete 1" all session.
  `noname.js` gates it.
- **A NUMBER ON THE TABLET IS A MONITOR'S NUMBER, OR IT IS NOT THERE.** The
  simulated vitals are gone (Omar: "dummy numbers… moving all the time"): the
  `.tk-vit` strip exists only while `pm5On()` (paired + fresh within 6s) — a
  name alone shows none, pre-clock or mid-session; paired pre-clock reads
  "PM5 live · not counting yet". `tickTbVitals()` opens with
  `if(!pm5On()) return;`. `pm5.js`, `stillpre.js`, `noname.js` gate it.
- **The real monitor speaks two languages, one button.** `PM5` singleton
  (state off|connecting|on|lost, `af_pm5_id` remembers the device):
  `pm5Attach()` tries Concept2's own service (GEN u24 time/100 + u24 dist/10,
  AD1 spm/pace, AD2 watts/cal) and falls through to standard FTMS
  (`pmFtmsAttach`) for the Assault Runner and everything else. The FTMS
  frame is a flags word walked in ASCENDING FLAG ORDER — skip or reorder a
  declared field and every number after it lands on the wrong meaning
  (Omar's runner printed cal 17920 = 0x4600 = its own elapsed 70s, because
  power was read before energy); treadmill and indoor-bike number their
  flags DIFFERENTLY (energy 7 vs 8, elapsed 10 vs 11), treadmill bit 12
  (force-on-belt THEN power — watts are the second s16) is the HIGHEST bit
  and so rides at the END of the frame, and 0xFFFF/0x7FFF are the spec's
  "not available" — never data. `?pm5dbg` on the URL puts a raw-frame hex
  readout on the machine screen so the next off-spec monitor is one photo
  away from a diagnosis. Pace unit follows the machine (`PM5.live.plab`: /500m C2,
  /km FTMS) — the console's own unit, never invented. `pm5View()` baselines
  against the monitor's FIRST totals (`PM5.got`) so held numbers never leak;
  `tbFresh()` re-anchors and `pm5Reset()` zeros the monitor itself (CSAFE
  `F1 86 88 0E F2` on C2, control-point 0x00+0x01 on FTMS) at start/reset.
  `pm5Resume()` reconnects silently via `getDevices()` (6s retry while
  `tabkiosk`). Real deltas ride `frameRotation`'s `pmE` branch onto the
  crew's counters; the sim is skipped for that crew. Chrome only — Fully
  Kiosk's WebView has no Web Bluetooth. `#tbBle` MUST stay in the delegated
  `.closest()` selector list, like every tablet control. `pm5.js` gates
  both protocols end-to-end with a mocked `navigator.bluetooth`.
- **Leaving the Erg Tablet tab takes the kiosk with it.** `body.kioskon` pins a
  1005x600 frame; left on after `show()` moved to another tab it warped every other
  page and the nav drifted out from under the taps. `show()` removes
  `kioskon`/`tabprev`/`tabwall`/`tabone` whenever `which!=="tablet"`. The stage
  is `touch-action:pan-y` so a sideways drag walks the row instead of becoming the
  browser's back-swipe. Kiosk keeps the page's TOP and SIDE padding — stripping it
  put the logo and tabs 31px higher than every other page (Omar: the logo must sit
  the same on ALL pages); only the bottom goes, and the frame scales to what is
  left. The back bar carries NO side padding: its button's left edge lines up with
  the frame below it.
- **The logo is one asset in two forms, and the cfg picks.** The white wordmark
  ships in the header markup (the default everywhere); `LOGO_BADGE` is the square
  A3 mark; Layout > Brand radios set `cfg.display.logo` ("word"|"badge"),
  `applyLogo()` (called from `build()`) swaps the header img and stamps
  `body[data-logo]`. Every surface follows from the header: the TV brand reparents
  `.mark`, the tablet clones `img.badge`'s src and inverts it black for the white
  card (`.tk-logo img{filter:invert(1)}`). Assets are cropped tight — no negative
  margins, no invert on dark grounds, no 186% crop zoom.
- **Sharing is a fact, not a fault.** The allocator caps stations at what the gym
  owns and quietly puts several people on each, so `anyOver()` can no longer fire —
  the old "over capacity" banner is unreachable for ergs. The block card states the
  split instead: `.shareline` ("4 per station · 2 stations"), a footnote under the
  chips. It is NOT a `.t` — anything counting machines must not pick it up.
- **All blocks at once means there is no "current block".** With `cfg.together===false`
  every block runs simultaneously, so "Block 1 of 4 — working" is simply false.
  `whereNow(short)` names the ROUND in that flow ("All 4 blocks · round 2/3") and the
  block only when the class is together; `nextTag()` does the same for what comes next.
  Every banner, clock state and start-button label goes through them — never write
  `Block ${blockIdxOf(rot.round)+1}` into user-facing text again.
- **One class ends, the next walks in.** `clearAllNames()` puts every slot back to its
  placeholder and every machine back on offer, without touching the clock. It is
  offered on the trainer's Session page only while there is a name to clear
  (`claimState().got>0`) and always in Control > Athletes. `clearall.js` gates it.
- **THE LIBRARY IS THE PROGRAMME, AND IT IS STRUCTURED.** `const PROG` embeds every
  session from ATHLETE_PROGRAMMING.xlsx as `[block, week, day, stype, dateISO,
  weekLabel, BLOCKS]` where BLOCKS is the app's own rotation shape — 334 sessions,
  regenerated by `extract_prog.py` → `parse_prog.py` → `verify_parsed.py`
  (scratchpad). NEVER TEXT: Omar's hard order ("no as written shit… or you will be
  fired"). The parser maps every sheet format onto fields — EVERY a:bb × N SETS →
  rounds × item dur; EMOM → one item per minute slot (rounds = total/slots, a
  "5 & 6." slot spans 2 min); IN T:00 → `rounds:"win"`; FOR TIME/chippers → a
  group item; supersets → group items with `sets` per exercise; "*notes" → note
  fields; "every 4 mins 1P 20 wall balls" → `it.every`; time-ladders/M-F loads/
  RPE-per-set listings → notes with every number kept. `verify_parsed.py` is the
  gate: EVERY number and word of the sheet must reach the structured render or be
  an explicitly sanctioned structural token — it runs at 0 missing across all 499
  parts, and stays at 0 or the import does not ship. ~15 pure-guidance lines ride
  as note FIELDS (visible, never dropped). `PROGV` bumps on every re-import so
  unedited copies adopt (`refreshSeeded`); one-shot `loadProgrammeOnce`
  (`af_prog_v1`); `progTodayIx()` exact date else nearest past. Suites against
  boot DEFAULTS pin `af_mw_v1`+`af_prog_v1`. `prog.js` pins the data structurally
  identical to `prog_parsed.json` AND zero text items; `progui.js` the
  picker/fields/Today; `reseed.js` the stamps.
- **A ROW IS ONLY THE ERG WHEN NOTHING SAYS OTHERWISE.** `machineOf` bails on any
  strength qualifier next to "row" (renegade, pendlay, bent-over, single-arm, DB,
  barbell, gorilla…) — otherwise the programme's strength rows get stationed on
  rowing machines, counted by tablets, and grow board columns.
- **`it.text` is DEAD as an authoring path.** The `+ As written` button is gone;
  the textarea branch and `exLines` text render remain ONLY so a stale localStorage
  cfg from builds 306-308 still draws. Nothing may create new text items.
- **Setup carries the programme fields** (`#pgDate/#pgBlock/#pgWeek/#pgDay/#pgType`
  → `cfg.prog`) and the page head carries the programme line (`#evProg`,
  "Block 2 · Week 8 · Friday · 19 Jun 2026") on every surface including the wall.
- **The sheet lies in small ways; trust content, not labels.** Two week headers are
  blank and one is junk ("1.0") — a week EXISTS if its content row has sessions, and
  its NUMBER is its position. The PREVIOUS BLOCK LIBRARY tab is four stacked
  historical blocks (sections split on header rows), not one; column K holds two
  stray sessions past the 8-week grid. First extraction missed 112 sessions to
  these; the count is 334 and `prog.js` pins it.
- **A buy-in is a doorway, not a station.** Part A of the Michael Workout opens with
  "Bike Buy-In · 8/12 cal" — the price of entering the rotation, exactly like the
  down-ups in Part B. `machineOf()` returns null for any name carrying "buy-in"/
  "buy in", so the team is never stationed on it, no tablet counts it, and the board
  does not grow a column of dashes for it; the preset also pins
  `exGear["bike buy-in"]=""` so the allocator never counts the gym's bikes for it.
  Without this, `curTypes` put the bike FIRST and the whole team's calories credited
  to the bike column while the scored run sat at a dash.
- **The 14 house boards ship built-in again** (Omar: "put them back"): `SEED14` is
  the byte-identical pre-deletion snapshot (Full Body, Michael Workout, Send It
  Saturday, Slow It or Send It, Barbell Power, Engine, Hyrox Conditioner, Upper
  Focus 1-5, Lower Focus 1-2), seeded once per device via `af_seed14_v1` AFTER
  `loadProgrammeOnce` (which filters seedV presets — seed before it and the boards
  die on first boot). A board he deletes stays deleted: this seeds, never enforces.
  `prog.js` pins the byte-identity and the picker listing programme + 14.
- **A board loads itself ONCE, and every one-shot flag lives in its OWN KEY** —
  never on a cfg field: a flag riding the cfg is lost the moment the trainer picks
  a different board (picking replaces the cfg wholesale), and the next boot would
  force the seed back over their choice. The boot chain on a fresh device:
  `loadProgrammeOnce` (`af_prog_v1`, deletes seedV boards + loads today's session)
  → SEED14 (`af_seed14_v1`) → `loadSISOnce` (`af_sis2_v1`) loads the scored Send
  It Saturday LAST and wins the screen. `af_mw_v1` is a retired key from the old
  Michael one-shot; suites that pin it are harmlessly stale. `mw.js` gates the
  chain: SIS on first boot, edits surviving reloads, a different pick surviving a
  reload. Suites written against boot DEFAULTS pin `af_prog_v1`+`af_sis2_v1`
  before their first reload; a suite reading card positions in the phone preview
  must read offsetTop/offsetLeft — the preview is ROTATED on an upright phone, and
  screen rects turn columns into rows.
- **THE GYM HAS ONE LIBRARY.** Saved boards ride the AI relay into Cloudflare KV
  (`ai-relay-worker.js` ops `lib.list`/`lib.put`, one KV key, binding `LIB`) so
  every device with the relay link shares them. Merge is last-write-wins per
  board on the entry's own `ts`; entries with no `ts` (pre-sync saves, fresh
  seeds) always lose to the room — which is what lets a wrongly-created copy be
  healed by the real one. Deletes are TOMBSTONES (`libKill`, `af_lib_dead`): a
  board deleted anywhere stays deleted everywhere, and a later save under the
  same name revives it. THE TOMBSTONE CARRIES THE BODY — the recycle bin: a
  delete pushes the cfg along, the room keeps it `BIN_DAYS` (30; the worker
  strips the cfg past that, the tombstone stays so stale devices cannot
  resurrect), `libSync` collects restorables into `libBin`, and Setup lists
  them under the picker ("Deleted boards (N)" → Restore, which unique-ifies if
  the name is meanwhile taken). The tombstone re-push loop must SKIP names the
  room already holds dead, or a bare local tombstone strips the binned cfg. Sync runs at boot +3s, every 5 min, on tab-visible —
  never while the picker's panel is open (rebuilding it mid-tap eats the tap).
  Setup's Delete button shows only for boards actually in the library; deleting
  clears `wkName` but leaves the loaded board on screen. No relay link = fully
  local, silently. `libsync.js` gates the whole loop with the worker contract
  mocked at the network layer.
- **ONE GYM, ONE CLOCK.** Live session sync rides the same relay into D1
  (worker ops `s.get`/`s.put`, binding `DB` — D1 because KV's 60s edge cache
  cannot carry a clock). The device the trainer ACTS on publishes the whole
  session — cfg + run state with the clock anchored to WALL time (`t0e`), so a
  follower that hears seconds late still shows the same countdown; every other
  screen polls every 2.5s and applies via the `setTeamCount` restore pattern
  (rebuild, put state back, `enginePump()`). EVERY CONTROL THAT TOUCHES THE
  CLOCK PUBLISHES — start/reset (buttons), pause, seek ±5/±10, next/prev part
  (tknext/tkprev/bdNext/bdPrev), and the Control round-row jumps; audit
  `startBlock()`/`t0=`/`rot.round=` call sites when adding any new control,
  because one unwired button = a phone a part ahead of the wall (Omar caught
  bdNext). Publish points: `save()` (700ms
  debounce, via TDZ-safe `sessOnSave` — boot migrations call save() before the
  sync lets initialise), and immediate on start/reset/pause/seek (the button
  handlers wrap, `bdStart` clicks `startBtn` so it inherits). Pushes carry
  `kind:"clock"|"edit"`, and A BYSTANDER'S EDITING NEVER KILLS A CLASS: an
  edit-push is refused at the publisher while the room runs a class this device
  is not in (`sessRoomAct`), and refused again at the follower if it would stop
  a session this screen is running — the clock buttons always win. A DEVICE LISTENS
  BEFORE IT SPEAKS: `sessSynced` gates edit-pushes until the first `s.get` has
  answered — a reloaded phone's boot saves must never overwrite the running
  class with stale idle (the store lied to every joiner while running screens
  rightly ignored it); a running screen that hears such an edit re-publishes
  the truth. The echo-drop id (`SESSID`) is PER PAGE-LOAD, never persisted —
  with a device id, the phone that started the class refused its own state
  after a reload ("that's my echo") and stood on READY under a counting TV.
  Apply skips while an input is focused; `livesync2.js` gates the reload
  choreography end to end.
  `?relay=` in the URL stores the relay link — a TV has no keyboard worth
  typing on. Only the rotation clock is shared; no relay link = standalone.
  `livesync.js` gates board-follow, same-second clocks, reset-follow, URL
  relay, and the standalone path.
- **The AI builder speaks the whole model, and the coach's parts are law.**
  `aiSystem()`'s schema must carry every field Setup can author (per-exercise
  `sets`/`each`/`rpe`/`rm`/`note`, item `note`/`fin`, formats, rests) and
  `applyAiWorkout()` must pass them through — a field the schema omits comes back
  as an invented extra block instead (the AI split Part B into "B1"/"B2" because
  it had no `sets` to say two supersets share one part). One named part = ONE
  block, stated outright in the prompt. Saving under a name also SETS `cfg.name` —
  the title every surface shows — or the old board's title sits over the new
  board's parts. **The AI's board arrives SAVED**: `applyAiWorkout()` names it
  (the coach's own name when given, else the AI coins one — the prompt demands
  `workout.name` always), unique-ifies with " 2" instead of overwriting, saves to
  presets + `libPush` and returns the name for the confirmation bubble —
  "Unsaved workout" plus an unfindable rename was the whole confusion.
- **THE WALL READS LIKE THE COACH'S OWN SLIDE (Omar's USB reference, build 337).**
  Coach shorthand everywhere a workout is written: the AMOUNT LEADS the exercise
  ("10 Pendlay Row", "2-4 Pull Ups", "12/8 cal Ski" — `exAmt()`, the word "reps"
  goes without saying), the GROUP HEADING is the timing scheme, never the
  exercise names ("EVERY 3:00 × 3 SETS" when every exercise shares `sets`, which
  then leave the lines — `exTxt/exHtml` take `{noSets}`), and a label that only
  repeats its own exercises is dropped (`nameRedundant()` — every word of the
  name found in an exercise name). Block-level schemes replace the `.win` footer
  when they say it all: `blockEmom()` → "EMOM × 9 MINUTES" with minutes numbered
  1st:/2nd:/3rd: one line each; the single repeated interval → "EVERY 2:30 FOR
  10 MINUTES". Anything shapelier keeps the footer — a scheme that lies is worse
  than none. "Group" is never printed. `wording.js` pins the whole grammar
  against Omar's slide, live NOW slab included.
- **"Max" is a word, so its unit is one too.** `exUnit()` writes the metre suffix tight
  against a number (500m); glued onto Max it read "Maxm". `maxUnit()` spells it out —
  Max metres, Max cal, Max reps, Max seconds.
- **A finisher runs once, after the rounds.** "Four rounds of this, then four minutes
  all together" is on the gym's wall constantly, and a block could only ever repeat ALL
  of its items — so the last piece repeated too, or had to become a block of its own and
  lose its place in the rotation. `it.fin` marks an item as the finish: `roundItems()`
  is what the round loop repeats, `finItems()` runs once after it, `blockLen` adds
  `finLen(b)`, and `segAt` walks the finish when `t` passes the last round. `seg.i` is
  always the index in `b.items`, never in the filtered list. Setup names BOTH states
  outright, in the same shape as Scored directly below it — `.finrow`: "This part:
  [Repeats × N] [Runs once at the end]" — whenever the block has rounds. A glyph
  cannot carry this: a circular arrow reads as undo. An engine flag with no control
  is a workout nobody can build. `finisher.js` gates it.
- **A corrected library board has to reach the copy already loaded.** Loading a preset
  COPIES it into cfg, so fixing the library afterwards changed nothing on screen and
  the trainer had to know to pick it again. `stampSeed()` records `seedFrom`/`seedV`
  and a `seedSig` of the rotation as loaded; on boot `refreshSeeded()` adopts a newer
  library version only while the signature still matches — edit one number in Setup
  and the workout is the trainer's for good. The roster is kept across the swap: the
  people in the room are not part of the board.
- **An unstamped copy is of unknown parentage, so it is nobody's to replace.** Only a
  board PICKED from the library carries a stamp; a cfg that merely shares a `wkName`
  with a preset is just as likely to be the trainer's own work, and adopting on the
  strength of the name threw it away — silently, on the next reload. `refreshSeeded()`
  returns immediately without one. Picking the board again is one tap, and that tap
  is what stamps it.
- **One cfg, one migration pass.** Every config that arrives from anywhere — storage,
  a library board, an import — goes through `migrateLoaded()`, which now owns the
  rotation defaults (`scorers`/`laps`/`blockRest`, per-item `metric`/`scorers`) as
  well as the top-level ones. Boot used to fill them inline in a second, slightly
  different shape, so a picked board was stamped BEFORE its defaults existed: one
  reload later `seedSig` no longer matched and the copy read as edited, which is why
  a corrected board never actually reached it. `reseed.js` gates both.
- **Text fits by SHRINKING, and height counts as fitting.** `fitTbText()` grows the
  work list into whatever room the block leaves and pulls it back until it fits — but
  `over()` only ever compared widths, and `.tk-now` clips its own overflow, so a
  four-part block was simply cut off at the bottom and nothing noticed. It now tests
  `scrollHeight` too. A value that stops exactly at its own edge reads as touching the
  one beside it ("2:11.8 2:10.9 153" ran together), so the fit keeps an 8px gutter. And
  a line box has to contain its own glyphs: `line-height:1` on a 46px display face left
  the descenders outside the box for `overflow:hidden` to clip — the containing ratio
  is a property of the FACE (`--mono` needs 1.16, `--disp` 1.2), and shrinking never
  fixes it because glyph/box is size-invariant. The value fit measures the TEXT with a
  hidden span in the untransformed BODY against the PARENT's content box: a block's
  `scrollWidth` never reads below its own `clientWidth` (the gutter check
  `scrollWidth>clientWidth-8` was true for EVERYTHING and ground the whole tablet to
  12px/9px floors — the tiny type Omar photographed); a flex-centred value
  shrink-wraps so its own box tracks the text; a Range rect is a SCREEN rect that the
  scaled preview shrinks (133px read as 29px); and canvas measureText ignores
  text-transform and tabular-nums. `tickTbVitals()` re-runs the fit when a value it
  patches GROWS ("--:--" fitted, "2:16.2" written); `fitTablet()` re-runs it when the
  kioskon class flips (the `.opt` vitals only exist to measure in kiosk — compare the
  class before/after, a cached flag goes stale when the wall strips it). `tabfit2.js`
  walks phone/sideways/desktop × pre/running × normal/long names × tablet/phone view. `renderTablet()` repaints four times every two
  seconds; a repaint between finger-down and finger-up removes the element and the
  browser fires NO click at all — which is why the name box and the target buttons
  silently did nothing. `#tbScreen` records the last pointer event and `renderTablet`
  returns early for 650ms after it; anything the athlete themselves triggered calls
  `renderTablet(true)` to skip that hold. `tbtap.js` taps at six different points in
  the tick and expects six hits.
- **The class size is editable mid-class.** `setTeamCount()` while running keeps each
  erg's metres/score, rebuilds the floor, then puts `rot`/`t0`/`running` back and
  restarts the rAF loop (`build()` kills it, and the start button's label with it).
  Late arrivals get a lane and a free spot without the clock resetting. `latein.js`
  gates it. `gymFit()` can propose the number from the equipment — one per station,
  min across blocks when together, sum when split — but `cfg.autoCrews` is FALSE by
  default: the trainer sets the number, and "Fit the gym" is one tap in the picker.
- **A leaderboard lane is a STANDING, not an instruction.** It says where each team
  IS (`On Block 1 · Run 1`) and what they have put on each machine, with the score in
  its own column. "Next" belongs on the tablet
  in front of them and in the trainer's NOW/NEXT panel, never on the board. The average
  accumulates `e.wM`/`e.wT` in `frameRotation`, and BOTH must be scaled by `effort` or
  it counts seconds nobody was pulling for. `lanenext.js` gates it.
- **A table has columns.** `--lanecols` is ONE grid template shared by `.board-head`
  and every `.lane`, so a value can never drift out from under its heading — split,
  avg, watts, s/m, score. Their paddings must match too (the padding sets where the
  `1fr` track starts). The TV template is PROPORTIONAL (`%`), not px: `fillTvBoard()`
  lays the board out at whatever width makes it fill the screen, and fixed columns
  give it a floor it cannot go under. Narrow screens drop to who + avg + score,
  scoped `body:not(.tvprev)` — the TV preview is laid out at 1920 and keeps them all.
  `lanecols.js` gates it. When re-scoping a selector, check every rule that matches:
  a blanket `body:not(.bigscreen)` -> `body:not(.tvprev)` also hit
  `#viewBoard .board{display:none}` and hid the whole leaderboard on a real TV.
- **What is being scored is the erg, so the board is a table of ERGS — and nothing
  else.** Watts, stroke rate and the split of this instant are a rowing computer's
  readout: they change four times a second, mean nothing from across a gym, and make
  the board unphotographable. They are GONE from the rotation lane. `e.byType[t]`
  keeps the counters per machine; `machNow()` resolves which erg a crew is on (one
  type on the part is the answer; where a part splits people across ergs the crew's
  own slot in `machSlots()` decides).
- **A station's numbers land when the athlete leaves it.** A total that ticks upward
  while somebody is still pulling is a live readout by another name. The counters run
  continuously but the board reads `e.shown`, published by `publishMach()` when the
  crew changes machine, by `publishAll()` at every block end, and once more when the
  session saves.
- **EVERY FIGURE THE SAME SIZE, IN ITS OWN COLUMN.** A leaderboard is read across, so
  the numbers line up and match: distance, pace and calories for each erg are three
  columns of the same figure (`.mv`, `--mvfs`), and so is the score. The unit is said
  ONCE in the heading (`M` / `500` / `KM` / `CAL`) instead of being shrunk onto every
  row — nothing in the data area is set small. The machine name spans its three
  columns (`.hgrp`, `grid-column:span var(--mspan)`).
- **A leaderboard is a table of results, not a route card.** Where a team is standing
  right now belongs on the tablet in front of them and in the trainer's NOW/NEXT
  panel. On the board it is a line of small print between the name and the numbers,
  and the numbers are the point. The lane has no `.loc` and no progress `.track`;
  every other mode shares that markup, so those writes are guarded.
- **Size first, then how much.** `fitLaneCols()` walks a ladder of (column width,
  figure size) tiers, largest first, and inside each tier tries 3 metrics, then 2,
  then 1. A tier is only taken if its size clears `FLOOR[mk]` (22/26/30 on a TV) —
  a number too small to read from the floor is not information, and a metric dropped
  from a board that had room for it is not either. The tracks live inside the lane's
  own padding, so the width it measures is the LANE's, minus that padding.
  **The rank column fits its own TITLE**: the TV band writes "Rank" at the figures'
  size and the frame's fixed 64px clipped it mid-glyph — `rankNeed()` measures the
  word at the candidate size (hidden span in the untransformed body, letter-spacing
  and case included) and the track takes the larger of frame and title.
- **The leaderboard TV is a SEPARATE screen (Omar): logo, workout name, table —
  nothing else.** `#evSummary` and `#evProg` are display:none on
  `body.bigscreen:not(.mobscreen):not(.wkscreen)` — the chips describe the session
  and the session lives on the WORKOUT screen. Phone view keeps them (browsing
  page, not a wall).
- **OMAR'S HOLD (build 324): the programme + built-in boards are HIDDEN from the
  picker** (`LIBHIDE=true` beside `buildPresetSel`) until he checks how they were
  uploaded — HE WILL ASK FOR THE UNHIDE; it is one flag flip. Only trainer-saved
  boards (no `seedV`) are offered; the Today button rides with the hidden
  programme; NOTHING is deleted (PROG/SEED14/presets intact, `prog.js` still pins
  the bytes). Suites load hidden boards via `window.__loadLib(label)`.
  `killTestSaves` (`af_clean1_v1`, build 325) tombstoned the test-era saves —
  "Previous 1/2 … Send It Saturday", the re-saved "Send It Saturday", "Test
  Workout Michael" — from the SHARED library; the local seedV copies were
  skipped, but the room tombstone outlives them, so THE UNHIDE MUST RE-SEED
  Send It Saturday (a fresh save from SEED14 beats the tombstone).
- **A pace is per something, and the unit is WHATEVER THE MACHINE'S OWN CONSOLE SAYS.**
  `PACE`: a rower and a ski say `/500m`, a BikeErg says `/1000m`, a runner says `/km`.
  Never invent a unit or abbreviate one into something the athlete has to decode —
  `M` over `500` read as neither. The heading spells them: `METRES · /500M · CAL`.
- **A board is not a spreadsheet.** No grid of hairlines and no grey micro-labels:
  the machine wears its name as a CHIP over its own figures, what separates one erg
  from the next is space (`.mv.md` padding) rather than a rule, every team is a card
  (`.lane` with transparent borders so the transform still positions it), the rank is
  a badge that goes accent for the leader, and the score is a filled block filling its
  column. A heading sits over the MIDDLE of what it heads, which is why the score
  block spans its track instead of hugging the edge.
- **A board of zeros says nothing about how it will look.** `cfg.display.demo` (Layout >
  Display > Sample numbers, on by default) draws plausible figures while nothing has
  started — the same every time, since a preview that flickers is not a preview — and
  `demoOn()` is false the instant a session is live, so a real board can never show a
  made-up number. `permach.js` gates both halves.
- **A scoreboard is LIGHT.** A wall of black on black is a screensaver; the erg tablet
  is a white card with black type and it reads from anywhere in the gym, so the board
  is too. `#board` re-declares the ink variables on the TV, which flips names, rules,
  headings and figures together — never restyle them one at a time.
- **A WALL SHOWS EIGHT TEAMS, NOT TWENTY.** Twenty rows on a 1080 screen is a 52px
  row and type nobody can read from the floor. `fitRowH()` keeps the rows above
  `PAGEAT` and, when the class is bigger than that allows, shows a page at a time —
  `showPage()` hides the rest and turns the page every 7s, with `1–7 of 20` in the
  head. The lane's place comes from `data-pos` (the rank it was given), never its DOM
  order, so the pager and the sort cannot disagree. Never fewer than three on screen:
  a phone in full screen has room for one row at the wall's row height, and one row
  blown up to fill the screen is a poster of whoever is winning, not a leaderboard.
- **Measure the room against a picture the lanes are NOT in.** `fitRowH()` took the
  leftover height as `#tvFit.scrollHeight - lanes.clientHeight`, but `.lanes` ANIMATES
  its height (.4s), so every re-fit read a value part-way through the easing and got a
  different answer: the board flipped 4 rows / 3 rows / 4 rows for as long as it was on
  screen, and a class that fitted was paged anyway. It now hides `#lanes` outright for
  the measurement — collapsing it to 0 is not enough, the lanes are absolutely
  positioned and go on overflowing the box into `scrollHeight`.
- **The board is the erg tablet's table (Omar signed this off; do not restyle).**
  Black heading band — both rows, machine names and sub-labels, ONE size shared with
  the figures (`min(var(--mvfs),rowH*.34)`), ruled inside with `rgba(255,255,255,.28)`
  so black-on-black cells keep their borders. Body: every cell white, every cell ruled
  with the tablet's `rgba(10,10,11,.12)` 2px line, zero gap, zero lane padding (head
  and lanes share the template AND the padding or the rules snake). NO COLOUR in the
  table: no tints, no badges, no filled score, no accent — the leader's rank is black
  where the rest are grey, and first place is read off the top of the list. The live
  underline is ink. Figures are GROUPED (`fmtN` → 1,180) everywhere on the board; the
  tier column mins must budget for the comma. The layout rules ride on
  `:where(.lane>div)` / `:where(.board-head>span)` — LOW specificity on purpose, so
  `#board.no-c .mv.mc{display:none}` still wins; a blanket `.lane>div{display:flex}`
  resurrected hidden cells, 15 items landed in an 11-track template and every value
  shifted one column. And `line-height:normal` on the rank: at `line-height:1` the
  display face's box is taller than the line and the scan reads it as a clip.
- **The machine somebody is on shows its total climbing.** `e.shown` is still what a
  finished station publishes, but the erg the crew is on right now reads `e.byType`
  live and is underlined in accent, so a block in progress is not a board of dashes.
  A machine nobody is on keeps the number it was left with.
- **The row fills the board.** Every track a fixed pixel width left the slack piled up
  after the last column as a block of empty white; the metric tracks are
  `minmax(Npx,1fr)` so the figures share it out.
- **A leaderboard gives up ROW HEIGHT before it gives up WIDTH.** Scaling the picture
  down to fit sixteen teams shrinks it sideways too and leaves black bars either side.
  `fitRowH()` shrinks `--rowH` to the room there is (floor 52px) and the type follows
  it (`min(var(--mvfs),calc(var(--rowH)*.34))`), or a squeezed row draws outside its
  own lane. The lanes are placed by transform, so `rowH()` reads the height the lane
  is ACTUALLY drawn at — a hard-coded 92 against a 104px lane overlapped every row.
- **The switches in Layout are the board's columns.** Split/Watts/Rate/Metres were
  switches for a board that no longer exists and changed nothing at all. Layout >
  Board display now offers Distance · Average pace · Calories (the three columns per
  machine, `MK()`) and Sample numbers, and changing one rebuilds the head rather than
  repainting the lanes. `dispsw.js` gates it.
- **The board is the picture people photograph.** The leader takes the accent — left
  bar, tinted row, gold rank and score. The crawling progress bar is off the wall
  entirely. The machine columns are ruled apart so the eye never carries a number into
  the wrong one. On a TV `.wrap` is 1820: a lane is a row of numbers per team and the
  workout board a list of sentences, and 1560 suited neither. `permach.js` and
  `lanecols.js` gate it.
- **The trainer's page names the workout it is driving.** The big screen carries it
  and the tablet carries it, but Control — the page the trainer actually stands on —
  said only how many teams there were, so there was nothing to check the board
  against. `.wknow` heads Control > Session with `cfg.name` and the session's shape
  (blocks · rounds · per team · total), kept in step by `syncTeamCount()`.
  `ctlwk.js` gates it.
- **Everything on the page starts and ends in the same place.** `.foot-in` was capped
  at 980px and centred inside a 1220px column and `.foot-rule` was a gradient fading
  out at 18%/82%, so on any laptop the small print was visibly narrower than the cards
  above it; Control's two cards carried an inline `max-width:560px;margin:auto` and sat
  in the middle of the screen with the nav on the left. Both run the page's own width
  now. `edges.js` walks every tab at four widths and compares the footer, its rule and
  the leftmost card against `.wrap`.
- **The small print is one piece of small print.** `#siteFoot`: hairline, company name,
  then the year and the build as one line in one voice — same face, same size, same
  colour, one at each end. A version set in a wide mono at its own size read as a label
  stuck on afterwards. Hidden on `body.bigscreen`
  and `body.tabkiosk` — a TV and an erg tablet are for the workout. `foot.js` gates it.
- **The Erg Tablet tab opens on the WALL, not on one machine.** "Which erg?" is the
  first question, and the dropdown that used to answer it is hidden by the preview
  (`body.kioskon .tb-selrow{display:none}`) — so there was no way off a machine at all.
  `renderWall()` draws one `.twc` per `claimSlots()` entry in `wallOrder()` (block by
  block, the way the floor is walked): machine, who is on it, where, one short value
  line — never a sentence that gets cut off. Tapping opens that screen (`tbView="one"`,
  `body.tabone`); the back bar carries All screens · the view toggle · ‹ machine ›, and
  a horizontal swipe on `#tbStage` steps the same order (read in SCREEN space — the
  frame is drawn on its side on a phone). A real tablet in landscape (`TBKQ`) skips the
  wall and lands on its own machine. `kioskOn()` and `fitTablet()` both bail while the
  wall is up. Suites that read one machine's screen must call `window.__tbOpen(key)`
  after entering the tab. `tbwall.js` gates it.
- **A phone is held upright.** The tablet's own layout is landscape, and the only way
  to show it big enough to read on a phone is to turn it on its side — which asks the
  trainer to rotate the phone just to look at a machine. So `tbPrev` defaults to
  `innerWidth>=820`: a phone drills in to the portrait layout and `Tablet preview` is
  one tap away in the back bar; anything wide enough for the real 1005x600 frame opens
  on it. `fitTablet()` re-labels the button every time so it cannot go stale, and a
  real tablet in landscape kiosk gets the frame anyway via `TBKQ`. Upright, the id row
  wraps so the occupant keeps its own line — squeezed onto one it ellipsised
  "Nobody yet" down to "N.". The rotated frame is fitted to the PARENT's width minus 3 — at exactly the stage width it rounds
  a pixel past the viewport, and measuring the stage's own width (which `fitTablet`
  sets) shrank the frame 3px on every 400ms tick until it vanished. In phone view the
  target rail is short and wide, so `.tk-pills` turns into a ROW: stacked with
  `flex:1 1 0` its buttons collapsed into each other and printed 500 on top of 600.
  `tbland.js` gates both layouts.
- **The projection URL is a picture, not a page.** Opening `#screen`/`#workout` by URL
  sets `body.tvroute`: no main tabs, no sub-tabs, at ANY width — a TV (or a half
  window) casting the board shows the board. The route is an ENTRANCE, not a state:
  arriving by URL or hashchange keeps it chrome-free (`show._fromRoute`), and ANY
  navigation made inside the app — including clicking the Big Screen tab itself —
  drops the class and the nav returns. Modes on the route switch by hash. On the
  Big Screen TAB the sub-tabs are NAV, not an overlay: in flow under the main tabs,
  same left edge, opacity 1 — never absolutely positioned, never faded. `tvroute.js`
  gates the route; `edges.js` also asserts no visible menu row anywhere is faded and
  that both rows share a left edge.
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
- **The Big Screen tab fills its box the same way full screen does.** `fitTvBoard`
  (shrink a 1820 picture until its HEIGHT fits) left a third of a laptop empty on
  either side of the workout board; the tab now calls `fillTvBoard(view.clientWidth,
  availH)` and full screen differs only in the chrome it drops. Three consequences:
  the filled board scales about `top left` (a box authored wider than its container
  and scaled about `top center` hangs off the right edge); `fitTvBoard` clears
  `f._fill` so the two modes cannot fight over the ResizeObserver; and OUTSIDE
  tvfull the authored width has a floor of `min(cw,1820)` — solve a wide 16:9 TV
  against four short cards and the fixed point lands near 1100, where the longest
  line of work wraps at its own floor size. Full screen keeps the free floor
  (edge-to-edge is its contract, `fsfill` holds it); the tab centres its slack.
  The main tabs stay visible on the Big Screen tab (`opacity:1`) — only `tvfull`
  drops the chrome, and that is the mode to cast from.
- **Full screen FILLS the screen, edge to edge.** `body.tvfull` drops the 1920x1080
  conceit entirely: `#viewBoard` is sized to the real viewport (turned on its side
  when the device is held upright) and `fillTvBoard()` picks the width the board is
  *authored* at — `W = cw * H(W) / ch` — so the uniform scale lands on exactly
  cw x ch. Wider than the screen means it scales down, narrower means it scales up;
  either way there are no black bands on either axis. Fitting inside a fixed frame
  (`fitTvBoard`) is for the *preview* only. `fsfill.js` asserts ≥94% coverage on both
  axes and nothing painted outside, on 1920/2560/3840 TVs and phone both ways.
