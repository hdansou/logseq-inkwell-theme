# Marketplace submission

Files for the pull request to [logseq/marketplace](https://github.com/logseq/marketplace): copy this folder's `manifest.json` and `../assets/icon.png` to `packages/logseq-inkwell-theme/` in a fork, then open the PR.

Before that:

- set `repo` to the real `owner/repo` (it is `OWNER/…` until the GitHub home is chosen; `npm test` fails on the placeholder once `package.json` has a `repository`)
- publish a release first (`git tag vX.Y.Z && git push --tags`), so the zip the installer downloads exists

`effect` is left off on purpose: a theme-only package runs no code, and the marketplace asks plugins not to enable it without need.
