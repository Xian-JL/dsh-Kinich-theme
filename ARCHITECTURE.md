# Kinich Theme architecture

## Runtime split

- `src/host/`: registers the persistent settings schema.
- `src/shared/settings.js`: single definition source for persisted values and product presets.
- `src/client/`: DSH Web UI layer, live theme-token bridge, overlay, brand marks, settings UI, and localization.
- `assets/`: authored image assets; build embeds exact data URIs into the client bundle.
- `lib/`: prebuilt DSH runtime entrypoints.

## v1.0 product model

`visualStyle` selects one of three token layers: `jungle`, `phlogiston`, or `sunlit`. `KinichOverlay` subscribes to the settings scope and replaces the plugin-owned `ctx.theme.overrideTokens()` layer whenever the style changes. It also writes a plugin-owned `body[data-kinich-style]` attribute so brand/settings/ambient CSS can follow the same mode.

Visual presets remain ordinary patches over persisted settings; there is no hidden preset state. Fine-tuning a preset naturally becomes a custom combination.

Ajaw remains a `shell.overlay` element. Drag position writes only on pointer release; intermediate rendering is `requestAnimationFrame` throttled. Hover/click reactions are transient UI state and are not persisted.

## DSH seams

The plugin uses only the current Web composition seams required for the product layer:

- `sidebar.brand.mark`
- `conversation.hero.brand.mark`
- `shell.overlay`
- `settings.general.item`
- `ctx.theme.overrideTokens()`
- `ctx.settingsScope.bind()`
