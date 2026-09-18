# Kinich Theme v1.2.1 — Workspace Interaction Hotfix

Hotfix for the published `v1.2.0` interaction layer.

## Highlights

- Restores workspace switching from the welcome-page selector
- Restores conversation creation from workspace-row add buttons
- Runs decorative click feedback only after DSH Host actions finish
- Preserves all v1.2.0 visuals, Ajaw balance behavior, and session feedback

## Install

```powershell
dsh plugin --profile web add "https://github.com/Xian-JL/dsh-Kinich-theme/releases/download/v1.2.1/dsh-kinich-theme-1.2.1.tgz"
```

Then:

```powershell
dsh web
```

## Compatibility

- DeepSeek Harness Web: `0.1.5-rc.1`
- Node.js: `^22.19.0 || >=24.0.0`

## Important asset notice

The MIT license covers the original plugin code and documentation only. The runtime bundle contains processed third-party visual materials documented in `THIRD_PARTY_ASSETS.md`. Public redistribution rights for those materials must be confirmed separately before publication.
