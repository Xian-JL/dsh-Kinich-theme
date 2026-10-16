# Publishing

## Metadata releases and npm migration (2026-10-16)

The user selected local RC.2 compatibility and the proposed Kinich 2.0.2 / Xiao 1.2.1 revisions. Publish registry metadata with `>=0.2.0-rc.2 <0.3.0` for host/settings peers, then replace file dependencies through the market's npm installation chain. Preserve saved settings and wallpaper data, and distinguish catalog indexing delay from installed registry source. This instruction raises the Kinich ceiling only to 2.0.2.

## Authorized maintenance release 2.0.1 (2026-10-14)

The user reported three Desktop UI defects and explicitly authorized fixing and publishing 2.0.1 without another publication-permission request. Specification 1.0.6 and PATCH-2.0.1 raise the authorized ceiling to 2.0.1 only. Use GitHub latest and npm latest with the checked maintenance tarball. Targeted settings/renderer/headless popup checks and packed isolation supplement the reported defects; host verification remains 0.2.0-rc.2. The historical instructions below do not replace this authorization.

## Confirmed 2.0.0 release (2026-10-14)

The user completed final review and explicitly authorized GitHub/npm publication as 2.0.0. Package release stage is now `confirmed`; use npm `latest` and a non-prerelease GitHub Release marked latest. Specification 1.0.5 records this confirmation. The verified Desktop host remains 0.2.0-rc.2; stable-host verification is not implied by the plugin's final version. Candidate instructions below describe historical releases.

Use the targeted checks and exact packed installation already defined for the accepted implementation. Do not invoke the legacy full regression command or reinstate cancelled gates. Publish the checked tarball, preserve source/history/evidence during cleanup, then wait ten minutes before downloading npm latest to verify the final distribution.

## Complex-wallpaper candidates (2026-10-13)

The current candidate is `2.0.0-alpha.12`; final `2.0.0` remains reserved. Publish prereleases to npm `next`, and create GitHub releases with `--prerelease --latest=false`. Do not replace the stable npm/GitHub latest channels with a candidate. DSH Desktop remains `0.2.0-rc.2`, not a confirmed stable 0.2.0 environment.

Specification 1.0.3 and the user's accepted/cancelled gates govern this candidate. Use build/check/version, settings writes, wallpaper switch/store persistence and renderer checks, plus installation of the exact packed tarball in a clean isolated Profile. Do not reinstate cancelled multi-size, long-running, performance or dedicated interaction/regression requirements through the legacy `verify` command below. Local Desktop captures and Profile records in `docs/wallpaper-reference/` stay outside Git; sanitized candidate status is in `docs/CANDIDATE_ALPHA12.md`.

The legacy deployment script below always marks a GitHub release latest and is not suitable for this prerelease. This candidate is pushed and published using explicit commands and the exact checked tarball. The user explicitly authorized this GitHub/npm publication; final stable-version confirmation remains separate.

## Historical stable publication procedure

The current published baseline is Kinich Theme `1.7.2`. The deployment script creates GitHub Release tarballs and does not run `npm publish`; npm publication remains a separate action.

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
