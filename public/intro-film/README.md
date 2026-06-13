# Client film intro media

Media assets for `/prototype/open-limits-client-film`.

## Bundled (current)

| File | Source | Status |
|------|--------|--------|
| `poster-interior.jpg` | `hero-luxury-interior-02.jpeg` — grand living, arches, chandelier | ✅ Ready |
| `interior-walkthrough.webm` | WordPress project clip `3.5.mp4` (luxury living walkthrough) | ✅ Ready |
| `poster-structure.jpg` | Architecture foyer render | ✅ Ready |
| `poster-blueprint.jpg` | Architecture hero still | ✅ Ready |

## Required — client must supply

| File | Requirement | Status |
|------|-------------|--------|
| `poster-exterior.jpg` | **Real exterior villa / project render.** Golden hour preferred. Not bedroom. Not interior. | ❌ **MISSING** — no exterior exists in legacy or WordPress library |
| `exterior-villa-reveal.webm` | Exterior film clip (optional for prototype, required for 9+/10) | ❌ **MISSING** |

See `MEDIA-GAP.md` for audit details.

## Optional video clips

- `structure-rise.webm`
- `blueprint-overlay.webm`
- `logo-reveal.webm`

When videos are missing, the intro uses poster photography with cinematic Ken Burns drift. SVG is used only for blueprint linework and logo draw — not for fake 3D geometry.

Debug probe: append `?debug=1` to the prototype route.
