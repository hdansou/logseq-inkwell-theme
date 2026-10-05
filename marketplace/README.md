# Marketplace submission

Files for the pull request to [logseq/marketplace](https://github.com/logseq/marketplace): copy this folder's `manifest.json` and `../assets/icon.png` to `packages/logseq-inkwell-theme/` in a fork, then open the PR.

Before that:

- `repo` is `hdansou/logseq-inkwell-theme`; `npm test` checks it matches `repository` in `package.json`
- publish a release first (`git tag vX.Y.Z && git push --tags`), so the zip the installer downloads exists

`effect` is left off on purpose: it is for plugins that inject UI or run code at the app level, which the marketplace asks plugins not to enable without need. From the next release the package has a `main` (`index.html`, the tweet sizing script, see docs/DESIGN.md › Tweets), so it is no longer theme-only: say so if a reviewer asks.
