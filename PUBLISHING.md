# Publishing v1.3.1

The project is distributed through a public GitHub Release with prebuilt tarballs. npm publication is not part of this release flow.

1. Confirm redistribution permission for every third-party visual asset listed in `THIRD_PARTY_ASSETS.md`.
2. Run `npm install` and `npm run verify`.
3. Commit and push the release source, then create and push tag `v1.3.1`.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/deploy-github-release.ps1` to create the GitHub Release assets.
5. On a clean Windows profile, run `powershell -ExecutionPolicy Bypass -File scripts/test-github-tgz.ps1`.
6. Verify the GitHub Release reports `1.3.1` and is marked latest.

Public installation URL:

```text
https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```
