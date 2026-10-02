# Kinich Theme v1.7.1 — Reliability Update

Kinich 1.7.1 strengthens settings, balance and desktop interaction behavior while preserving all 1.7 visual and dynamic effects.

## Changes

- Balance checks now track the active API credential, invalidate old-account data after provider configuration changes, and respect the provider's rate-limit deadline, including manual refresh. Both settings and the Ajaw bubble give a localized retry estimate.
- DSH 0.2 multi-field settings changes use one atomic namespace mutation. Older settings services attempt rollback and report when recovery is incomplete.
- Session selection light stays within the session tree. Immersive parallax responds to container resizing and to reduced-motion preference changes after the page loads.
- Ajaw announces its dialog relationship to assistive technology; keyboard adjustment of settings sliders commits after a short pause.
- All existing animations, appearance choices and visual assets remain available. No settings migration is required.

## Install

Open Desktop once to initialize its profile, then fully quit it. Install into the Desktop profile using its bundled DSH CLI:

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```

For the Web profile:

```powershell
dsh plugin --profile web add dsh-kinich-theme@latest
dsh web
```

GitHub Release fallback:

```powershell
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```

Use the CLI bundled with the intended DSH installation if the global `dsh` command points to an older version. Restart that DSH instance after installation.

## Compatibility

- DeepSeek Harness Web / Desktop: `^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2`
- Node.js: `^22.19.0 || >=24.0.0`

The MIT license covers original plugin code and documentation. Processed third-party visual materials remain documented separately in `THIRD_PARTY_ASSETS.md`.
