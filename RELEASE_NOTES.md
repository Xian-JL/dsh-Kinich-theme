# Kinich Theme v1.7.0 — Opt-in Immersive Depth

Kinich 1.7 adds opt-in Jungle depth for DeepSeek Harness Desktop 0.2.0-rc.2. It includes the 1.6 navigation, input and send cues and retains earlier Web compatibility ranges.

## Changes

- Immersive intensity now gives the existing welcome environment up to four pixels of pointer depth after the page settles. It does not move DSH controls or Ajaw.
- Welcome copy enters in three restrained steps. In conversations, the Immersive ambient layer becomes quieter and pauses its loops.
- The depth effect is inactive when ambient motion is disabled, the page is hidden, reduced motion is requested or the viewport is narrow. No new visual assets or settings migration are involved.
- The 1.6 desktop action cues, stable welcome role selectors, and clear composer layout remain included.

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
