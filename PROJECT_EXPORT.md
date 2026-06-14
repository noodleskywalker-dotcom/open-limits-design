# OPEN LIMITS DESIGN — Project Export

Generated: 2026-06-13  
Package: `open-limits-design-full-backup.zip`

---

## Folder structure

```
open-limits-design/
├── app/                          # Next.js App Router pages & API routes
│   ├── about/, contact/, team/, services/, materials/, location/
│   ├── projects/, projects/[slug]/
│   ├── furniture/, furniture/[slug]/
│   ├── book-meeting-with-ceo/, calendar/
│   ├── showroom/[slug]/
│   ├── prototype/                # Isolated intro/showroom prototypes
│   ├── prototype-comparison/
│   ├── admin/                    # CMS admin panels
│   └── api/                      # REST API routes
├── components/
│   ├── ai/, booking/, contact/, furniture/, layout/, location/, showroom/
│   ├── home/                     # HomeExperience, LuxuryIntro (legacy)
│   ├── intro/                    # OpenLimitsVideoIntro (homepage)
│   └── prototype/                # Prototype-specific UI
├── lib/
│   ├── ai/, cms/, furniture/, intro/, sms/, supabase/
│   └── prototype/                # Prototype constants & geometry
├── public/
│   ├── images/legacy/            # Imported legacy website images
│   ├── intro-film/               # Prototype poster/video fallbacks
│   └── intro-video/              # Homepage intro MP4
├── scripts/                      # DB seed, imports, verification, captures
├── supabase/
│   ├── schema.sql
│   ├── calendar-schema.sql
│   └── migrations/               # Incremental SQL migrations
├── artifacts/                    # Prototype screenshots, GIFs, audit JSON
├── app/globals.css               # Global styles (Tailwind v4)
├── package.json, package-lock.json
├── tsconfig.json, next.config.mjs
├── postcss.config.mjs            # Tailwind v4 via @tailwindcss/postcss
├── eslint.config.mjs
├── .env.example
└── README.md
```

Styles live in `app/globals.css` (no separate `styles/` directory). Tailwind v4 is configured via PostCSS — there is no `tailwind.config.js`.

---

## Active routes

### Public pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — video intro + showroom entry |
| `/about` | About page |
| `/contact` | Contact form |
| `/team` | Team members |
| `/services` | Services listing |
| `/materials` | Material library |
| `/location` | Location / map |
| `/projects` | Projects gallery |
| `/projects/[slug]` | Project detail |
| `/furniture` | Furniture catalog |
| `/furniture/[slug]` | Furniture item detail |
| `/book-meeting-with-ceo` | CEO booking calendar |
| `/calendar` | Public calendar view |
| `/showroom/[slug]` | Showroom section viewer |

### Prototype routes (isolated from homepage)

| Route | Description |
|-------|-------------|
| `/prototype-comparison` | Side-by-side prototype comparison |
| `/prototype/current-cinematic` | Current cinematic intro |
| `/prototype/open-limits-cinematic-film` | Cinematic film prototype |
| `/prototype/open-limits-client-film` | Client film (media-first) prototype |
| `/prototype/open-limits-film-grade` | Film-grade media-first prototype |
| `/prototype/open-limits-premium` | Premium intro prototype |
| `/prototype/open-limits-premium-v2` | Premium v2 prototype |
| `/prototype/signature-open-limits` | Signature intro prototype |

### Admin

