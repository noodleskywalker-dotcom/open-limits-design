"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  MEDIA_CATEGORIES,
  resolveImageUrl,
  type CompanyProfile,
  type MediaAsset,
  type MediaCategory,
  type Project,
  type ProjectComparison,
  type Service,
  type TeamMember
} from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import AdminLogin from "./AdminLogin";
import BookingsAdminPanel from "./BookingsAdminPanel";
import FurnitureAdminPanel from "./FurnitureAdminPanel";
import MaterialsAdminPanel from "./MaterialsAdminPanel";

export type AdminTab =
  | "media"
  | "homepage"
  | "services"
  | "team"
  | "projects"
  | "furniture"
  | "materials"
  | "bookings";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "media", label: "Media" },
  { id: "homepage", label: "Homepage" },
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "projects", label: "Projects" },
  { id: "furniture", label: "Furniture" },
  { id: "materials", label: "Materials" },
  { id: "bookings", label: "Bookings" }
];

type ProjectForm = {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  category: string;
  completionDate: string;
  featuredImageId: string;
  galleryIds: string[];
  sortOrder: string;
  isFeatured: boolean;
  isPublished: boolean;
};

type TeamForm = {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  photoId: string;
  sortOrder: string;
  isActive: boolean;
};

type ServiceForm = {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  imageId: string;
  sortOrder: string;
  isActive: boolean;
};

type ComparisonForm = {
  label: string;
  beforeImageId: string;
  afterImageId: string;
};

const blankProject: ProjectForm = {
  id: "",
  title: "",
  slug: "",
  description: "",
  location: "",
  category: "",
  completionDate: "",
  featuredImageId: "",
  galleryIds: [],
  sortOrder: "0",
  isFeatured: false,
  isPublished: true
};

const blankTeam: TeamForm = {
  id: "",
  name: "",
  role: "",
  bio: "",
  email: "",
  photoId: "",
  sortOrder: "0",
  isActive: true
};

const blankService: ServiceForm = {
  id: "",
  title: "",
  slug: "",
  description: "",
  icon: "",
  imageId: "",
  sortOrder: "0",
  isActive: true
};

const blankComparison: ComparisonForm = {
  label: "",
  beforeImageId: "",
  afterImageId: ""
};

const storageBucket = "site-media";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryPath(category: MediaCategory) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function filenameTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

async function optimizeImage(file: File): Promise<{ file: File; width: number; height: number }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return { file, width: 0, height: 0 };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });

  const maxDimension = 2400;
  const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return { file, width: image.width, height: image.height };
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob) {
    return { file, width: image.width, height: image.height };
  }

  const optimizedName = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
  return {
    file: new File([blob], optimizedName, { type: "image/webp" }),
    width,
    height
  };
}

