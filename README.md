# OPEN LIMITS DESIGN

Luxury architecture, interior design, and furniture website with a full Supabase-powered CMS,
booking system, material library, and AI assistant.

## Tech stack

Next.js · React · TypeScript · Tailwind CSS · Supabase (Auth, Storage, PostgreSQL) · Vercel-ready

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open <http://localhost:3000> — the admin panel is at <http://localhost:3000/admin>.

## One-time database setup

1. Open your Supabase project → **SQL Editor**.
2. Paste the full contents of `supabase/migrations/restore_open_limits.sql` and **Run**.
   (Safe to run more than once — it never duplicates or deletes data.)
3. Back in the project, run:

```bash
npm run db:seed          # seeds services, furniture categories, materials
npm run supabase:verify  # confirms every table exists
```

## Environment variables (`.env.local`)

| Variable | Required | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same page → **legacy** `anon public` key (long `eyJ…` JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (booking API, scripts) | Same page → **legacy** `service_role` key — server-side only |
| `NEXT_PUBLIC_SITE_URL` | Yes | `http://localhost:3000` locally; your domain in production |
| `OPENAI_API_KEY` | Optional | platform.openai.com — AI assistant falls back gracefully without it |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Optional | twilio.com console — booking SMS skips silently without them |

## Site map

| Public | Admin |
|---|---|
| `/` homepage (hero, CEO, services, projects, furniture, booking CTA) | `/admin` dashboard, `/admin/login` |
| `/projects`, `/projects/[slug]` | `/admin/homepage`, `/admin/media` |
| `/furniture` (category filtering), `/furniture/[slug]` | `/admin/services`, `/admin/team`, `/admin/projects` |
| `/materials` material library | `/admin/furniture`, `/admin/furniture/categories`, `/admin/materials` |
| `/services`, `/team`, `/contact` | `/admin/bookings`, `/admin/calendar` |
| `/book-meeting-with-ceo` booking calendar | |

## Content workflow

1. **Upload images** in Admin → Media (drag-and-drop; choose a category such as Furniture, Team, CEO, Materials). Images are optimized to WebP and stored in the `site-media` Supabase Storage bucket.
2. **Homepage / CEO**: Admin → Homepage — hero title/subtitle/image, CEO name/photo/bio, about text, contact details.
3. **Furniture**: Admin → Furniture — manage categories and items (multiple images, dimensions, width/depth/height, materials, finishes, features, collection, availability).
4. **Materials**: Admin → Materials — visual material library linked to furniture items.
5. **Bookings**: Admin → Bookings — accept/reject requests and block dates/times. Confirmed and pending slots become unavailable to clients automatically; rejected slots free up.

## Furniture Excel import

If you have `ALI ALMOHANDI-FURNITURE.xlsx`:

```bash
npm install xlsx
npm run furniture:import           # uses the file in the project root
# or: node scripts/import-furniture-from-excel.mjs path/to/file.xlsx
```

Embedded Excel images cannot be extracted automatically — upload photos through Admin → Media
and assign them to items.

## Scripts

```bash
npm run dev               # local development
npm run build             # production build
npm run typecheck         # TypeScript check
npm run lint              # ESLint
npm run db:seed           # idempotent CMS seeding
npm run supabase:verify   # check Supabase connection + tables
npm run furniture:import  # import furniture from Excel
```

## Mobile access & deployment

`localhost` only works on the computer running the dev server — a phone on mobile data cannot
reach it. To view the site on your phone, deploy to [Vercel](https://vercel.com):

1. Import the GitHub repo into Vercel.
2. Add every variable from `.env.local` in Vercel → Project → Settings → Environment Variables.
3. Deploy, then point the `wrx.ad` domain at the Vercel project.
