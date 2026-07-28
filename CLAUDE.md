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
- TVs load `#screen` / `#workout` and must always start in TV mode; the Big Screen
  tab on a phone defaults to phone view (`scrFit`).
