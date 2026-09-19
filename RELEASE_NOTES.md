# Kinich Theme v1.2.2 — DSH 0.1.6 Compatibility

Compatibility update for DSH Web `0.1.6-alpha.2`, retaining support for the 0.1.5 release line.

## Highlights

- Recognizes the new 0.1.6 session error fields
- Keeps Ajaw task feedback bound to the visible main-view session
- Prevents secondary sessions or subagents from overwriting the visible Ajaw state
- Removes the obsolete DSH client-runtime injection
- Preserves all approved v1.2.1 visuals, balance behavior, and interaction fixes

## Install

```powershell
dsh plugin --profile web add dsh-kinich-theme@1.2.2
```

Then:

```powershell
dsh web
```

## Compatibility

- DeepSeek Harness Web: `0.1.5-rc.1`, `0.1.5-rc.2`, or `0.1.6-alpha.2`
- Node.js: `^22.19.0 || >=24.0.0`

## Important asset notice

The MIT license covers the original plugin code and documentation only. The runtime bundle contains processed third-party visual materials documented in `THIRD_PARTY_ASSETS.md`. Public redistribution rights for those materials must be confirmed separately before publication.
