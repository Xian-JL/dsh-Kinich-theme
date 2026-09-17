# Kinich Theme for DeepSeek Harness

Interactive **Kinich & Ajaw** themed UI experience for DeepSeek Harness Web.

- Repository: https://github.com/Xian-JL/dsh-Kinich-theme
- npm: `dsh-kinich-theme`
- Stable release: `1.1.0`
- Target runtime: `@deepseek-ai/dsh@0.1.5-rc.1` Web

> This is an independent community plugin and is not affiliated with or endorsed by DeepSeek or HoYoverse.

## Install

```powershell
dsh plugin --profile web add dsh-kinich-theme
```

Then launch DSH Web:

```powershell
dsh web
```

No local clone, build step, or esbuild installation is required for normal users. The npm package ships prebuilt `lib/index.js` and `lib/client.js`.

## Update

```powershell
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
- Live balance for the configured official DeepSeek API account with a 60-second refresh cycle.
- CNY balances below `¥10` lock Ajaw in a static red-alert state while keeping the balance bubble and refresh available; DSH model calls are not blocked.
- The API key is resolved only on the Host and never sent to the browser.

### DSH-native integration

- Kinich/Ajaw sidebar branding.
- Blank-session Hero branding.
- Native DSH settings integration.
- Live DSH semantic-token overrides.
- Dynamic environment effects with `prefers-reduced-motion` support.

## Settings

Open DSH **Settings → General → Kinich Theme** to configure:

- Jungle (legacy modes remain configuration-compatible only)
- Minimal / Balanced / Immersive
- Kinich character layer
- Ajaw companion
- Natlan ornament / texture
- Dynamic environment motion

## Compatibility

`v1.1.0` targets the current stable DSH Web line used for this release:

```text
@deepseek-ai/dsh 0.1.5-rc.1
Node.js ^22.19.0 || >=24.0.0
```

DeepSeek Harness is still evolving quickly. If a future DSH release changes plugin APIs, use the latest Kinich Theme release that explicitly lists support for that DSH version.

## Development

```powershell
npm install
npm run verify
```

The source tree is modular under `src/`; `esbuild` produces the prebuilt Host and Client bundles in `lib/`.

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
