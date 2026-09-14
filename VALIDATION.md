# Validation

For local development:

```powershell
npm install
npm run verify
```

`verify` rebuilds `lib/`, checks source/runtime syntax, confirms required dependencies and DSH slots, verifies the shared settings definition contract, checks the live theme bridge, and confirms Ajaw interaction/drag code is present.

Target runtime: DSH Web `0.1.5-rc.1` (`latest` at the v1.0.0 release date).
