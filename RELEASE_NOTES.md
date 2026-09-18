# Kinich Theme v1.2.0 — Interaction Feedback

Development release rebuilt directly from the published GitHub `v1.1.0` baseline.

## Highlights

- Preserves the complete v1.1.0 Jungle environment and motion composition
- Adds restrained press and text-focus feedback to existing DSH controls
- Adds send, running, completion, and error states driven by real interaction/session signals
- Keeps textual status announcements available to assistive technology without placing a floating capsule or decorative line over the composer
- Makes Ajaw distinguish sending, thinking, completion, and error even while the low-balance red-alert base state is active
- Honors reduced-motion preferences
- Adds a compact code-drawn Kinich pixel burst at primary mouse-click coordinates without changing the cursor or intercepting Host interaction
- Removes the welcome motto that overlapped native DSH copy
- Refines low balance to only tint Ajaw red and double its animation speed, with every interaction preserved

## Install

```powershell
dsh plugin --profile web add "https://github.com/Xian-JL/dsh-Kinich-theme/releases/download/v1.2.0/dsh-kinich-theme-1.2.0.tgz"
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
