# Kinich 2.0.3-rc.2 — independent balance control

2026-10-19. Adds a Profile-local official balance switch (default on for existing behaviour). Off hides account amounts and low-balance red tint/acceleration, stops client polling/manual checks, and rejects Host balance reads before credential resolution. Ajaw interactions, session feedback, wallpaper history and motion preferences remain available.

Pairs with Xiao 1.3.0-rc.2. Distribute through npm next without changing latest. This publication does not replace the Desktop installation. The previously accepted rc.1 remains the baseline; the new switch has behaviour and isolated-host checks, without claiming a new Desktop visual acceptance. Earlier notes below are historical snapshots.

# Kinich 2.0.3-rc.1 — acceptance candidate

Pairs with Xiao 1.3.0-rc.1. Adds a persistent theme-level switch, guarded peer-theme switching, conditional brand registrations and full visual/interaction teardown. Wallpaper data, history and all motion preferences are preserved. Publish only as a GitHub prerelease and npm next, leaving latest unchanged. Desktop visual acceptance and final release confirmation remain pending. Earlier release notes below describe the previous public baseline.

# Kinich Theme v2.0.2

Metadata maintenance requested by the user on 2026-10-16. DSH and optional @deepseek-ai/dsh-settings declarations are now `>=0.2.0-rc.2 <0.3.0`, matching Xiao and preserving compatibility with the local 0.2.0-rc.2 host. Old 0.1.x declarations are removed.

The 2.0.1 UI fixes and all existing effects, wallpaper assets, history, parameters and sampled accents are unchanged. Specification 1.0.7 records this release and the migration from local file packages to npm installation.

Install after fully exiting Desktop:

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```
