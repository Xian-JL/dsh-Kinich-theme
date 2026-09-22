# Validation

For local development:

```powershell
npm install
npm run verify
```

`verify` rebuilds `lib/`, checks source/runtime syntax, confirms required dependencies and DSH slots, verifies the shared settings definition contract, checks the live theme bridge, confirms Ajaw interaction/drag code, validates the page-phase and bounded Web Animations feedback models, and runs the 0.1.6 session compatibility suite.

The automated suite does not replace final Windows browser validation. Before publication, verify welcome/conversation transitions, workspace switching, conversation creation, rapid pointer feedback, Ajaw drag/balance behavior, light/dark modes, narrow layouts, and reduced motion in a clean DSH Web profile.

Validated runtime lines: DSH Web `0.1.5-rc.1` / `0.1.5-rc.2` and `0.1.6-alpha.2`.
