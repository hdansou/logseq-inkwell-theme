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
- [ ] T19 Design call: pink background maps to `--ink-hl-red` (identical to red); the block context menu's colour swatches show Logseq's saturated colours, not the palette's paler ones
- [x] T20 Feedback (2026-10-01): tag-table filter list — hovered option barely highlighted in dark mode. Fixed with `--ink-hover`; first teal (#405454) judged too teal, now neutral grey (dark #404244, 1.38:1 on the popover; light #dcdee1). Root cause found live on app.logseq.com: core `#ui__ac-inner .menu-link.chosen` (1,2,0) and `.cp__select-main .menu-link.chosen` beat the theme rule; now matched. Verified hover + arrow keys, light + dark, and the Base UI dropdown across menu-link, Base UI menu/select items and cmdk; test added
- [x] T21 Feedback (2026-10-02): plugins toolbar menu and header "…" menu, hovered item invisible in dark mode. Cause: with a non-default accent, shui.css paints `html:not([data-color=logseq]) .ui__dropdown-menu-item:focus` (0,3,1) with `--lx-gray-04`, which equals `--ink-float` (#2c2c2e) in dark. Overridden, and the themes dialog rows (`.cp__themes-installed .it`, `bg-accent-01`) too; test `CORE_HOVER_OVERRIDES` added. Not yet verified live (Chrome extension disconnected)
- [x] T22 (2026-10-02; owner confirmed in the desktop app 2026-10-03) Re-spaced scales. Dark grey 04-07 #3f3f42/#47474a/#4f4f52/#5a5a5d (04 now 1.31:1 on the popover, was 1.00), dark accent 01-07 lifted above the page (01 #252e2e, was #111a1a, darker than the page), light grey 04/05 #e3e3e8/#dcdce1, light accent 01/02 #f1f6f6/#e8f0f0. Scale contract tests added. Original note: the dark scale itself puts `--lx-gray-04` = popover colour and `--lx-accent-01/02` darker than the page, so any core hover using those steps vanishes or darkens (e.g. ghost-button hover `bg-accent-01` under a non-default accent). Consider re-spacing the dark grey/accent scales (needs a live pass)
- [x] T23 (owner confirmed in the desktop app 2026-10-03) Flashcard rating colours (Anki convention): Again red, Hard orange, Good green, Easy blue, as palette `-soft` fill + `-text` colour (AA ≥ 4.5:1 in both modes). Root cause of the grey buttons: the theme's outline-button rule (`.ui__button.as-outline`) hid core's per-rating colours. `#card-answers` stays neutral
- [x] T08 Owner's Theme-Lab pass (closed 2026-10-03; findings fixed in T20, T21, T22, T23)
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
- [ ] M2 Light + dark screenshots in `assets/screenshots/`, shown in the README (step 2)
- [~] B1 WCAG contrast tests: text tokens ≥ 4.5:1 on every surface they sit on, both modes
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
