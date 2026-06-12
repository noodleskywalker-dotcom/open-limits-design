# Open Limits Design

Next.js website with a Supabase-powered content management system for replacing all site images and content without editing code.

## Features

- Admin media library at `/admin`
- Drag-and-drop image uploads from desktop or mobile
- Supabase Storage bucket for hosted images
- Automatic client-side image resizing and WebP optimization before upload
- Media categories:
  - Architecture
  - Projects
  - Interior Design
  - Furniture
  - Team
  - CEO
  - Company
- Dynamic project pages with cover images, galleries, locations, completion dates, and before/after comparisons
- Furniture CMS with manageable categories, multiple item images, dimensions, materials, descriptions, and category assignments
- Homepage CMS controls for CEO image, background images, hero copy, and company details
- Team CMS for adding, editing, removing, publishing, and hiding staff members
- Services CMS for editable service text
- Public pages fall back to starter content until Supabase is configured

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Supabase setup

1. Create a Supabase project.
2. Enable Email auth in Supabase Auth.
3. Apply the migration in `supabase/migrations/20260610152700_create_cms.sql`.
4. Invite/create the admin user in Supabase Auth.
5. Visit `/admin`, enter the admin email, and use the magic link to sign in.

The migration creates:

- `site-media` public storage bucket with image MIME type limits
- CMS tables for media, company profile, homepage hero images, projects, project galleries, before/after comparisons, team members, and services
- Furniture CMS tables for categories, items, and item image galleries
- Row-level security policies:
  - visitors can read public/published content
  - authenticated users can manage CMS records and upload/delete storage objects

## Content workflow

1. Upload images in `/admin` and select the correct category.
2. Assign CEO and homepage background images from the Company tab.
3. Create projects and choose:
   - title
   - slug
   - description
   - location
   - completion date
   - featured cover image
   - gallery images
   - before/after comparison pairs
4. Add staff photos in the Media tab using the Team category, then create team members in the Team tab.
5. Upload furniture images using the Furniture category, then create furniture categories and items in the Furniture tab.
6. Edit services and company information from their CMS tabs.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```