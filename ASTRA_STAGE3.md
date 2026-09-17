# Astra Stage 3

This source checkpoint implements the Jungle interface designed in Stage 2.

## Completed

- Jungle semantic-token palette for DSH light and dark schemes.
- Modern surface hierarchy with Kinich lime, rainforest green, and restrained Natlan gold.
- Updated sidebar and Hero brand treatment.
- Settings information architecture: visual intensity, Ajaw, API balance, and environment.
- Accessible Ajaw button with mouse, touch, and keyboard support.
- Ajaw balance popover shell with a truthful “not connected” state.
- Existing settings decode compatibility, including legacy Phlogiston and Sunlit values.
- Rebuilt `lib/index.js` and `lib/client.js`.

## Reserved for Stage 4

- DeepSeek official balance data request and refresh strategy.
- Current API-account identity resolution.
- Loading, success, error, stale, and offline balance states.
- Below-CNY-10 red-alert appearance.
- Red-alert behavior that stops every other Ajaw action until the balance recovers.

No simulated balance is displayed in this checkpoint.

## Validation

```powershell
npm install
npm run verify
npm pack --dry-run
```

Target project folder on Windows:

```text
E:\Codex_workspace\dsh-Kinich-theme-Astra_optimized
```
