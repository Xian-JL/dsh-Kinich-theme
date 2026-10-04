# Kinich Theme v1.7.2 — Runtime Reliability

Kinich 1.7.2 reduces unrelated DOM work, cleans up deferred interactions on teardown, and makes balance requests more resilient while preserving all existing visual and dynamic effects.

## Changes

- The welcome-phase observer ignores ordinary streamed content changes and only rechecks when a phase marker is inserted, removed, or changed.
- Deferred click and navigation feedback timers are tracked and cleared when the interaction bridge is disposed.
- Browser balance requests have a timeout, abort when the last consumer leaves, and cannot let an old credential's response replace current state.
- The Host rejects redirects, nonstandard API ports, non-JSON or oversized bodies, and malformed balance fields before accepting a response.
- Existing motion, appearance choices, and saved settings remain available. No settings migration is required.

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
