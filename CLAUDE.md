# Claude Code — Open Limits Design (legacy/full CMS website)

Read `README.md`, `PROJECT_EXPORT.md`, and `BACKUP_MANIFEST.txt` before implementation. This is an existing luxury architecture, interiors, bespoke furniture, Supabase CMS and booking website. It is **not** automatically the same deployed app as `open-limits` or `openlimitsdesign`; do not merge, deploy, or switch domains without verifying the intended source and current production state.

## Stack and conventions
- Next.js App Router, React, TypeScript, Tailwind CSS v4, Supabase, Vercel.
- Preserve the existing content, routes, CMS, assets, SEO, and bilingual behavior where implemented.
- Design to Open Limits' luxury editorial, cinematic, restrained brand standard; no generic AI website templates. Use licensed authentic project imagery, not invented real projects.
- For visual updates: inspect before editing; lock the reference design; do not redesign furniture or architectural geometry when only a color, angle, or isolation change was requested.

## Safety and acceptance
- Never commit `.env*`, Supabase service-role keys, private customer information, or media with unverified permissions.
- Don't execute seed scripts, migrations, content publication, advertising actions, or production deployment without explicit project-specific approval and a verified backup.
- Work on a feature branch, keep changes small and reversible, and never force-push.
- Use `npm install` only with verified prerequisites; run `npm run lint` / `npm run build` if present before claiming success.
- Preserve working projects and track whether a feature is demo-only, connected, or production.
- For any AI creative service (Skywork, Higgsfield, etc.) verify current provider and integration; never hardcode an unverified API.

## Migration scope
Claude Code can use this repository in place. Existing source, Git history, environment secrets, and deployment settings are not "migrated" automatically by this instruction file. Import only verified missing changes from local branches after a diff and secret scan.
