# Validation

## Current development checks

Run locally with:

```powershell
npm install
npm run verify
```

`npm run verify` rebuilds the Host and Client bundles, checks source/runtime syntax and DSH contracts, then runs balance, settings, interaction, presentation, and compatibility suites. Compatibility fixtures cover the 0.1.5/0.1.6 session generations, DSH 0.1.7 Config and balance APIs, and the declared Desktop `0.2.0-rc.2` surface. These fixtures are automated contract tests; they are not a substitute for running each DSH build.

The reliability maintenance branch additionally checks that:

- unrelated streamed DOM mutations do not trigger a hero phase lookup;
- deferred click feedback is cancelled when the interaction bridge is disposed;
- a credential change and last-consumer unmount abort an in-flight browser balance request;
- the Host rejects redirects, non-JSON or oversized responses, malformed balance values, unsupported currencies, and nonstandard API ports.

## Kinich 1.7.2 release validation — 2026-10-04

| Check | Result |
| --- | --- |
| `npm run verify` | PASS; build, contracts, balance, settings, interaction, presentation, DSH 0.1.5–0.2.0, and DSH 0.1.7 suites |
| `npm pack --dry-run` | PASS; 11 published files, no source asset directory |
| Isolated DSH install | PASS; DSH CLI `0.2.0-rc.2`, separate `DSH_HOME`, package resolved from the `1.7.2` tarball |
| npm publication | PASS; `dsh-kinich-theme@1.7.2` published with the `latest` tag |
| Registry download | PASS; downloaded package matches the isolated-test tarball byte-for-byte |
| Downloaded tarball SHA-256 | `01d1c2ee832b1dc045ed7e9968e4e1672e01bf25b80b98e33b0072bb94c0acca` |
| Windows Desktop visual/performance acceptance | Not recorded for this candidate |
| Per-asset redistribution evidence | Not recorded; see `THIRD_PARTY_ASSETS.md` |

## Manual validation evidence

The last full Windows browser acceptance record is [`VALIDATION_V1.3.md`](./VALIDATION_V1.3.md), performed with DSH `0.1.6-alpha.2` for Kinich `1.3.1`. Kinich `1.7.1` adds automated compatibility coverage for DSH `0.1.7` and Desktop `0.2.0-rc.2`; this `1.7.2` maintenance candidate adds lifecycle, observer-filter, and API-response regression tests. The repository still does not contain a matching full Windows visual/performance acceptance record for DSH `0.1.7` or Desktop `0.2.0-rc.2`.

Before publishing a new version, install its packed tarball into a clean, isolated DSH profile and verify welcome/conversation transitions, workspace switching, conversation creation, rapid pointer feedback, Ajaw drag and balance behavior, light/dark modes, narrow layouts, reduced motion, settings saves, focus/unfocus cleanup, and plugin disable/re-enable. Keep the DSH version, Windows build, test steps, and observed results in a dated validation record.

## Release gate

`THIRD_PARTY_ASSETS.md` is a provenance record, not a grant of redistribution rights. Confirm rights for each included visual asset before creating a public release; see [`PUBLISHING.md`](./PUBLISHING.md).
