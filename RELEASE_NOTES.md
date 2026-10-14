# Kinich Theme v2.0.0

Confirmed by the user on 2026-10-14 after reviewing the latest implementation. This is the final Kinich 2.0.0 plugin release. The verified DSH Desktop host remains **0.2.0-rc.2**; stable DSH 0.2.0 environment verification is not implied.

- Complete local Work, Overview, project detail/gallery/footer, About and loading templates, with eight projects and 278 bundled image/font assets.
- Four independent 0–100 wallpaper controls, default 50, with explicit zero behavior; a separate per-Profile enable switch preserves assets, parameters and sampled accents when dynamic display is turned off.
- Local wallpaper creation, selection, recoverable history, current/selected/all export, multi-volume import and exclusive static/dynamic display. Accents are sampled once and retained across settings, theme and history changes.
- Transaction-safe Profile storage and coherent multi-window reads; exports remain complete during clearing and release temporary references on completion or cancellation.
- Wall-clock rhythm timing, correct explicit project selection, frozen About redraws and explicit rendering/data retry actions.
- Existing Kinich/Ajaw effects and settings remain available. Specification 1.0.5 records final acceptance; data schema stays 1.

Source checks and exact-tarball isolated installation/lifecycle checks supplement the user's Desktop acceptance. Cancelled long-running, multi-size, performance and dedicated regression gates remain cancelled.

After fully exiting Desktop, install through its bundled CLI:

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```

GitHub Release v2.0.0 includes the exact installation tarball, a latest alias and SHA-256 checksums. npm latest selects 2.0.0. Final plugin and host version identities remain separate.