| Route | Description |
|-------|-------------|
| `/admin` | Dashboard |
| `/admin/login` | Admin login |
| `/admin/homepage` | Homepage CMS |
| `/admin/intro` | Intro settings |
| `/admin/showroom` | Showroom sections & hotspots |
| `/admin/media` | Media library |
| `/admin/services`, `/admin/team`, `/admin/projects` | Content management |
| `/admin/furniture`, `/admin/furniture/categories` | Furniture catalog |
| `/admin/furniture/import`, `/admin/furniture/import/history` | PDF/Excel import |
| `/admin/materials` | Materials admin |
| `/admin/bookings`, `/admin/calendar` | Booking management |

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/contact` | POST | Contact form submission |
| `/api/chat` | POST | AI assistant |
| `/api/bookings` | GET/POST | Public booking CRUD |
| `/api/bookings/manage` | POST | Admin booking actions |
| `/api/admin/furniture/analyze-excel` | POST | Excel catalog analysis |
| `/api/admin/furniture/analyze-pdf` | POST | PDF catalog analysis |
| `/api/admin/furniture/import-pdf` | POST | PDF catalog import |
| `/api/admin/furniture/import-rollback` | POST | Rollback import batch |
| `/api/admin/furniture/import-history` | GET | Import history |

---

## Current homepage intro system

**Branch:** `cursor/video-intro-integration-2d94` (PR #16)

The homepage uses a **fullscreen MP4 video intro**, not the legacy animated `LuxuryIntro`.

| Item | Value |
|------|-------|
| Orchestrator | `components/home/HomeExperience.tsx` |
| Video component | `components/intro/OpenLimitsVideoIntro.tsx` |
| Video source | `public/intro-video/open-limits-intro.mp4` |
| Constant | `lib/intro/video-intro-constants.ts` → `VIDEO_INTRO_SRC` |
| Dismiss key | `ol-intro-v2-complete` (`lib/intro/constants.ts`) |

### Behavior

- Fullscreen black overlay, video `object-fit: cover`
- Autoplay, muted, `playsInline`, preload auto, no controls, no loop
- CTA (`OPEN LIMITS DESIGN` + `Enter Experience`) appears ~2s before video ends
- **Enter:** 1.2s fade out → showroom homepage
- **Skip:** immediate dismiss → showroom
- **Fallback** (video error): black screen + logo + Enter CTA

### Current video file

| Property | Value |
|----------|-------|
| Path | `public/intro-video/open-limits-intro.mp4` |
| Size | 489,668 bytes |
| MD5 | `6a89520a15d4578a73c7fc14f92d72f2` |
| Status | **Placeholder** (prototype capture) — replace with final master export |

Legacy animated intro (`components/home/LuxuryIntro.tsx`) remains in codebase for prototypes but is **not** used on the homepage.

---

## Supabase tables used

Core schema: `supabase/schema.sql` and `supabase/migrations/restore_open_limits.sql`

| Table | Purpose |
|-------|---------|
| `media_assets` | Uploaded images/files (Storage bucket `site-media`) |
| `company_profile` | Company name, logo, contact info |
| `site_content` | Generic key-value CMS content |
| `homepage_content` | Homepage hero, CEO, about blocks |
| `homepage_hero_images` | Hero image carousel |
| `site_settings` | Feature flags, intro enabled toggle |
| `intro_slides` | Legacy intro slide config |
| `showroom_sections` | Homepage showroom zones |
| `showroom_images` | Showroom section images |
| `showroom_hotspots` | Clickable hotspot navigation |
| `leads` | Contact form submissions |
| `ai_conversations` | AI chat sessions |
| `chat_messages` | AI chat message history |
| `project_comparisons` | Before/after project pairs |
| `furniture_categories` | Furniture taxonomy |
| `furniture_items` | Catalog items |
| `furniture_item_images` | Item ↔ media join |
| `furniture_item_materials` | Item ↔ material join |
| `furniture_import_batches` | PDF/Excel import audit trail |
| `materials` | Material swatch library |
| `bookings` | CEO meeting requests |
| `blocked_times` | Admin calendar blocks |
| `admin_users` | Admin auth allowlist |

Migrations in `supabase/migrations/`:

- `restore_open_limits.sql` — full schema restore
- `fix_media_relationships.sql` — media FK fixes
- `phase2_bookings_index_and_monthly.sql` — booking indexes
- `ux_showroom_intro.sql` — showroom + intro tables
- `furniture_import_qc.sql` — import QC columns

---

## Environment variables required

Copy `.env.example` → `.env.local`:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Legacy `anon public` JWT (`eyJ…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side only — booking API, scripts |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` locally |
| `OPENAI_API_KEY` | Optional | AI assistant — graceful fallback |
| `TWILIO_ACCOUNT_SID` | Optional | Booking SMS |
| `TWILIO_AUTH_TOKEN` | Optional | Booking SMS |
| `TWILIO_PHONE_NUMBER` | Optional | Booking SMS |

---

## Deployment instructions

### Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev                  # http://localhost:3000
```

### Database setup (one-time)

