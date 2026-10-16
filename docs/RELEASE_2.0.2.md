# Kinich 2.0.2: current-host declaration and registry installation

2026-10-16. The user requested matching declarations for Kinich/Xiao and replacement of local imports with npm installation. After the strict `>0.2.0` conflict was explained, the user explicitly chose compatibility with the local host and confirmed npm login. This authorizes the proposed Kinich 2.0.2 / Xiao 1.2.1 metadata releases.

Both `engines.dsh` and optional `peerDependencies.@deepseek-ai/dsh-settings` are `>=0.2.0-rc.2 <0.3.0`. Node/React, bundle/client manifests and repository metadata remain present. The installed market's own semver parser accepts the actual rc.2 host and rejects 0.1.x. This does not claim stable DSH environment verification.

No wallpaper renderer, images, animations, saved preferences or durable history are changed. Specification is 1.0.7; the authorized maintenance ceiling is 2.0.2. npm versions are immutable, so the declaration revision uses a new patch rather than replacing 2.0.1.

Migration removes both active file-package dependencies, verifies their code is absent, and uses the installed market's npm target resolver/DSH runner to download the registry versions. Backups retain configuration and wallpaper data; final checks require version pins, no file/link sources, matching registry metadata and unchanged theme settings/data. Catalog indexing can lag publication independently of the installed source.
