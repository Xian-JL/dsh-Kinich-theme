# Publishing v1.1.0 via GitHub Releases

The project distributes prebuilt npm tarballs through public GitHub Release assets. npm publishing is not required.

1. Confirm redistribution permission for every third-party visual asset listed in `THIRD_PARTY_ASSETS.md`.
2. Run `npm install` and `npm run verify`.
3. Run `powershell -ExecutionPolicy Bypass -File scripts/deploy-github-release.ps1`.
4. On a clean Windows profile, run `powershell -ExecutionPolicy Bypass -File scripts/test-github-tgz.ps1`.
5. Verify the DSH Web UI, Ajaw balance states, and Jungle motion before marking the release final.

Public installation URL:

```text
https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```
