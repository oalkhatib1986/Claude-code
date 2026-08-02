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
2. Run the suites the change can actually affect (see below), all green.
3. Commit + push to `claude/gym-erg-leaderboard-pyztry` from the repo root.

Omar tests on https://oalkhatib1986.github.io/Claude-code/app.html. Do NOT publish
a Claude artifact — he never opens it, and it is one more permission prompt.

## Which suites to run

There are ~41 suites and a full sweep is 8-10 minutes, so it is not the default.
Run the ones the change can reach, plus `test_fitall.js` for ANY layout change:

- board/lane/columns -> `lanecols` `lanenext` `livebd` `tvfit` `fsfill`
- tablet -> `claim` `tbland` `tbtap` `steady`
- setup/exercise fields -> `stnfield` `fmtalign` `rm1` `freshex` `amtrange`
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
- **Leaving the Erg Tablet tab takes the kiosk with it.** `body.kioskon` strips the
  page's padding and pins a 1005x600 frame; left on after `show()` moved to another
  tab it warped every other page and the nav drifted out from under the taps. `show()`
  removes `kioskon`/`tabprev`/`tabwall`/`tabone` whenever `which!=="tablet"`. The stage
  is `touch-action:pan-y` so a sideways drag walks the row instead of becoming the
  browser's back-swipe.
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
- **The class library ships with the gym's own boards.** `seedLibrary()` seeds
  `af_presets_v1`; bump the `seedV` on EVERY entry when adding one, and gate the
  early return on that same number, or existing users never see the new workout.
  `W()` is a solo/unscored board, `WT(name,size,...)` a team one with a scored piece.
  "Send It Saturday" is the shape to copy for a swap board: one block per part, four
  rounds of a Pair 1 / Pair 2 group, then a scored `fin:true` finish. The class is
  SPLIT across the parts (`together:false`) and rotates. `sis.js` gates it.
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
  the descenders outside the box for `overflow:hidden` to clip. `tabfit2.js` walks
  phone/sideways/desktop × pre/running × normal/long names × tablet/phone view. `renderTablet()` repaints four times every two
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
  the board unphotographable. They are GONE from the rotation lane. What it carries is
  what each team DID on each machine — distance, the pace they held, calories — plus
  the score. `e.byType[t]` keeps the counters per machine; `machNow()` resolves which
  erg a crew is on (one type on the part is the answer; where a part splits people
  across ergs the crew's own slot in `machSlots()` decides).
- **A station's numbers land when the athlete leaves it.** A total that ticks upward
  while somebody is still pulling is a live readout by another name. The counters run
  continuously but the board reads `e.shown`, published by `publishMach()` when the
  crew changes machine, by `publishAll()` at every block end, and once more when the
  session saves. The machine they are on right now says `On it` — never a
  half-finished total.
- **A pace is per something, and the something depends on the machine.** `paceOf()`:
  row and ski per 500m, a bike per 1000, a runner per kilometre. `2:57.0/km` for a
  runner and `1:28.5/500` for a rower, on the same row.
- **The room left over belongs to the numbers.** With the name column as the only
  flexible track it swallowed everything a wide screen had spare — a third of the board
  was empty between "TEAM 2" and the first figure, and the figures were squeezed into
  what was left. The name gets `W.who` px and every machine column is a
  `minmax(Wpx,1fr)`, so the slack is shared by the values. `fitLaneCols()` reads the
  BOARD's own width, never the parent's: `#tvFit` still carries the width the last fit
  authored, and a stale number lets the tracks overflow a phone.
- **Read from across the gym.** The board is scaled to fill the screen, so what makes a
  number big is not its pixel size but its share of the row: distance and score are the
  headline (46/56px against a 104px row), the pace-and-calorie line serves under it.
- **A board of zeros says nothing about how it will look.** `cfg.display.demo` (Layout >
  Display > Sample numbers, on by default) draws plausible figures while nothing has
  started — the same every time, since a preview that flickers is not a preview — and
  `demoOn()` is false the instant a session is live, so a real board can never show a
  made-up number. `permach.js` gates both halves.
- **Only the columns that fit.** `fitLaneCols()` owns `--lanecols` for the head AND
  the lanes together — it tries each size set from TV down and only a screen too
  narrow to carry the machines at all falls back to who + score. A heading and its
  values are hidden by the SAME `no-*` class, or a number ends up under someone
  else's title. Never put a `--lanecols` in a media query: CSS cannot count the ergs.
- **The board is the picture people photograph.** The leader takes the accent — left
  bar, tinted row, gold rank and score. The crawling progress bar comes off the wall
  (`body.bigscreen .lane .track{display:none}`) because it is a live element on a
  board that has none. The machine columns are ruled apart so the eye never carries a
  number into the wrong one. The score heading is one word — the unit rides with the
  number ("9 CAL"), and "TOTAL MAX-CAL SCORE" ellipsised itself to "TOTAL MAX-C…".
  On a TV `.wrap` is 1820: a lane is a row of numbers per team and the workout board a
  list of sentences, and 1560 suited neither. `permach.js` and `lanecols.js` gate it.
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
