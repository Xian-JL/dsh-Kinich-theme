# Kinich Theme v1.5.1 — DSH 0.2 Desktop Compatibility

Kinich supports DeepSeek Harness Desktop 0.2.0-rc.2 while retaining the earlier Web compatibility ranges.

## Changes

- Adapted welcome-page headline hiding and composer placement to the new renderer CSS classes, including transition and existing narrow-window rules.
- Extended the DSH engine and settings peer declarations to include `^0.2.0-rc.2`.
- Retained live settings, balance monitoring, Ajaw feedback, theme tokens, reduced motion and existing assets.

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
