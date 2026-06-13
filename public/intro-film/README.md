# Creation-first intro — zero media

**Route:** `/prototype/open-limits-client-film`

This prototype no longer depends on photos, renders, or videos.

## Architecture

Six phases, all procedural:

1. **Pencil** — gold point + stroke draw on black
2. **Blueprint** — villa floorplan SVG (dimensions, rooms, elevation, scale)
3. **Transform** — React Three Fiber wall extrusion from blueprint geometry
4. **Villa** — stylized 3D form + procedural golden-hour atmosphere
5. **Brand** — villa lines collapse into Open Limits logo paths
6. **Enter** — vector lockup + Enter Experience

## Success test

Delete every file under `public/intro-film/` — the intro still runs.

No `<img>`, no `<video>`, no `/intro-film/` network requests.

## Debug

`/prototype/open-limits-client-film?debug=1` — phase HUD + replay FAB
