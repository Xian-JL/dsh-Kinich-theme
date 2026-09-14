# Publishing v1.0.0

Technical release sequence for the maintainer.

1. Confirm redistribution permission for every third-party visual asset listed in `THIRD_PARTY_ASSETS.md`.
2. Confirm the npm package name `dsh-kinich-theme` is available/owned by the maintainer.
3. Run `npm install` and `npm run verify`.
4. Run `npm pack --dry-run` and inspect the payload.
5. Publish to npm as `dsh-kinich-theme@1.0.0`.
6. Install from npm through `dsh plugin --profile web add dsh-kinich-theme@1.0.0`.
7. Push the release commit/tag to GitHub and create GitHub Release `v1.0.0`.
8. Add repository discovery metadata/topics and submit to DSH community catalogs if desired.
