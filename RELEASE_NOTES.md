# Kinich Theme v1.5.0 — DSH 0.1.7 Compatibility

Kinich now works with DeepSeek Harness Web 0.1.7-rc.2 while retaining the earlier 0.1.5 and 0.1.6 settings path.

## Changes

- Kinich preferences follow DSH 0.1.7's Profile-backed live Config and `configForms` APIs. Existing settings controls and save feedback remain available.
- Host balance monitoring reads the official DeepSeek API-key provider's current configuration and launch environment, then resolves the credential only on the Host.
- Refused 0.1.7 preference writes are reported as failed saves; Ajaw position reverts if persistence is refused.
- Session feedback, slots, visuals, assets, and reduced-motion behavior retain their previous behavior.

## Install

```powershell
dsh plugin --profile web add dsh-kinich-theme@latest
dsh web
```

GitHub Release fallback:

```powershell
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```

## Compatibility

- DeepSeek Harness Web: `^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2`
- Node.js: `^22.19.0 || >=24.0.0`

The MIT license covers original plugin code and documentation. Processed third-party visual materials remain documented separately in `THIRD_PARTY_ASSETS.md`.