1. Supabase → SQL Editor → run `supabase/migrations/restore_open_limits.sql`
2. `npm run db:seed`
3. `npm run supabase:verify`

### Production (Vercel recommended)

1. Push to GitHub
2. Import repo in Vercel
3. Set all required env vars in Vercel project settings
4. Deploy — `npm run build` runs automatically
5. Ensure Supabase Storage bucket `site-media` exists and RLS policies are applied

### Post-deploy checks

```bash
npm run build
npm run typecheck
npm run supabase:verify
```

---

## Current Git branch

| Property | Value |
|----------|-------|
| Branch | `cursor/video-intro-integration-2d94` |
| Base | `main` |
| Latest commit | `7b2af4a` — feat(intro): video homepage intro with fullscreen MP4 playback |
| Remote | `origin/cursor/video-intro-integration-2d94` |

---

## Open PRs

| # | Branch | Title |
|---|--------|-------|
| 16 | `cursor/video-intro-integration-2d94` | feat(intro): video homepage intro (MP4 fullscreen) |
| 15 | `cursor/creation-first-intro-2d94` | Creation-first intro: blueprint → 3D villa → logo morph |
| 14 | `cursor/client-film-intro-2d94` | Prototype: Open Limits Client Film Intro |
| 13 | `cursor/film-grade-intro-2d94` | Prototype: Open Limits Film-Grade Media-First Intro |
| 12 | `cursor/cinematic-film-prototype-2d94` | Cinematic film prototype — luxury architecture launch |
| 11 | `cursor/intro-prototypes-2d94` | Isolated intro prototypes + comparison page |
| 10 | `cursor/chatgpt-auditor-rule-2d94` | Cursor rule for lead engineer audit protocol |
| 9 | `cursor/luxury-intro-sequence-2d94` | Cinematic luxury intro sequence |
| 8 | `cursor/furniture-import-qc-2d94` | Pre-import QC workflow for furniture PDF |
| 7 | `cursor/furniture-pdf-import-catalog-2d94` | Admin Furniture Import Catalog from PDF |
| 6 | `cursor/furniture-pdf-analyze-2d94` | PDF analysis report for furniture catalog |
| 5 | `cursor/furniture-lumin-catalog-2d94` | Furniture catalog from portfolio images |
| 4 | `cursor/legacy-website-images-2d94` | Import legacy website images |
| 3 | `cursor/intro-blueprint-excel-analyze-2d94` | Blueprint intro + Excel furniture analysis |
| 2 | `cursor/showroom-booking-intro-hotspots-2d94` | Showroom intro, booking calendar, hotspots |
| 1 | `cursor/cms-media-library-c4de` | Phase 2: luxury showroom UX, admin calendar |

---

## Known issues

1. **Intro video is a placeholder** — `public/intro-video/open-limits-intro.mp4` is the bundled prototype capture (489 KB, MD5 `6a89520a…`). Replace with the final master export before production launch.

2. **Headless browser H.264 limitation** — Playwright Chromium on Linux lacks H.264 codec support; automated video playback tests show fallback UI even when the file path is correct. Real Chrome/Safari/Edge play H.264 normally.

3. **16 open draft PRs** — Multiple competing intro prototypes exist on separate branches. Only PR #16 changes the homepage; others are isolated at `/prototype/*` routes.

4. **Prototype media gaps** — Several prototype routes reference `.webm` clips in `public/intro-film/` that may 404; poster image fallbacks are active.

5. **Uncommitted workspace changes** — Prototype visual artifacts and verification scripts may differ from last commit on this branch.

6. **Detached HEAD on some agent sessions** — Confirm branch before merging: `cursor/video-intro-integration-2d94` for video intro work.

---

## Backup contents

This ZIP includes:

- All source code (`app/`, `components/`, `lib/`, `scripts/`)
- All public assets (`public/` including intro video and legacy images)
- Supabase SQL (`supabase/`, migrations)
- Configuration (`package.json`, `tsconfig.json`, `next.config.mjs`, etc.)
- Prototype artifacts (`artifacts/`)
- Git history (`.git/`)
- This export document (`PROJECT_EXPORT.md`)

**Excluded:** `node_modules/`, `.next/`, `out/`

**Restore:** unzip, run `npm install`, copy `.env.example` → `.env.local`, run DB migrations, `npm run dev`.
