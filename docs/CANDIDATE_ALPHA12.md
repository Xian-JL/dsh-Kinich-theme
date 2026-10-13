# Kinich alpha.12 candidate status

2026-10-13. Specification 1.0.3, package 2.0.0-alpha.12.

The user confirmed the previous three acceptance groups: reference visuals/templates; parameters, light/dark, one-time accent and static/dynamic switching; wallpaper creation/history/export/offline/failure recovery. This records user acceptance, not invented numerical measurements.

The explicit dynamic wallpaper enable switch is new in alpha.12. Isolated configuration rereads, WallpaperStore reopening with unchanged history, renderer teardown/recreation and static-background independence were checked in code. Real Desktop review of this addition remains user-operated.

The local executable and embedded Desktop/runtime packages are 0.2.0-rc.2. The [official release list](https://github.com/deepseek-ai/deepseek-harness/releases) did not contain a stable 0.2.0 release at the time of the audit. Do not describe the RC as stable. This is a prerelease, and no final Kinich 2.0.0 confirmation is implied.

The specification remains the development and acceptance authority. Cancelled long-running, multi-size, performance and dedicated interaction/regression gates stay cancelled.
