# Kinich Theme for DeepSeek Harness

Interactive **Kinich & Ajaw** themed UI experience for DeepSeek Harness Web.

- Repository: https://github.com/Xian-JL/dsh-Kinich-theme
- npm: `dsh-kinich-theme`
- Current release: `1.2.2`
- Target runtimes: `@deepseek-ai/dsh@0.1.5-rc.1` and `0.1.6-alpha.2` Web

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
- Below CNY `¥10`, Ajaw changes in exactly two ways: red tint and double animation speed. Click, drag, moods, and session feedback continue normally.
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

`v1.2.2` supports both the previous DSH Web release line and the current 0.1.6 preview:

```text
@deepseek-ai/dsh 0.1.5-rc.1 / 0.1.5-rc.2 / 0.1.6-alpha.2
Node.js ^22.19.0 || >=24.0.0
```

The 0.1.6 compatibility layer understands the new `promptError`, `openError`, and `lastAgentError` session fields and isolates Ajaw feedback by the session retained in DSH's main view. Legacy 0.1.5 snapshots remain supported.

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
