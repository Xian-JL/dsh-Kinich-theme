# Changelog

## 1.5.0 — DSH 0.1.7 Compatibility

- Migrated live Kinich preferences to DSH 0.1.7 Profile Config and Client `configForms`, while retaining the earlier settings-scope path for DSH 0.1.5/0.1.6.
- Updated Host balance monitoring to read the active `llm-deepseek-api-key` configuration and trusted launch environment without exposing credentials to the browser.
- Treated a refused 0.1.7 settings write as a failed save, including Ajaw position persistence.
- Added compatibility checks for both settings generations and the 0.1.7 balance route. No visual assets were changed.

## 1.4.0 — Desktop Feedback and Motion

- Made Ajaw dragging follow the pointer with a compositor transform and commit its saved position only after release; page transitions retain their existing timing.
- Added keyboard positioning with arrow keys, Shift acceleration, Home reset, and screen-reader instructions.
- Derived sending feedback from actual DSH session state instead of global Enter or button-label guesses; click bursts now target actionable controls.
- Added explicit manual balance refresh and setting-save feedback, a retry action for failed saves, and stale-balance messaging that remains visible during the low-balance state.
- Improved small text contrast, focus visibility, and settings heading semantics while preserving both color schemes and reduced-motion behavior.
- Reduced repeated full-layer filter animation and documented desktop motion and accessibility rules. No new visual assets were added.

## 1.3.1 — Click Burst Visibility Hotfix

- Removed accidental paint containment from the 1 px click-burst origin so the ring, energy arc, and fragments are no longer clipped to a tiny white point.
- Added a regression assertion that forbids paint containment on the burst origin while preserving the bounded Web Animations pool and high-refresh rendering path.

## 1.3.0 — Visual System and Feedback Upgrade

- Unified the Jungle presentation around a clearer Kinich visual hierarchy across the welcome page, conversations, branding, settings, and the balance popover.
- Added an explicit presentation-only page phase model for continuous welcome/conversation transitions without changing DSH routing or persisted settings.
- Made Kinich move, scale, and fade continuously between conversation and welcome compositions using the existing single illustration.
- Made Ajaw travel from the user's current position to a temporary lower-right welcome dock, close an already-open balance popover, preserve low-balance state and animation preference, and temporarily face left without overwriting saved position, rotation, or flip.
- Added interruption-safe reverse transitions and reduced-motion terminal states.
- Replaced React state-driven click particles with a bounded four-slot Web Animations pool so rapid clicks no longer rerender the full overlay or use quantized low-frame movement.
- Replaced the settings preview placeholder with the existing packaged Kinich illustration; no new third-party assets were added.
- Added presentation, transition, pooling, cleanup, and feature-freeze verification coverage while preserving the v1.2.2 Host, balance, session, and interaction contracts.

## 1.2.2 — DSH 0.1.6 Compatibility

- Added explicit compatibility for `@deepseek-ai/dsh@0.1.6-alpha.2` while preserving the 0.1.5 release line.
- Updated Ajaw session feedback for the new `promptError`, `openError`, and `lastAgentError` fields.
- Isolated session feedback by session ID and selected the session retained by DSH's main view, preventing subagent or secondary-session activity from replacing the visible Ajaw state.
- Removed the obsolete `@deepseek-ai/dsh-client-runtime` client injection and widened the optional settings peer range.
- Updated the Schemastery runtime dependency to the version used by DSH 0.1.6 settings.
- Added dedicated compatibility tests for new/legacy session snapshots, multi-session selection, state isolation, and package metadata.

## 1.2.1 — Workspace Interaction Hotfix

- Deferred click-burst rendering and tactile button mutations until after DSH Host click handling completes.
- Restored workspace switching from the welcome-page workspace selector.
- Restored conversation creation from each workspace row's add button in the sidebar.
- Preserved the v1.2.0 pointer effect, Ajaw balance popover, and task feedback behavior.

## 1.2.0 — Kinich Interaction Feedback

