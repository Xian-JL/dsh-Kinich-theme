# Kinich desktop design and motion rules

The plugin enhances DSH Web through semantic tokens, slots, and a pointer-transparent overlay. DSH continues to own navigation, conversations, the composer, and menus. Jungle is the current design target; older style values remain readable for saved settings.

Product constraint: preserve every existing dynamic effect. Performance work may change scheduling, caching, and compositing, but must not remove an animation or make an existing motion option unavailable. The system's reduced-motion preference remains an accessibility override.

## Visual hierarchy

- Primary content and controls use `--dsw-alias-label-primary` on the active DSH surface. Secondary labels use `--dsw-alias-label-secondary`; captions should remain legible in both color schemes.
- Jade marks focus and active controls. Lime marks the primary action or a successful state. Warm gold marks supporting detail and warnings. Error text and rings use the error tokens.
- The settings title is an `h2`; section titles are `h3`. Descriptions and status text are at least 12–13 CSS px. Decorative artwork and ambient effects must not obscure the DSH composer or conversation text.
- The balance amount is the dominant element in the popover; provider, status, and freshness follow in that order. A stale balance remains labeled stale even when the last known amount is below CNY 10.

## Motion hierarchy

| Event | Timing and behavior |
| --- | --- |
| Welcome/conversation switch | Keep the 760 ms interruptible Kinich/Ajaw transition and its stable terminal states. Reduced motion settles within 80 ms. |
| Hover, press, and selection | Use short local feedback, usually 120–180 ms. Do not move the DSH layout. |
| Ajaw drag | Follow the pointer with one transform update per animation frame. Do not interpolate the dragged position; persist it on release. |
| Ajaw keyboard move | Move by 8 px per arrow key, or 32 px with Shift. Home restores the default position. |
| Message lifecycle | Sending/running/complete/error follow the DSH session snapshot. The small Ajaw ring, badge, and accessible text carry state; ambient effects remain secondary. |
| Balance refresh | Announce manual progress and result beside the balance. Keep the amount in place while checking. |
| Click burst | Use the fixed four-slot Web Animations pool and only show it for actionable mouse controls. Keep its origin unclipped and pointer-transparent. |
| Selected session | Give an `aria-selected` tree item one 280 ms jade edge cue after the Host confirms selection. |
| Input focus and sending | Give pointer focus a restrained 160 ms outline and the composer one 260 ms edge cue only when the main Session enters `sending`. |
| Immersive welcome depth | Only on the settled welcome page with ambient motion enabled, offset the existing decoration by at most 4 px with one requestAnimationFrame update per pointer event batch. Reset on blur, hidden document, resize and unmount. |
| Immersive conversation | Pause ambient loops and dim their layer while reading or working; session and Ajaw state feedback remain available. |

Animate transforms and opacity for repeated movement. Avoid repeated filters or large-area repaint effects. Reserve `will-change` for an active transition or drag. When `prefers-reduced-motion: reduce` is active, remove decorative loops and preserve state through static text, color, and focus indicators. CNY below 10 changes Ajaw only to red and double animation speed; all interactions and session states remain available.

## Verification

Run `npm run verify`, then check a clean DSH Web profile in a desktop browser. Exercise welcome/conversation transitions, fast reversals, workspace switching, a long reply, Ajaw pointer and keyboard movement, manual balance refresh, settings save/failure feedback, light/dark themes, keyboard focus, and reduced motion. Compare the same actions with the plugin disabled before attributing a dropped frame to Kinich. In a browser performance recording, inspect frames, layout, paint, and scripting during drag and rapid clicks; do not infer frame rate from source alone.