export function SelectImage({
  value,
  onChange,
  media,
  categories,
  label
}: {
  value: string;
  onChange: (value: string) => void;
  media: MediaAsset[];
  categories?: MediaCategory[];
  label: string;
}) {
  const options = categories?.length
    ? media.filter((asset) => categories.includes(asset.category))
    : media;

  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No image selected</option>
        {options.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.title} ({asset.category})
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminDashboard({ initialTab = "media" }: { initialTab?: AdminTab }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | "All">("All");
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("Projects");
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [heroImageIds, setHeroImageIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [projectForm, setProjectForm] = useState<ProjectForm>(blankProject);
  const [teamForm, setTeamForm] = useState<TeamForm>(blankTeam);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(blankService);
  const [comparisonForm, setComparisonForm] = useState<ComparisonForm>(blankComparison);

  const visibleMedia =
    categoryFilter === "All" ? media : media.filter((asset) => asset.category === categoryFilter);
  const selectedProject = projects.find((project) => project.id === projectForm.id);

  const loadAdminData = useCallback(async () => {
    if (!supabase) return;

    const [mediaResult, companyResult, heroResult, projectResult, teamResult, serviceResult] =
      await Promise.all([
        supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
        supabase.from("company_profile").select("*, ceo_image:media_assets(*)").eq("id", 1).maybeSingle(),
        supabase.from("homepage_hero_images").select("*, media:media_assets(*)").order("sort_order"),
        supabase
          .from("projects")
          .select(
            "*, featured_image:media_assets(*), project_images(media_id, sort_order, media:media_assets(*)), project_comparisons(*, before_image:media_assets!project_comparisons_before_image_id_fkey(*), after_image:media_assets!project_comparisons_after_image_id_fkey(*))"
          )
          .order("sort_order"),
        supabase.from("team_members").select("*, photo:media_assets(*)").order("sort_order"),
        supabase.from("services").select("*, image:media_assets(*)").order("sort_order")
      ]);

    if (mediaResult.error) throw mediaResult.error;

    setMedia((mediaResult.data ?? []) as MediaAsset[]);
    setCompany((companyResult.data as CompanyProfile | null) ?? null);
    setHeroImageIds(((heroResult.data ?? []) as { media_id: string }[]).map((item) => item.media_id));
    setProjects(
      (
        (projectResult.data ?? []) as Array<
          Project & {
            project_images?: { media_id: string; sort_order: number; media: MediaAsset | null }[];
            project_comparisons?: ProjectComparison[];
          }
        >
      ).map((project) => ({
        ...project,
        gallery: (project.project_images ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => item.media)
          .filter((asset): asset is MediaAsset => Boolean(asset)),
        comparisons: (project.project_comparisons ?? []).sort((a, b) => a.sort_order - b.sort_order)
      }))
    );
    setTeam((teamResult.data ?? []) as TeamMember[]);
    setServices((serviceResult.data ?? []) as Service[]);

    const joinError = teamResult.error ?? serviceResult.error ?? projectResult.error;
    if (joinError) {
      throw new Error(joinError.message);
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      // Supabase env missing; mark the session check finished so the setup notice renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionLoaded(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;

    // Initial CMS synchronization after authentication; Supabase is the source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData().catch((loadError: Error) => {
      setError(
        loadError.message.includes("schema cache") || loadError.message.includes("relationship")
          ? `${loadError.message} — run supabase/migrations/restore_open_limits.sql in the Supabase SQL Editor, then reload.`
          : loadError.message
      );
    });
  }, [loadAdminData, session]);

  async function uploadFiles(files: FileList | File[]) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      for (const originalFile of Array.from(files)) {
        const optimized = await optimizeImage(originalFile);
        const extension = optimized.file.name.split(".").pop() ?? "webp";
        const path = `${categoryPath(uploadCategory)}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(path, optimized.file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: optimized.file.type
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
        const { error: insertError } = await supabase.from("media_assets").insert({
          title: filenameTitle(originalFile),
          alt_text: filenameTitle(originalFile),
          category: uploadCategory,
          storage_path: path,
          public_url: data.publicUrl,
          mime_type: optimized.file.type,
          width: optimized.width || null,
          height: optimized.height || null,
          size_bytes: optimized.file.size
        });

        if (insertError) throw insertError;
      }

      setMessage("Upload complete. Images were optimized before storage.");
      await loadAdminData();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteMedia(asset: MediaAsset) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: storageError } = await supabase.storage.from(storageBucket).remove([asset.storage_path]);
    const { error: databaseError } = await supabase.from("media_assets").delete().eq("id", asset.id);
    setBusy(false);
    if (storageError || databaseError) {
      setError(storageError?.message ?? databaseError?.message ?? "Unable to delete image");
      return;
    }
    setMessage("Image removed.");
    await loadAdminData();
  }

  async function copyUrl(asset: MediaAsset) {
    await navigator.clipboard.writeText(asset.public_url);
    setMessage("Image URL copied to clipboard.");
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !company) return;
    setBusy(true);
    setError("");

    const { error: upsertError } = await supabase.from("company_profile").upsert({
      id: 1,
      name: company.name,
      tagline: company.tagline,
      description: company.description,
      address: company.address,
      phone: company.phone,
      phone2: company.phone2,
      email: company.email,
      hero_headline: company.hero_headline,
      hero_subheadline: company.hero_subheadline,
      ceo_image_id: company.ceo_image_id || null,
      ceo_name: company.ceo_name,
      ceo_bio: company.ceo_bio,
      about_text: company.about_text,
      map_query: company.map_query || null
    });

    const { error: deleteHeroError } = await supabase
      .from("homepage_hero_images")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: insertHeroError } = heroImageIds.length
      ? await supabase.from("homepage_hero_images").insert(
          heroImageIds.map((mediaId, index) => ({ media_id: mediaId, sort_order: index }))
        )
      : { error: null };

    setBusy(false);
    if (upsertError || deleteHeroError || insertHeroError) {
      setError(
        upsertError?.message ??
          deleteHeroError?.message ??
          insertHeroError?.message ??
          "Unable to save homepage content"
      );
      return;
    }
    setMessage("Homepage content saved.");
    await loadAdminData();
  }

  function editService(service: Service) {
    setTab("services");
    setServiceForm({
      id: service.id,
      title: service.title,
      slug: service.slug ?? "",
      description: service.description,
      icon: service.icon ?? "",
      imageId: service.image_id ?? "",
      sortOrder: String(service.sort_order ?? 0),
      isActive: service.is_active
    });
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const payload = {
      title: serviceForm.title,
      slug: serviceForm.slug || slugify(serviceForm.title),
      description: serviceForm.description,
      icon: serviceForm.icon || null,
      image_id: serviceForm.imageId || null,
      sort_order: Number(serviceForm.sortOrder) || 0,
      is_active: serviceForm.isActive
    };
    const { error: saveError } = serviceForm.id
      ? await supabase.from("services").update(payload).eq("id", serviceForm.id)
      : await supabase.from("services").insert(payload);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setServiceForm(blankService);
    setMessage("Service saved.");
    await loadAdminData();
  }

  async function deleteService(serviceId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("services").delete().eq("id", serviceId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAdminData();
  }

  function editTeam(member: TeamMember) {
    setTab("team");
    setTeamForm({
      id: member.id,
      name: member.name,
      role: member.role,
      bio: member.bio ?? "",
      email: member.email ?? "",
      photoId: member.photo_id ?? "",
      sortOrder: String(member.sort_order ?? 0),
      isActive: member.is_active
    });
  }

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const payload = {
      name: teamForm.name,
      role: teamForm.role,
      bio: teamForm.bio || null,
      email: teamForm.email || null,
      photo_id: teamForm.photoId || null,
      sort_order: Number(teamForm.sortOrder) || 0,
      is_active: teamForm.isActive
    };
    const { error: saveError } = teamForm.id
      ? await supabase.from("team_members").update(payload).eq("id", teamForm.id)
      : await supabase.from("team_members").insert(payload);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setTeamForm(blankTeam);
    setMessage("Team member saved.");
    await loadAdminData();
  }

  async function deleteTeam(memberId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("team_members").delete().eq("id", memberId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAdminData();
  }

  function editProject(project: Project) {
    setTab("projects");
    setProjectForm({
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description ?? "",
      location: project.location ?? "",
      category: project.category ?? "",
      completionDate: project.completion_date ?? "",
      featuredImageId: project.featured_image_id ?? "",
      galleryIds: project.gallery?.map((asset) => asset.id) ?? [],
      sortOrder: String(project.sort_order ?? 0),
      isFeatured: project.is_featured,
      isPublished: project.is_published
    });
  }

  async function replaceProjectGallery(client: SupabaseClient, projectId: string, imageIds: string[]) {
    const { error: deleteError } = await client.from("project_images").delete().eq("project_id", projectId);
    if (deleteError) throw deleteError;

    if (!imageIds.length) return;

    const { error: insertError } = await client.from("project_images").insert(
      imageIds.map((mediaId, index) => ({
        project_id: projectId,
        media_id: mediaId,
        sort_order: index
      }))
    );
    if (insertError) throw insertError;
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");

    try {
      const payload = {
        title: projectForm.title,
        slug: projectForm.slug || slugify(projectForm.title),
        description: projectForm.description || null,
        location: projectForm.location || null,
        category: projectForm.category || null,
        completion_date: projectForm.completionDate || null,
        featured_image_id: projectForm.featuredImageId || null,
        sort_order: Number(projectForm.sortOrder) || 0,
        is_featured: projectForm.isFeatured,
        is_published: projectForm.isPublished
      };

      const result = projectForm.id
        ? await supabase.from("projects").update(payload).eq("id", projectForm.id).select("id").single()
        : await supabase.from("projects").insert(payload).select("id").single();

      if (result.error) throw result.error;
      await replaceProjectGallery(supabase, result.data.id as string, projectForm.galleryIds);
      setProjectForm(blankProject);
      setMessage("Project saved.");
      await loadAdminData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProject(projectId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("projects").delete().eq("id", projectId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage("Project deleted.");
    await loadAdminData();
  }

  async function addComparison(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !projectForm.id) return;

    const { error: insertError } = await supabase.from("project_comparisons").insert({
      project_id: projectForm.id,
      label: comparisonForm.label,
      before_image_id: comparisonForm.beforeImageId,
      after_image_id: comparisonForm.afterImageId,
      sort_order: selectedProject?.comparisons?.length ?? 0
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setComparisonForm(blankComparison);
    setMessage("Before/after comparison added.");
    await loadAdminData();
  }

  async function deleteComparison(comparisonId: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase
      .from("project_comparisons")
      .delete()
      .eq("id", comparisonId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAdminData();
  }

  if (!supabase) {
    return (
      <main className="page">
        <section className="section">
          <div className="empty-state">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
            <code> .env.local</code>, then restart the dev server. The public site keeps rendering
            fallback content until Supabase is connected.
          </div>
        </section>
      </main>
    );
  }

  if (!sessionLoaded) {
    return (
      <main className="page">
        <section className="section">
          <p className="booking-loading">Loading admin…</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <section className="section">
          <AdminLogin />
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="section">
        <div className="admin-toolbar">
          <div>
            <p className="eyebrow">Admin CMS</p>
            <h1>Content management</h1>
            <p>Signed in as {session.user.email}. Everything below updates the live website.</p>
          </div>
          <button className="button ghost" onClick={() => supabase.auth.signOut()} type="button">
            Sign out
          </button>
        </div>

        {message ? <p className="status success">{message}</p> : null}
        {error ? <p className="status error">{error}</p> : null}

        <div className="admin-shell">
          <aside className="admin-sidebar">
            {TABS.map((item) => (
              <button
                className={`tab-button ${tab === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </aside>

          <section className="admin-panel">
            {tab === "media" ? (
              <div>
                <div className="admin-toolbar">
                  <div>
                    <h2>Media library</h2>
                    <p>Drag images from desktop or mobile. Uploads are optimized to WebP.</p>
                  </div>
                  <label className="field">
                    <span>Upload category</span>
                    <select
                      onChange={(event) => setUploadCategory(event.target.value as MediaCategory)}
                      value={uploadCategory}
                    >
                      {MEDIA_CATEGORIES.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label
                  className="dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    uploadFiles(event.dataTransfer.files);
                  }}
                >
                  <strong>Drop photos here or tap to select</strong>
                  <span>
                    Categories: Architecture, Projects, Interior Design, Furniture, Materials, Team,
                    CEO, Company
                  </span>
                  <input
                    accept="image/*"
                    multiple
                    onChange={(event) => event.target.files && uploadFiles(event.target.files)}
                    type="file"
                  />
                </label>

                <div className="admin-toolbar">
                  <label className="field">
                    <span>Filter category</span>
                    <select
                      onChange={(event) =>
                        setCategoryFilter(event.target.value as MediaCategory | "All")
                      }
                      value={categoryFilter}
                    >
                      <option>All</option>
                      {MEDIA_CATEGORIES.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="media-grid">
                  {visibleMedia.map((asset) => (
                    <article className="media-tile" key={asset.id}>
                      <img alt={asset.alt_text ?? asset.title} src={asset.public_url} />
                      <div className="card-body">
                        <strong>{asset.title}</strong>
                        <small>{asset.category}</small>
                        <div className="button-row">
                          <button className="button ghost" onClick={() => copyUrl(asset)} type="button">
                            Copy URL
                          </button>
                          <button
                            className="button ghost"
                            disabled={busy}
                            onClick={() => deleteMedia(asset)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "homepage" ? (
              <form className="form-grid" onSubmit={saveCompany}>
                <div className="field full">
                  <h2>Homepage, CEO & company</h2>
                  <p>Hero text, hero image, CEO portrait/bio, about text, and contact details.</p>
                </div>
                <label className="field">
                  <span>Company name</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), name: event.target.value }) as CompanyProfile)
                    }
                    required
                    value={company?.name ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Tagline</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), tagline: event.target.value }) as CompanyProfile)
                    }
                    value={company?.tagline ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Hero title</span>
                  <input
                    onChange={(event) =>
                      setCompany(
                        (c) => ({ ...(c ?? { id: 1 }), hero_headline: event.target.value }) as CompanyProfile
                      )
                    }
                    value={company?.hero_headline ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Hero subtitle</span>
                  <input
                    onChange={(event) =>
                      setCompany(
                        (c) => ({ ...(c ?? { id: 1 }), hero_subheadline: event.target.value }) as CompanyProfile
                      )
                    }
                    value={company?.hero_subheadline ?? ""}
                  />
                </label>
                <label className="field full">
                  <span>Company description</span>
                  <textarea
                    onChange={(event) =>
                      setCompany(
                        (c) => ({ ...(c ?? { id: 1 }), description: event.target.value }) as CompanyProfile
                      )
                    }
                    value={company?.description ?? ""}
                  />
                </label>
                <label className="field full">
                  <span>About text</span>
                  <textarea
                    onChange={(event) =>
                      setCompany(
                        (c) => ({ ...(c ?? { id: 1 }), about_text: event.target.value }) as CompanyProfile
                      )
                    }
                    value={company?.about_text ?? ""}
                  />
                </label>
                <label className="field">
                  <span>CEO name</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), ceo_name: event.target.value }) as CompanyProfile)
                    }
                    value={company?.ceo_name ?? ""}
                  />
                </label>
                <SelectImage
                  categories={["CEO", "Team"]}
                  label="CEO image"
                  media={media}
                  onChange={(value) =>
                    setCompany((c) => ({ ...(c ?? { id: 1 }), ceo_image_id: value }) as CompanyProfile)
                  }
                  value={company?.ceo_image_id ?? ""}
                />
                <label className="field full">
                  <span>CEO biography</span>
                  <textarea
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), ceo_bio: event.target.value }) as CompanyProfile)
                    }
                    value={company?.ceo_bio ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Address</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), address: event.target.value }) as CompanyProfile)
                    }
                    value={company?.address ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), phone: event.target.value }) as CompanyProfile)
                    }
                    value={company?.phone ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Phone 2</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), phone2: event.target.value }) as CompanyProfile)
                    }
                    value={company?.phone2 ?? ""}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), email: event.target.value }) as CompanyProfile)
                    }
                    value={company?.email ?? ""}
                  />
                </label>
                <label className="field full">
                  <span>Map location (Google Maps search text — leave blank to use the address)</span>
                  <input
                    onChange={(event) =>
                      setCompany((c) => ({ ...(c ?? { id: 1 }), map_query: event.target.value }) as CompanyProfile)
                    }
                    placeholder="Street 303, Zone 69, Building 254, Unit 303, Lusail, Qatar"
                    value={company?.map_query ?? ""}
                  />
                </label>
                <label className="field full">
                  <span>Hero images (first one is shown; hold Ctrl/Cmd to select multiple)</span>
                  <select
                    multiple
                    onChange={(event) =>
                      setHeroImageIds(Array.from(event.target.selectedOptions).map((o) => o.value))
                    }
                    value={heroImageIds}
                  >
                    {media.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title} ({asset.category})
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button" disabled={busy} type="submit">
                  Save homepage content
                </button>
              </form>
            ) : null}

            {tab === "services" ? (
              <div>
                <form className="form-grid" onSubmit={saveService}>
                  <div className="field full">
                    <h2>{serviceForm.id ? "Edit service" : "Add service"}</h2>
                  </div>
                  <label className="field">
                    <span>Title</span>
                    <input
                      onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })}
                      required
                      value={serviceForm.title}
                    />
                  </label>
                  <label className="field">
                    <span>Slug</span>
                    <input
                      onChange={(event) => setServiceForm({ ...serviceForm, slug: event.target.value })}
                      placeholder="auto-generated if blank"
                      value={serviceForm.slug}
                    />
                  </label>
                  <label className="field full">
                    <span>Description</span>
                    <textarea
                      onChange={(event) =>
                        setServiceForm({ ...serviceForm, description: event.target.value })
                      }
                      required
                      value={serviceForm.description}
                    />
                  </label>
                  <SelectImage
                    label="Service image"
                    media={media}
                    onChange={(value) => setServiceForm({ ...serviceForm, imageId: value })}
                    value={serviceForm.imageId}
                  />
                  <label className="field">
                    <span>Sort order</span>
                    <input
                      onChange={(event) =>
                        setServiceForm({ ...serviceForm, sortOrder: event.target.value })
                      }
                      value={serviceForm.sortOrder}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      onChange={(event) =>
                        setServiceForm({ ...serviceForm, isActive: event.target.value === "true" })
                      }
                      value={String(serviceForm.isActive)}
                    >
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </label>
                  <div className="button-row">
                    <button className="button" type="submit">
                      Save service
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => setServiceForm(blankService)}
                      type="button"
                    >
                      New service
                    </button>
                  </div>
                </form>
                <div className="row-list">
                  {services.map((service) => (
                    <div className="row-item" key={service.id}>
                      {resolveImageUrl(service.image, service.image_url) ? (
                        <img
                          alt={service.title}
                          src={resolveImageUrl(service.image, service.image_url)!}
                        />
                      ) : (
                        <div className="row-thumb" />
                      )}
                      <div>
                        <strong>{service.title}</strong>
                        <p>{service.is_active ? "Active" : "Hidden"}</p>
                      </div>
                      <div className="button-row">
                        <button className="button ghost" onClick={() => editService(service)} type="button">
                          Edit
                        </button>
                        <button
                          className="button ghost"
                          onClick={() => deleteService(service.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "team" ? (
              <div>
                <form className="form-grid" onSubmit={saveTeam}>
                  <div className="field full">
                    <h2>{teamForm.id ? "Edit team member" : "Add team member"}</h2>
                  </div>
                  <label className="field">
                    <span>Name</span>
                    <input
                      onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                      required
                      value={teamForm.name}
                    />
                  </label>
                  <label className="field">
                    <span>Position</span>
                    <input
                      onChange={(event) => setTeamForm({ ...teamForm, role: event.target.value })}
                      required
                      value={teamForm.role}
                    />
                  </label>
                  <label className="field full">
                    <span>Bio</span>
                    <textarea
                      onChange={(event) => setTeamForm({ ...teamForm, bio: event.target.value })}
                      value={teamForm.bio}
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      onChange={(event) => setTeamForm({ ...teamForm, email: event.target.value })}
                      value={teamForm.email}
                    />
                  </label>
                  <SelectImage
                    categories={["Team", "CEO"]}
                    label="Photo"
                    media={media}
                    onChange={(value) => setTeamForm({ ...teamForm, photoId: value })}
                    value={teamForm.photoId}
                  />
                  <label className="field">
                    <span>Sort order</span>
                    <input
                      onChange={(event) => setTeamForm({ ...teamForm, sortOrder: event.target.value })}
                      value={teamForm.sortOrder}
                    />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      onChange={(event) =>
                        setTeamForm({ ...teamForm, isActive: event.target.value === "true" })
                      }
                      value={String(teamForm.isActive)}
                    >
                      <option value="true">Active</option>
                      <option value="false">Hidden</option>
                    </select>
                  </label>
                  <div className="button-row">
                    <button className="button" type="submit">
                      Save team member
                    </button>
                    <button className="button ghost" onClick={() => setTeamForm(blankTeam)} type="button">
                      New team member
                    </button>
                  </div>
                </form>
                <div className="row-list">
                  {team.map((member) => (
                    <div className="row-item" key={member.id}>
                      {resolveImageUrl(member.photo, member.photo_url) ? (
                        <img alt={member.name} src={resolveImageUrl(member.photo, member.photo_url)!} />
                      ) : (
                        <div className="row-thumb" />
                      )}
                      <div>
                        <strong>{member.name}</strong>
                        <p>
                          {member.role} · {member.is_active ? "Active" : "Hidden"}
                        </p>
                      </div>
                      <div className="button-row">
                        <button className="button ghost" onClick={() => editTeam(member)} type="button">
                          Edit
                        </button>
                        <button className="button ghost" onClick={() => deleteTeam(member.id)} type="button">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "projects" ? (
              <div>
                <form className="form-grid" onSubmit={saveProject}>
                  <div className="field full">
                    <h2>{projectForm.id ? "Edit project" : "Create project"}</h2>
                  </div>
                  <label className="field">
                    <span>Title</span>
                    <input
                      onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
                      required
                      value={projectForm.title}
                    />
                  </label>
                  <label className="field">
                    <span>Slug</span>
                    <input
                      onChange={(event) => setProjectForm({ ...projectForm, slug: event.target.value })}
                      placeholder="auto-generated if blank"
                      value={projectForm.slug}
                    />
                  </label>
                  <label className="field full">
                    <span>Description</span>
                    <textarea
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, description: event.target.value })
                      }
                      value={projectForm.description}
                    />
                  </label>
                  <label className="field">
                    <span>Location</span>
                    <input
                      onChange={(event) => setProjectForm({ ...projectForm, location: event.target.value })}
                      value={projectForm.location}
                    />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <input
                      onChange={(event) => setProjectForm({ ...projectForm, category: event.target.value })}
                      placeholder="Interiors, Bedrooms, Majlis…"
                      value={projectForm.category}
                    />
                  </label>
                  <label className="field">
                    <span>Completion date</span>
                    <input
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, completionDate: event.target.value })
                      }
                      type="date"
                      value={projectForm.completionDate}
                    />
                  </label>
                  <SelectImage
                    label="Cover image"
                    media={media}
                    onChange={(value) => setProjectForm({ ...projectForm, featuredImageId: value })}
                    value={projectForm.featuredImageId}
                  />
                  <label className="field full">
                    <span>Gallery images (hold Ctrl/Cmd to select multiple)</span>
                    <select
                      multiple
                      onChange={(event) =>
                        setProjectForm({
                          ...projectForm,
                          galleryIds: Array.from(event.target.selectedOptions).map((o) => o.value)
                        })
                      }
                      value={projectForm.galleryIds}
                    >
                      {media.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title} ({asset.category})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Sort order</span>
                    <input
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, sortOrder: event.target.value })
                      }
                      value={projectForm.sortOrder}
                    />
                  </label>
                  <label className="field">
                    <span>Featured</span>
                    <select
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, isFeatured: event.target.value === "true" })
                      }
                      value={String(projectForm.isFeatured)}
                    >
                      <option value="false">No</option>
                      <option value="true">Featured on homepage</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select
                      onChange={(event) =>
                        setProjectForm({ ...projectForm, isPublished: event.target.value === "true" })
                      }
                      value={String(projectForm.isPublished)}
                    >
                      <option value="true">Published</option>
                      <option value="false">Draft</option>
                    </select>
                  </label>
                  <div className="button-row">
                    <button className="button" disabled={busy} type="submit">
                      Save project
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => setProjectForm(blankProject)}
                      type="button"
                    >
                      New project
                    </button>
                  </div>
                </form>

                {projectForm.id ? (
                  <form className="form-grid form-card" onSubmit={addComparison}>
                    <div className="field full">
                      <h3>Before/after comparisons</h3>
                    </div>
                    <label className="field">
                      <span>Label</span>
                      <input
                        onChange={(event) =>
                          setComparisonForm({ ...comparisonForm, label: event.target.value })
                        }
                        required
                        value={comparisonForm.label}
                      />
                    </label>
                    <SelectImage
                      label="Before image"
                      media={media}
                      onChange={(value) => setComparisonForm({ ...comparisonForm, beforeImageId: value })}
                      value={comparisonForm.beforeImageId}
                    />
                    <SelectImage
                      label="After image"
                      media={media}
                      onChange={(value) => setComparisonForm({ ...comparisonForm, afterImageId: value })}
                      value={comparisonForm.afterImageId}
                    />
                    <button className="button" type="submit">
                      Add comparison
                    </button>
                    <div className="row-list full">
                      {selectedProject?.comparisons?.map((comparison) => (
                        <div className="row-item" key={comparison.id}>
                          <div className="row-thumb" />
                          <div>
                            <strong>{comparison.label}</strong>
                            <p>Before/after pair</p>
                          </div>
                          <button
                            className="button ghost"
                            onClick={() => deleteComparison(comparison.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </form>
                ) : null}

                <div className="row-list">
                  {projects.map((project) => (
                    <div className="row-item" key={project.id}>
                      {resolveImageUrl(project.featured_image, project.cover_image_url) ? (
                        <img
                          alt={project.title}
                          src={resolveImageUrl(project.featured_image, project.cover_image_url)!}
                        />
                      ) : (
                        <div className="row-thumb" />
                      )}
                      <div>
                        <strong>{project.title}</strong>
                        <p>
                          {project.location ?? "No location"} ·{" "}
                          {project.is_published ? "Published" : "Draft"}
                          {project.is_featured ? " · Featured" : ""}
                        </p>
                      </div>
                      <div className="button-row">
                        <button className="button ghost" onClick={() => editProject(project)} type="button">
                          Edit
                        </button>
                        <button
                          className="button ghost"
                          onClick={() => deleteProject(project.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "furniture" ? <FurnitureAdminPanel media={media} /> : null}

            {tab === "materials" ? <MaterialsAdminPanel media={media} /> : null}

            {tab === "bookings" ? <BookingsAdminPanel /> : null}
          </section>
        </div>
      </section>
    </main>
  );
}
