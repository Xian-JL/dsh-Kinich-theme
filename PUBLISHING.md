# Publishing v1.2.2

The project publishes to npm through its configured GitHub Actions OIDC trusted publisher and also attaches prebuilt tarballs to a public GitHub Release.

1. Confirm redistribution permission for every third-party visual asset listed in `THIRD_PARTY_ASSETS.md`.
2. Run `npm install` and `npm run verify`.
3. Commit and push the release source, then create and push tag `v1.2.2` to trigger the trusted-publisher workflow.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/deploy-github-release.ps1` only when creating the GitHub Release assets manually.
5. On a clean Windows profile, run `powershell -ExecutionPolicy Bypass -File scripts/test-github-tgz.ps1`.
6. Verify npm reports `1.2.2` and the GitHub Release is marked latest.

Public installation URL:

```text
https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```
