# Kinich Theme v1.6.0 — Desktop Action Cues

Kinich adds restrained navigation, input, and send feedback for DeepSeek Harness Desktop 0.2.0-rc.2, while retaining the earlier Web compatibility ranges.

## Changes

- Welcome layout no longer embeds DSH's build-specific CSS hashes. It still uses a renderer role suffix and is checked against the current bundled Web renderer.
- Welcome copy and the hero illustration now clear the native workspace selector and composer on desktop.
- Selected session rows briefly show a jade edge, pointer-focused inputs receive a restrained outline, and the composer acknowledges a real sending state.
- Reduced motion removes the new animation. Existing settings, balance monitoring, theme tokens, Ajaw behavior and visual assets remain intact.

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
