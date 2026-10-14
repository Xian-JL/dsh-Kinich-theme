# Kinich Theme v2.0.1

Fixes the three issues reported after Desktop acceptance of 2.0.0:

- Ordinary backgrounds no longer draw reference titles, navigation or loading annotations, and do not overlap the visible wallpaper with legacy welcome copy. Explicit browsing/calibration retains complete reference text.
- All six Kinich settings sections have direct navigation and normal scrolling. Jungle, Phlogiston and Sunlit can be selected without resetting other preferences.
- Settings dialogs, alert dialogs, menus, listboxes and popovers use opaque surfaces in light/dark modes, independently of wallpaper visibility. Workspace transparency and existing effects remain available.

Version 2.0.1 and publication are explicitly authorized by the user; Specification 1.0.6 records the scope. Existing histories, assets, parameters and sampled accents are preserved. Verified Desktop host remains **DSH 0.2.0-rc.2**, not stable DSH 0.2.0.

Targeted settings/renderer checks, isolated headless browser scrolling/opacity checks and exact packed installation supplement the user's reported Desktop results. No Computer Use or cancelled broad regression gate is required for this maintenance release.

After fully exiting Desktop:

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```
