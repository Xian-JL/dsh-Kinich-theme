# Kinich 2.0.0-alpha.12 — Complex wallpaper prerelease

This is a prerelease candidate, not the final Kinich 2.0.0 release. The verified Desktop host is DSH 0.2.0-rc.2; stable DSH 0.2.0 compatibility has not been confirmed.

- Add an explicit **Enable dynamic wallpaper** switch in section 06, saved independently per Profile. Off stops dynamic display and playback while retaining the selected assets, parameters and sampled accent. On restores the selected wallpaper. Toggling does not create history.
- Static backgrounds, visibility, accent matching and existing Kinich/Ajaw animations retain their separate controls.
- Include Work, Overview, project detail/gallery/footer, About and loading templates with the local eight-project reference assets.
- Provide local wallpaper creation, selection, recoverable history, current/history/all export and multi-volume import. Static and dynamic backgrounds remain exclusive; accents are sampled once and retained.
- Include Desktop transport, footer geometry, thumbnail rail and frozen About-row corrections developed in the preceding candidates.
- Specification is now **1.0.3**. The user confirmed the preceding visual/parameter/management acceptance groups; the new enable switch has code, isolated persistence and renderer checks, with Desktop review left to the user.

Build, package contracts, version policy, settings writes, the isolated switch/store checks, renderer harness and clean package installation are the publication checks. They do not claim a real Desktop restart or stable-host acceptance.

Install this candidate with `dsh plugin --profile desktop add dsh-kinich-theme@2.0.0-alpha.12` after fully exiting Desktop.

The npm `next` tag selects the candidate. The `latest` tag remains on the stable baseline. Final 2.0.0 remains reserved for final confirmation.
