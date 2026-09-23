# Kinich Theme v1.4.0 — Desktop Feedback and Motion

This release improves desktop interaction feedback and motion while retaining the verified DSH Host, balance, session, and settings contracts.

## Changes

- Ajaw follows the pointer without a full React overlay render on each drag frame. Keyboard users can reposition it with arrow keys, Shift for larger steps, and Home to reset its position.
- Sending feedback follows the actual DSH session lifecycle. Click feedback applies to actionable controls.
- Manual balance refresh shows progress and result text. Failed setting saves identify the setting and offer a retry.
- Settings headings, focus indicators, small text, and light/dark caption colors have been improved.
- Repeated large-area filter animation has been reduced; welcome transitions, the fixed click-burst pool, and reduced-motion behavior remain intact.

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

- DeepSeek Harness Web: `0.1.5-rc.1`, `0.1.5-rc.2`, or `0.1.6-alpha.2`
- Node.js: `^22.19.0 || >=24.0.0`

The MIT license covers original plugin code and documentation. Processed third-party visual materials remain documented separately in `THIRD_PARTY_ASSETS.md`.