- Rebased directly from the published GitHub `v1.1.0` release; its approved environmental lighting, ribbons, particles, composition, and six-second character loop remain unchanged.
- Added tactile press feedback for Host actions and a focused Kinich outline for text inputs without replacing DSH controls.
- Added send, running, complete, and error feedback tied to actual interaction/session state.
- Kept textual state announcements screen-reader-only and moved visible task feedback into Ajaw, avoiding a floating composer capsule or decorative progress line.
- Preserved low-balance red alert as Ajaw's base appearance while giving sending, thinking, success, and error distinct symbols, badge colors, and ring styles.
- Added reduced-motion behavior and tests for send-action classification and interaction-layer contracts.
- Added a 260 ms, pointer-transparent Kinich pixel burst for primary mouse clicks: one luminous diamond core, a broken diamond ring, a short energy arc, and ten lime/gold fragments within a roughly 72 px footprint.
- Kept the click-burst host layer permanently mounted so burst insertion cannot remount Ajaw between pointer-down and click or suppress the balance popover.
- Removed the welcome-page “Think · Create · Explore” motto because it duplicated native DSH copy.
- Simplified low-balance behavior to exactly two Ajaw differences: red tint and 2× animation speed; drag, hover, click, moods, and session feedback remain available.

## 1.1.0 — Astra Jungle

- Expanded the Jungle environment beyond rising particles with slow canopy breathing, two sparse diagonal energy ribbons, and staggered diamond glints.
- Added a low-amplitude Kinich character loop with floating, breathing, micro-rotation, and shadow changes; the environment toggle, Minimal intensity, and `prefers-reduced-motion` all disable it.
- Strengthened canopy light/shadow and energy-ribbon visibility, enlarged the five diamond glints, tripled firefly particles from 8 to 24, removed Natlan ornament drift, and shortened the Kinich loop from 14 seconds to 6 seconds.
- Connected Ajaw to the authenticated DSH `/api` channel and the official DeepSeek `GET /user/balance` endpoint; API keys remain Host-only.
- Added 60-second polling/cache, request deduplication, manual refresh throttling, focus refresh, timeout handling, retry metadata, and stale-last-good display.
- Added the original CNY-only `< ¥10` red-alert behavior, later refined in v1.2.0 to red tint plus 2× animation speed without interaction locking.
- Realigned the Jungle welcome composition with the approved preview: editorial welcome copy, framed upper-right Kinich art, lower composer spacing, and bottom-right Ajaw.
- Added edge-aware balance-popover placement and migrated the former top-right default Ajaw coordinate to the new lower-right composition.
- Added Stage 4 balance policy tests and package verification coverage.

## Astra Stage 3

- Rebuilt the visible product layer around the Jungle direction while preserving legacy visual-mode data compatibility.
- Applied the modern rainforest palette, warm-gold Genshin-inspired line hierarchy, asymmetric corners, and quieter ambient depth.
- Reorganized Settings into visual intensity, Ajaw companion, API balance, and environment sections.
- Turned Ajaw into a keyboard-accessible balance popover trigger while retaining rAF dragging and session feedback.
- Added the Stage 3 balance placeholder that Stage 4 subsequently replaced with the live official lookup.
- Generated the settings version label from `package.json` and expanded verification for the new interaction contract.

## 1.0.0 — First stable public release

- Promoted the v0.9.1 product experience to the first stable public release.
- Added public npm/GitHub metadata and one-command DSH installation documentation.
- Added English and Simplified Chinese public README files.
- Kept the three visual modes: Jungle, Phlogiston, and Sunlit.
- Kept Minimal / Balanced / Immersive visual intensity controls.
- Kept Ajaw Companion 2.0 with session-state feedback, click/double-click interaction, rAF drag, mirror, rotation, and reset.
- Kept themed sidebar branding and blank-session Hero branding.
- Kept mode-aware dynamic environment effects with reduced-motion support.
- Ships prebuilt Host and Client bundles; end users do not need a build step.

## 0.9.1

- Added dynamic mode-aware ambient effects: Jungle fireflies, Phlogiston energy sparks, and Sunlit dust/light pass.
- Added an ambient motion toggle and intensity-aware density.
- Dynamic motion automatically disables under `prefers-reduced-motion`.

## 0.9.0

- Added session running/completed visual feedback bridged from the session-scoped composer dock.
- Added Ajaw Companion 2.0 with thinking/success/idle moods, double-click flip, and richer status feedback.
- Deepened Jungle / Phlogiston / Sunlit composition and sidebar branding.
- Added Minimal / Balanced / Immersive visual intensity.

## 0.8.0

- Added three live visual modes and live DSH semantic-token switching.
- Redesigned Hero/sidebar branding and product-style Settings UI.
- Added Ajaw hover and click reactions.

## 0.7.0

- Moved build generation to esbuild.
- Unified persisted setting definitions.
- Added rAF-throttled Ajaw dragging.
- Added visual presets, Ajaw reset, and character-position previews.
