#!/usr/bin/env node
/**
 * Test image upload pipelines against live Supabase (service role).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
loadEnv();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Minimal 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function uploadTestAsset(category, label) {
  const testPath = `audit/${label}-${Date.now()}.png`;
  const { error: uploadError } = await admin.storage.from("site-media").upload(testPath, PNG, {
    contentType: "image/png",
    upsert: true
  });
  if (uploadError) return { step: "storage", ok: false, error: uploadError.message };

  const publicUrl = admin.storage.from("site-media").getPublicUrl(testPath).data.publicUrl;
  const { data, error } = await admin
    .from("media_assets")
    .insert({
      title: `Audit ${label}`,
      category,
      storage_path: testPath,
      public_url: publicUrl,
      mime_type: "image/png",
      width: 1,
      height: 1
    })
    .select("id")
    .single();

  if (error) {
    await admin.storage.from("site-media").remove([testPath]);
    return { step: "media_assets", ok: false, error: error.message };
  }

  return { ok: true, mediaId: data.id, publicUrl, testPath };
}

async function testCeoImage(mediaId) {
  const { error } = await admin.from("company_profile").update({ ceo_image_id: mediaId }).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  const { data } = await admin
    .from("company_profile")
    .select("*, ceo_image:media_assets!company_profile_ceo_image_id_fkey(*)")
    .eq("id", 1)
    .single();
  return { ok: Boolean(data?.ceo_image?.id), join: data?.ceo_image?.public_url ?? null };
}

async function testTeamPhoto(mediaId, publicUrl) {
  const { data: member } = await admin.from("team_members").select("id").limit(1).maybeSingle();
  if (!member) return { ok: false, error: "no team member" };

  let { error } = await admin.from("team_members").update({ photo_id: mediaId }).eq("id", member.id);
  if (error?.message?.includes("photo_id")) {
    ({ error } = await admin.from("team_members").update({ photo_url: publicUrl }).eq("id", member.id));
    if (error) return { ok: false, error: error.message, mode: "photo_url legacy" };
    return { ok: true, mode: "photo_url legacy" };
  }
  if (error) return { ok: false, error: error.message };

  const { error: joinError } = await admin
    .from("team_members")
    .select("*, photo:media_assets!team_members_photo_id_fkey(*)")
    .eq("id", member.id)
    .single();
  return { ok: !joinError, mode: "photo_id FK", joinError: joinError?.message ?? null };
}

async function testProjectImage(mediaId, publicUrl) {
  const slug = `audit-project-${Date.now()}`;
  let { data, error } = await admin
    .from("projects")
    .insert({
      slug,
      title: "Audit Project",
      featured_image_id: mediaId,
      cover_image_url: publicUrl,
      is_published: true,
      is_featured: false,
      sort_order: 999
    })
    .select("id")
    .single();

  if (error?.message?.includes("featured_image_id")) {
    ({ data, error } = await admin
      .from("projects")
      .insert({
        slug,
        title: "Audit Project",
        cover_image_url: publicUrl,
        is_published: true,
        is_featured: false,
        sort_order: 999
      })
      .select("id")
      .single());
    if (error) return { ok: false, error: error.message };
    await admin.from("projects").delete().eq("id", data.id);
    return { ok: true, mode: "cover_image_url legacy" };
  }
  if (error) return { ok: false, error: error.message };

  const { error: joinError } = await admin
    .from("projects")
    .select("*, featured_image:media_assets!projects_featured_image_id_fkey(*)")
    .eq("id", data.id)
    .single();
  await admin.from("projects").delete().eq("id", data.id);
  return { ok: !joinError, mode: "featured_image_id FK", joinError: joinError?.message ?? null };
}

async function testFurnitureImage(mediaId) {
  const { data: category } = await admin.from("furniture_categories").select("id").limit(1).maybeSingle();
  if (!category) return { ok: false, error: "no furniture category" };

  const slug = `audit-furniture-${Date.now()}`;
  const { data, error } = await admin
    .from("furniture_items")
    .insert({
      slug,
      title: "Audit Sofa",
      description: "Audit test item",
      category_id: category.id,
      featured_image_id: mediaId,
      published: true,
      sort_order: 999
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const { error: joinError } = await admin
    .from("furniture_items")
    .select("*, featured_image:media_assets!furniture_items_featured_image_id_fkey(*)")
    .eq("id", data.id)
    .single();
  await admin.from("furniture_items").delete().eq("id", data.id);
  return { ok: !joinError, mode: "featured_image_id FK", joinError: joinError?.message ?? null };
}

async function cleanup(mediaId, testPath) {
  await admin.from("media_assets").delete().eq("id", mediaId);
  await admin.storage.from("site-media").remove([testPath]);
}

console.log("=== IMAGE UPLOAD TESTS ===\n");

const results = {};

for (const [label, category] of [
  ["ceo", "CEO"],
  ["team", "Team"],
  ["project", "Projects"],
  ["furniture", "Furniture"]
]) {
  const uploaded = await uploadTestAsset(category, label);
  results[`${label}_upload`] = uploaded;
  if (!uploaded.ok) continue;

  if (label === "ceo") results.ceo_link = await testCeoImage(uploaded.mediaId);
  if (label === "team") results.team_link = await testTeamPhoto(uploaded.mediaId, uploaded.publicUrl);
  if (label === "project") results.project_link = await testProjectImage(uploaded.mediaId, uploaded.publicUrl);
  if (label === "furniture") results.furniture_link = await testFurnitureImage(uploaded.mediaId);

  await cleanup(uploaded.mediaId, uploaded.testPath);
}

console.log(JSON.stringify(results, null, 2));

const failed = Object.entries(results).filter(([, v]) => v && v.ok === false);
process.exit(failed.length ? 1 : 0);
