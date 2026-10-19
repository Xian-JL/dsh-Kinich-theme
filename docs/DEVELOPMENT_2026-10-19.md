# Independent balance switch — 2026-10-19

GitHub development only. The package version remains `2.0.3-rc.1`; the new source/build is not the already published npm tarball. No npm publish, version tag, GitHub Release or Desktop replacement is part of this change.

## Behaviour

- `balanceEnabled` is Profile-local, defaults to true, and recovers a missing/invalid optional field to true. Explicit false survives Host schema and Client decode.
- Settings → API balance exposes the independent switch. Turning it off stops both Settings and overlay polling consumers, hides amounts/low-balance state, removes manual refresh, and leaves Ajaw click reactions, dragging, animation options and session feedback available.
- The last polling consumer cancels its client request and removes timers/listeners. Credential changes invalidate the previous-account cache while disabled without issuing another request. Re-enabling resumes checks.
- The Host checks theme/balance settings before resolving credentials and again before querying. A disabled route returns a disabled snapshot without cached account amounts. An upstream request already sent before the setting changed is not retroactively revoked by this Host guard; the client cancels/discards its outstanding result.

## Verification

- `npm run verify` passed version, wallpaper, build, check, stage4, balance-client, settings, background, interaction and presentation steps. Its legacy compatibility step exposed an obsolete 0.1.x package declaration assertion; updated that assertion to the existing `>=0.2.0-rc.2 <0.3.0` declaration, then reran `test-dsh-016.mjs` and `test-dsh-017.mjs`, both passed. No compatibility range was changed.
- Added behaviour assertions for default migration, explicit false, disabled Host requests through get/describe services, no credential reads while disabled, hidden cached amounts, re-enable, theme off, and credential changes without active polling.
- An in-memory bundle check exercised the actual balance hook through off → on → off → credential change → on, with controlled React/DOM/fetch boundaries. No disabled network request or low-balance presentation remained; polling listeners were released.
- Real shipped CLI: `0.2.1-rc.2`. A new isolated `kinich-balance-nav-20261019` Profile loaded both current builds through development junctions, served both client manifests and returned `status: disabled` from the authenticated balance route before and after restart. The off setting persisted. Desktop manifest/config/lock hashes were unchanged.
- No account credentials were read by the validation code and no real balance lookup was performed. No new Desktop visual acceptance is claimed or requested.

Local evidence: `E:/Codex_workspace/Kinich_archive/2026-10-19_balance-navigation/` contains validation scripts and result JSON files. The local development links are confined to the isolated Profile; the Desktop npm installation remains unchanged.
