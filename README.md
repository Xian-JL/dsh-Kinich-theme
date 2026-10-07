# Kinich Theme for DeepSeek Harness

Interactive **Kinich & Ajaw** themed UI experience for DeepSeek Harness Web / Desktop.

- Repository: https://github.com/Xian-JL/dsh-Kinich-theme
- Distribution: npm, with a GitHub Release tarball as a fallback
- Current release: `1.8.0`
- Target runtimes: the declared DSH Web compatibility ranges and Desktop `0.2.0-rc.2`

> This is an independent community plugin and is not affiliated with or endorsed by DeepSeek or HoYoverse.

Custom backgrounds support automatic accents and an image-only brightness slider from 50% to 180% (default 130%). UI text and controls are not filtered.

## Install

For Desktop, open it once to initialize its profile, then fully quit it. Use the CLI bundled with that Desktop installation:

```powershell
dsh plugin --profile desktop add dsh-kinich-theme@latest
```

Restart Desktop after installation. For Web, use the commands below.

```powershell
dsh plugin --profile web add dsh-kinich-theme@latest
```

Then launch DSH Web:

```powershell
dsh web
```

No local clone, build step, npm login, or esbuild installation is required for normal users. Both distributions ship prebuilt `lib/index.js` and `lib/client.js`.

GitHub Release fallback:

```powershell
dsh plugin --profile web add https://github.com/Xian-JL/dsh-Kinich-theme/releases/latest/download/dsh-kinich-theme-latest.tgz
```

## Update

```powershell
dsh plugin --profile web remove dsh-kinich-theme
dsh plugin --profile web add dsh-kinich-theme@latest
```

## Uninstall

```powershell
dsh plugin --profile web remove dsh-kinich-theme
```

## Astra optimized features

### Modern Jungle workspace

- Jungle is the only active design target. Legacy Phlogiston/Sunlit values remain decodable but are outside this visual pass.
- The welcome page now follows the approved editorial layout: left-side welcome copy, framed upper-right Kinich art, a lower composer, and bottom-right Ajaw.
- Restrained rainforest lighting, Natlan geometry, and Genshin-inspired warm-gold linework remain part of the theme identity.

### Visual intensity

Choose **Minimal**, **Balanced**, or **Immersive** independently from the visual mode.

### Ajaw Companion 2.0

- Idle / hover / reaction / dragging states.
- Session-aware thinking and completion feedback.
- Drag position, mirror, rotation, and reset controls.
- Arrow-key positioning in 8 px steps, Shift for faster movement, and Home to reset the position. Dragging follows the pointer immediately.
- Live balance for the configured official DeepSeek API account with a 60-second refresh cycle.
- Below CNY `¥10`, Ajaw changes in exactly two ways: red tint and double animation speed. Click, drag, moods, and session feedback continue normally.
- The API key is resolved only on the Host and never sent to the browser.

### DSH-native integration

- Kinich/Ajaw sidebar branding.
- Blank-session Hero branding.
- Native DSH settings integration.
- Live DSH semantic-token overrides.
- Dynamic environment effects with `prefers-reduced-motion` support.
- Clear save, manual balance refresh, and session feedback; sending is derived from the actual session snapshot.

## Settings

Open DSH **Settings → General → Kinich Theme** to configure:

- Jungle (legacy modes remain configuration-compatible only)
- Minimal / Balanced / Immersive
- Kinich character layer
- Ajaw companion
- Natlan ornament / texture
- Dynamic environment motion

## Compatibility

`v1.7.1` supports the previous DSH Web releases and Desktop `0.2.0-rc.2`:

```text
@deepseek-ai/dsh ^0.1.5-rc.1 || ^0.1.6-alpha.1 || ^0.1.7-rc.2 || ^0.2.0-rc.2
Node.js ^22.19.0 || >=24.0.0
```

The 0.1.6 compatibility layer understands the new `promptError`, `openError`, and `lastAgentError` session fields and isolates Ajaw feedback by the session retained in DSH's main view. Legacy 0.1.5 snapshots remain supported.

On DSH 0.1.7, Kinich preferences use the Profile-backed live Config and `configForms` APIs. Balance monitoring reads the official DeepSeek API-key provider's current configuration on the Host. Earlier DSH versions continue using their settings scope.

DeepSeek Harness is still evolving quickly. If a future DSH release changes plugin APIs, use the latest Kinich Theme release that explicitly lists support for that DSH version.

## Development

```powershell
npm install
npm run verify
```

The source tree is modular under `src/`; `esbuild` produces the prebuilt Host and Client bundles in `lib/`.
Desktop visual and motion rules are documented in [`docs/DESIGN_AND_MOTION.md`](./docs/DESIGN_AND_MOTION.md).

## Project structure

```text
src/       Modular Host / Client / shared source
assets/    Source visual assets used to generate the runtime bundle
scripts/   Build and verification tooling
lib/       Prebuilt DSH runtime entrypoints
```

## Credits and third-party assets

See [`THIRD_PARTY_ASSETS.md`](./THIRD_PARTY_ASSETS.md). The MIT license covers the original plugin code and documentation only; third-party characters, artwork, trademarks, and visual materials remain subject to their respective rights and terms.

## License

Original plugin code and documentation: MIT. See [`LICENSE`](./LICENSE).
