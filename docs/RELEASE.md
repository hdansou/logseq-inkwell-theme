# Release checklist

1. `npm run build`, then `npm test` passes.
2. Live check (docs/TESTING.md §2) on the current Logseq release, in light, dark and one other accent colour.
3. Theme-Lab pass: `npm run lab -- --rebuild` (snapshot feedback first), walk the checklist, fix what it turns up.
4. Load the folder as an unpacked plugin (Developer mode). Confirm every variant appears under Themes as **Inkwell <Variant> Light** and **Inkwell <Variant> Dark**, and each applies.
5. `assets/icon.png` exists, plus light and dark screenshots for the README and marketplace listing.
6. Bump `version` in `package.json` and run `npm run build` (the version is stamped into each theme header). In `CHANGELOG.md`, date the release section and open a new `[Unreleased]`.
7. Update the "Verified against" line in the header template in `build.mjs` to the Logseq version you tested, then `npm run build`.
8. `npm run package` and inspect `dist/*.zip`: it should hold `package.json`, `themes/`, `assets/icon.png`, README, LICENSE, CHANGELOG, and the screenshots.
9. Commit `chore(release): vX.Y.Z` and tag `vX.Y.Z`. Pushing the tag runs `.github/workflows/publish.yml`, which checks that the tag matches `package.json`, runs the tests, and attaches the zip to a GitHub release. Push only when the owner decides to publish.
10. Marketplace: follow `marketplace/README.md` (set the real `repo`, then open the PR with `manifest.json` + `icon.png`).
