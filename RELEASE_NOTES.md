# Kinich Theme v1.3.1 — Click Burst Visibility Hotfix

Release candidate hotfix for the v1.3 presentation-only upgrade. Host, balance, session, settings, and DSH action behavior remain on the verified v1.2.2 contract.

## Highlights

- Continuous Kinich and Ajaw transitions between conversation and welcome compositions
- Temporary welcome-page Ajaw docking and orientation without overwriting user settings
- Automatic closing of an already-open balance popover when entering the welcome page
- High-refresh, bounded Web Animations click feedback with no overlay rerender per click
- Unified Jungle presentation and a real packaged-character settings preview
- Preserved multi-session, balance, low-balance, workspace, and DSH compatibility contracts
- Fixed the v1.3.0 click burst being clipped to a 1 px point by an accidental paint-containment rule

## Install

```powershell
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```

Then:

```powershell
dsh web
```

## Compatibility

- DeepSeek Harness Web: `0.1.5-rc.1`, `0.1.5-rc.2`, or `0.1.6-alpha.2`
- Node.js: `^22.19.0 || >=24.0.0`

## Important asset notice

The MIT license covers the original plugin code and documentation only. The runtime bundle contains processed third-party visual materials documented in `THIRD_PARTY_ASSETS.md`. Public redistribution rights for those materials must be confirmed separately before publication.
