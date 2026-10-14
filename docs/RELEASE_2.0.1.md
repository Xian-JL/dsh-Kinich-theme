# Kinich 2.0.1 maintenance release

2026-10-14, Asia/Shanghai. Specification 1.0.6. The user explicitly authorized this version and GitHub/npm publication without another permission request.

The reported defects were background-center annotation text, settings content visible only through the first section, and transparent settings dialogs overlapping the main window. This release hides passive wallpaper text/visible-background welcome annotation, restores three-style selection and adds navigation to all six settings sections, and supplies dialog-local opaque surfaces. Explicit reference browsing/calibration keeps its text and existing animation effects stay available. No wallpaper data schema or saved Profile parameters are reset.

Stylesheet ownership also permits overlap during hot replacement: each fiber creates and disposes its own tag, so an old instance cannot leave the new settings face without its stylesheet. A targeted overlap/disposal check covers that sequence.

Targeted checks use the actual settings component with controlled React hooks and a separate headless Edge page. All 01–06 sections exist and navigation reaches the corresponding section; selecting styles writes only visualStyle. The browser test verifies scroll reachability of section 06 and opacity of five popup surface types across three styles, light/dark, and V=0/50/100 (18 combinations). The renderer harness verifies no text drawing in passive mode and retained titles in explicit calibration. These are isolated software checks, not Computer Use or a live DSH Desktop visual acceptance claim.

The local DSH 0.2.0-rc.2 SettingsRoot source was inspected read-only to confirm the public dialog marker, host-owned scrollport and layer-2 background usage. Product CSS does not depend on the host's hashed class names. The verified host remains RC; stable DSH 0.2.0 is not claimed.

Publish the exact checked tarball to GitHub Release v2.0.1 and npm latest. 2.0.0 remains a valid historical confirmed version; 2.0.2 or higher is not authorized by this instruction.
