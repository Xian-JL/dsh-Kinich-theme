# Astra Stage 4

This checkpoint completes the Jungle-only product pass and the live Ajaw balance feature.

## Completed

- Authenticated Host route at `/api/kinich-balance`; the browser never receives the DeepSeek API key.
- Official DeepSeek `GET /user/balance` lookup for the active `llm-deepseek` credential reference.
- 60-second Host cache and Client polling, single-flight request deduplication, 10-second timeout, manual refresh floor, focus/visibility refresh, and stale-last-good display.
- Statuses: `ready`, `unbound`, `unsupported`, `auth-error`, `rate-limited`, and `unavailable`.
- CNY `< ¥10` red-alert lock. The lock freezes every decorative/interactive Ajaw action except opening, closing, and refreshing the balance bubble. It does not interrupt DSH model calls.
- Preview-aligned Jungle welcome composition, framed Kinich art, lower composer, lower-right Ajaw, and edge-aware popover.
- Layered Jungle motion: 24 rising fireflies, stronger canopy breathing, two clearer diagonal ribbons, five enlarged diamond glints, and a 6-second Kinich character loop. The Natlan ornament remains static.
- Motion safety: Minimal intensity, the dynamic-environment switch, and `prefers-reduced-motion` disable the added loops.
- Legacy compatibility: existing non-Jungle values remain decodable, and the former top-right default Ajaw coordinate is displayed at the new lower-right anchor.

## Verification

```powershell
npm run verify
npm pack --dry-run
```

After linking the folder into the Web profile, restart `dsh web` and hard-refresh the browser once so the new prebuilt Client bundle replaces the cached Stage 3 bundle.
