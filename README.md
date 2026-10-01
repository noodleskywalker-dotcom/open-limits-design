# Open Limits Modifications

Isolated deployment branch for the approved Open Limits Modifications static website. Do not merge this branch into the main company website.

Run `python3 build.py`, then serve the `site/` directory. The standard-library-only build reconstructs the original deployment artifact and verifies its SHA-256 before extracting it. Only `site/` should be published. The original HTML is reproduced byte-for-byte; no client records are embedded.

Netlify: deploy branch `openlimits-modifications` as a NEW project. Build command: `python3 build.py`. Publish directory: `site`.

This application uses local browser storage. It is not a multi-user database, does not provide account authentication, and records are not shared between devices. Use the application backup/restore controls for separate copies of data.
