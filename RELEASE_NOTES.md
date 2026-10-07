# Kinich Theme v1.8.0 — Session State and Custom Background

Kinich 1.8.0 adds explicit waiting-for-user feedback and lets users set a local static background with an automatically derived accent palette. Existing visuals, animations, and DSH-owned controls remain in place.

## Changes

- Ajaw distinguishes DSH approval, question, and plan-review waits for the currently selected Session; errors and running work keep deterministic precedence.
- Select a local PNG, JPEG, or WebP. Kinich downsizes and converts it to a bounded WebP kept in the active DSH profile, then derives light/dark accent colors from the image.
- Turn automatic accent matching off to keep the selected Kinich palette, or reset the image and accent to restore the original appearance.
- Adjust a custom image's apparent brightness from 50% to 180%; the default is 130%, and the adjustment applies only to the image layer.
- Legacy profiles receive defaults for the new settings; invalid background data falls back without resetting other Kinich preferences.
- All existing animations and reduced-motion behavior remain available. No third-party image assets are added to the package.

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
