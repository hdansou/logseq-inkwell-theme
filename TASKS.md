# Tasks

Status: `[ ]` todo · `[~]` in progress · `[x]` done. Newest decisions at the bottom of each section.

## v0.1.0 — first release

- [x] T01 Verify selectors and variables against Logseq source (master 9c18a5432b) — done in eng-documentation session 2026-09-29
- [x] T02 Validate live on app.logseq.com 2.0.1 (light, dark, accents logseq/tomato/blue/none) — 4 fixes folded in
- [x] T03 Build the Theme-Lab human test graph and open it in Logseq-DB.app
- [x] T04 Scaffold repo: theme file, package.json (plugin theme, both modes → one file), README, LICENSE, CHANGELOG
- [x] T05 Structural tests (`node --test`): activation selector, shui channel format, full scales, no dead selectors, balanced braces
- [x] T06 Move the Theme-Lab generator into `tools/theme-lab/` and add `npm run lab`
- [x] T07 Docs: design tokens (docs/DESIGN.md), testing (docs/TESTING.md), release checklist (docs/RELEASE.md)
- [x] T18 Live-validate Inkwell Slate on app.logseq.com 2.0.1 (2026-09-29): 0 failures across light, dark and 4 accents after 3 fixes (callout icon fill, keycap specificity, round calendar days). Hover preview not triggerable by automation → Theme-Lab.
- [x] T19 (shipped 2026-10-03) Pink highlight distinct from red: --ink-hl-pink light #f9d4e6 (rose, hue ≈330°), dark #57203f (plum); red stays #ffdcd9 / #5a2422. Tests: hue ≥ 20° apart, label text ≥ 4.5 on pink
- [x] T20 Feedback (2026-10-01): tag-table filter list — hovered option barely highlighted in dark mode. Fixed with `--ink-hover`; first teal (#405454) judged too teal, now neutral grey (dark #404244, 1.38:1 on the popover; light #dcdee1). Root cause found live on app.logseq.com: core `#ui__ac-inner .menu-link.chosen` (1,2,0) and `.cp__select-main .menu-link.chosen` beat the theme rule; now matched. Verified hover + arrow keys, light + dark, and the Base UI dropdown across menu-link, Base UI menu/select items and cmdk; test added
- [x] T21 Feedback (2026-10-02): plugins toolbar menu and header "…" menu, hovered item invisible in dark mode. Cause: with a non-default accent, shui.css paints `html:not([data-color=logseq]) .ui__dropdown-menu-item:focus` (0,3,1) with `--lx-gray-04`, which equals `--ink-float` (#2c2c2e) in dark. Overridden, and the themes dialog rows (`.cp__themes-installed .it`, `bg-accent-01`) too; test `CORE_HOVER_OVERRIDES` added. Not yet verified live (Chrome extension disconnected)
- [x] T22 (2026-10-02; owner confirmed in the desktop app 2026-10-03) Re-spaced scales. Dark grey 04-07 #3f3f42/#47474a/#4f4f52/#5a5a5d (04 now 1.31:1 on the popover, was 1.00), dark accent 01-07 lifted above the page (01 #252e2e, was #111a1a, darker than the page), light grey 04/05 #e3e3e8/#dcdce1, light accent 01/02 #f1f6f6/#e8f0f0. Scale contract tests added. Original note: the dark scale itself puts `--lx-gray-04` = popover colour and `--lx-accent-01/02` darker than the page, so any core hover using those steps vanishes or darkens (e.g. ghost-button hover `bg-accent-01` under a non-default accent). Consider re-spacing the dark grey/accent scales (needs a live pass)
- [x] T23 (owner confirmed in the desktop app 2026-10-03) Flashcard rating colours (Anki convention): Again red, Hard orange, Good green, Easy blue, as palette `-soft` fill + `-text` colour (AA ≥ 4.5:1 in both modes). Root cause of the grey buttons: the theme's outline-button rule (`.ui__button.as-outline`) hid core's per-rating colours. `#card-answers` stays neutral
- [x] T08 Owner's Theme-Lab pass (closed 2026-10-03; findings fixed in T20, T21, T22, T23)
- [x] T26 (verified live 2026-10-03: stock Logseq stacks at 380px block width; with the theme chips stay on the title line at 420px sidebar, stack below 360px) Tag chips drop below the title in hover previews and the narrow right sidebar. Cause: core `@container (max-width: 600px) { .block-row { flex-col } }` (block.css:1093). Fix: keep the row layout down to 360px of block width, stack below that. Option C (hide `#Task` chip in previews): won't do (owner, 2026-10-03). Logseq hides a tag natively when the tag has `:logseq.property.class/hide-from-node` set (block.cljs tags-cp)
- [x] T27 (shipped 2026-10-03; owner confirmed in the desktop app; live-verified without `!important`: long rows 61px, 3 lines; 155-row scan 0 gaps/overlaps, last row reachable) Table view: full text wrap in the Name column, rows grow with the text. Core caps rows, row wrappers and cells at 33px (table.css:37/46/99, `views.cljs:2761` `:fixed-item-height 33`). Live-verified 2026-10-03 on a 155-row table ("Long Table Test" page in the `InkWell-Lab` web graph, kept for future table checks): no gaps/overlaps, all rows reachable. Replaces option D (2-line clamp)
- [x] T28 (fixed by T32, 2026-10-03) Known quirk of T27: in long tables a jump from top to bottom landed ~2 rows short on the first scroll. Real cause: the list never measures rows (see T32), not a late re-measure
- [x] T30 (owner confirmed in the desktop app 2026-10-03) Image assets: default display width 640px (core falls back to 250 when an image has no saved size, block.cljs:1236, rendered as <img width="250"> by image.cljs). Rule scoped to blocks; resized images keep their width; known: 250→640 jump while loading (placeholder inline style), and an image deliberately resized to exactly 250 also shows at 640
- [x] T31 (shipped 2026-10-03; owner confirmed default fill, uploaded fill and resize in the desktop app) Videos: default-sized embeds and uploaded videos (inline width 560px) fill the block width; resized videos keep their width. Note: app.logseq.com '2.0.1' renders the pre-#12782 embed (`iframe.aspect-video`), so it can't test this; desktop 8ffbb22 has `.video-embed-frame`
- [~] T32 (shipped 2026-10-03; awaiting owner check in the desktop app) Table rows taller than 33px (a `url` cover image, owner report with a screenshot; also T27 wrapped titles) overflowed the table: the row grew but the image ran under "+ New" and was clipped by a scroll box inside the table. Cause: `:fixed-item-height 33` (views.cljs:2762) makes react-virtuoso skip row measurement and write the scroller height inline as rows x 33px; `.ls-table-rows` has `overflow-x: auto`, so it also clips vertically. Fix: scroller `height: auto !important`, viewport `position: relative; height: auto` (inline styles, hence `!important`). Live-verified on desktop 2.0.1, throwaway graph `Inkwell-Cover` (Book tag, 154 rows, covers on every 5th): before, footer 161px above the last row bottom and 124px of inner scroll; after, footer flush below the last row, no inner scroll, 19-step scroll scan with 0 gaps/overlaps, one jump to the bottom reaches the last row (was 3 short). All pages table unchanged (33px rows)
- [ ] T24 Community feedback round after release (owner)
- [~] T09 Marketplace assets: `assets/icon.png` (done), screenshot(s) light + dark (todo)
- [ ] T12 Load as an unpacked plugin in Developer mode; confirm both themes register and apply (no `main`, no `effect` key: theme-only package, LSPlugin.core.ts:1038)
- [ ] T10 Release: version bump, CHANGELOG date, tag v0.1.0 (push only when the owner says so)
- [ ] T11 Marketplace submission (manifest PR to logseq/marketplace) — owner decision

## v0.1.0 — rename to Inkwell + variant layout (2026-09-29)

- [x] T13 Tests first: every generated `themes/inkwell-*.css` passes the contract; each palette defines every `--ink-*` token `src/base.css` uses (light and dark); `themes/` matches a fresh build; `package.json` registers each variant × {light, dark}
- [x] T14 Split the single theme file into `src/base.css` + `src/palettes/slate.css`; token prefix `--ink-*`
- [x] T15 `build.mjs`: palette + base → `themes/inkwell-<variant>.css`, and sync `package.json` `logseq.themes`
- [x] T16 Lab: `--variant` option; test content names Inkwell
- [x] T17 Rename across README, CHANGELOG, docs, package; update the eng-documentation walkthrough, the theme skills and memory

## Production-hardening pass (2026-09-30)

Punch list agreed with the owner; applied in the recommended order.

- [x] M1 `tools/package.sh` + `npm run package`: release zip with files at the root (matches the published logseq-dev-theme zip); `.github/workflows/publish.yml` on `v*` tags checks tag == version, tests, attaches the zip
- [x] M3 `marketplace/manifest.json` draft (`theme`, `web`, `supportsDB`, `supportsDBOnly`; no `effect`) + test keeping it in sync with package.json
- [x] E1 `.github/workflows/ci.yml` runs `npm test` on push/PR
- [x] E2 `.gitignore`: dist/zip, feedback/, env, editors, agent dirs
- [x] C1/C2 README: Compatibility section (DB only, 2.0.x, web + desktop) with honest verification wording; package/CI notes
- [x] M2 Light + dark screenshots (`assets/screenshots/inkwell-slate-{light,dark}.png`, 1440×757) from app.logseq.com 2.0.1, `InkWell-Lab` web graph, showcase page "Weekly Review"; shown in the README; test requires them; included in the release zip
- [x] B1 WCAG AA text contrast: `TEXT_PAIRS` (31 text/background pairs, translucent fills composited onto the page) ≥ 4.5:1 in both modes. All pass; tightest: light label-2 on sidebar 4.54, dark label-2 on popover 4.85. Mutation-checked
- [x] T25 (shipped 2026-10-03, owner approved after a Chrome preview) Light-mode icon colours: green #34c759 → #1f9a40 (page 3.65, TIP fill 3.26), orange #ff9500 → #c96a00 (page 3.79, WARNING fill 3.38). Test: icons ≥ 3:1 on page and callout fill, both modes
- [ ] T29 Light-mode red CAUTION icon #ff3b30 is 2.95:1 on its fill (page 3.55). Candidate #f2352a (page 3.95, fill 3.28). Needs owner approval; then add 'red' to ICON_COLOURS
- [ ] B2 Distinct pink highlight (= T19) (step 3, optional)
- [ ] M4 GitHub home: `repository` in package.json, real `repo` in the manifest, push (owner)

## Security audit (2026-10-01)

Overall risk LOW: the shipped package is CSS only (no JS, no `effect`, no `@import`/`url()`), there are no npm dependencies, and no secrets are in files or history.

- [x] SEC-001 (medium) `lab.sh --rebuild` could `logseq graph remove` any graph named by `LAB_GRAPH`; now only `Theme-Lab`, `Theme-Lab-*`, `Inkwell-*` (alphanumerics and `-`)
- [x] SEC-002 (medium) GitHub Actions pinned to commit SHAs (checkout v4.4.0, setup-node v4.4.0, action-gh-release v2.6.2); `persist-credentials: false`; Dependabot keeps pins current
- [x] SEC-003 (low) `ci.yml` declares `permissions: contents: read`
- [x] SEC-004 (low) palette `@variant`/`@description` validated (`checkMeta`) so a palette can't close the header comment and inject CSS; tests added
- [x] SEC-005 (low) `--variant` / `LAB_VARIANT` limited to `[a-z0-9-]` (shell uses POSIX classes: `a-z` ranges match capitals under macOS sh locale collation)
- [ ] When public: GitHub tag protection rule for `v*` so only the owner can trigger a release (owner)

## Decisions

- Name: **Inkwell** (no clash among 628 marketplace packages or on GitHub, checked 2026-09-29). Variants are palettes: Slate first; Blue and Mono planned.
- Each variant ships as ONE self-contained file (Logseq loads one stylesheet per theme; custom.css can't import), so `themes/` is generated from `src/base.css` + `src/palettes/<variant>.css`.
- One CSS file serves both modes: palette tokens on `:root` / `html[data-theme="dark"]`, mapping on `html[data-theme][data-color]` (+ `body`) to beat core's `[data-color]` rules. The same file is registered twice in `package.json` (light + dark) and doubles as `custom.css`.
- `!important` only where core uses it or sets the value through a utility class; each one is commented.
