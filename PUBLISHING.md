# Publishing

The current published baseline is Kinich Theme `1.7.1`. The deployment script creates GitHub Release tarballs and does not run `npm publish`; npm publication, if ever requested, is a separate action.

Before preparing a new public release:

1. Confirm each bundled third-party image's author, redistribution terms, modification rights, and required credit. Record the evidence in `THIRD_PARTY_ASSETS.md`. A source URL or this checklist alone is not permission.
2. Run `npm run verify` and install the packed candidate into a clean, isolated DSH profile.
3. Record the target DSH version, Windows build, visual/interaction checks, and any performance sample in a dated validation record. Automated compatibility fixtures do not prove Desktop visual acceptance.
4. Update `package.json`, `CHANGELOG.md`, and `RELEASE_NOTES.md` to the reviewed version and confirm the packed file list contains no source originals or temporary files.
5. Review the exact commit and worktree before invoking the release script.

`scripts/deploy-github-release.ps1` builds and packs the current package, creates versioned/latest GitHub Release tarballs and checksums, stages and commits repository changes, pushes the current branch and a version tag, then publishes the Release. Running it is a public publication action; only use it after the checks above are complete and the exact version is approved.

The GitHub Release installation URL is:

```text
https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```
