"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_CATEGORIES, type CompanyProfile, type MediaAsset, type MediaCategory, type Project, type ProjectComparison, type Service, type TeamMember } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminTab = "media" | "company" | "projects" | "team" | "services";

type ProjectForm = {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  completionDate: string;
  featuredImageId: string;
  galleryIds: string[];
  sortOrder: string;
  published: boolean;
};

type TeamForm = {
  id: string;
  name: string;
  role: string;
  bio: string;
  email: string;
  photoId: string;
  sortOrder: string;
  published: boolean;
};

type ServiceForm = {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: string;
  published: boolean;
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
  completionDate: "",
  featuredImageId: "",
  galleryIds: [],
  sortOrder: "0",
  published: true
};

const blankTeam: TeamForm = {
  id: "",
  name: "",
  role: "",
  bio: "",
  email: "",
  photoId: "",
  sortOrder: "0",
  published: true
};

const blankService: ServiceForm = {
  id: "",
  title: "",
  description: "",
  icon: "",
  sortOrder: "0",
  published: true
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

function SelectImage({
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

export default function AdminDashboard() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<AdminTab>("media");
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

  const visibleMedia = categoryFilter === "All" ? media : media.filter((asset) => asset.category === categoryFilter);
  const selectedProject = projects.find((project) => project.id === projectForm.id);

  const loadAdminData = useCallback(async () => {
    if (!supabase) return;

    const [
      mediaResult,
      companyResult,
      heroResult,
      projectResult,
      teamResult,
      serviceResult
    ] = await Promise.all([
      supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
      supabase.from("company_profile").select("*, ceo_image:media_assets(*)").eq("id", 1).maybeSingle(),
      supabase.from("homepage_hero_images").select("*, media:media_assets(*)").order("sort_order"),
      supabase
        .from("projects")
        .select("*, featured_image:media_assets(*), project_images(media_id, sort_order, media:media_assets(*)), project_comparisons(*, before_image:media_assets!project_comparisons_before_image_id_fkey(*), after_image:media_assets!project_comparisons_after_image_id_fkey(*))")
        .order("sort_order"),
      supabase.from("team_members").select("*, photo:media_assets(*)").order("sort_order"),
      supabase.from("services").select("*").order("sort_order")
    ]);

    if (mediaResult.error) throw mediaResult.error;
    if (projectResult.error) throw projectResult.error;
    if (teamResult.error) throw teamResult.error;
    if (serviceResult.error) throw serviceResult.error;

    setMedia((mediaResult.data ?? []) as MediaAsset[]);
    setCompany((companyResult.data as CompanyProfile | null) ?? null);
    setHeroImageIds(((heroResult.data ?? []) as { media_id: string }[]).map((item) => item.media_id));
    setProjects(
      ((projectResult.data ?? []) as Array<Project & { project_images?: { media_id: string; sort_order: number; media: MediaAsset | null }[]; project_comparisons?: ProjectComparison[] }>).map(
        (project) => ({
          ...project,
          gallery: (project.project_images ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => item.media)
            .filter((asset): asset is MediaAsset => Boolean(asset)),
          comparisons: (project.project_comparisons ?? []).sort((a, b) => a.sort_order - b.sort_order)
        })
      )
    );
    setTeam((teamResult.data ?? []) as TeamMember[]);
    setServices((serviceResult.data ?? []) as Service[]);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) return;

    // Initial CMS synchronization after authentication; Supabase is the external source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData().catch((loadError: Error) => {
      setError(loadError.message);
    });
  }, [loadAdminData, session]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`
      }
    });

    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Check your email for the admin login link.");
  }

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

  function editProject(project: Project) {
    setTab("projects");
    setProjectForm({
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      location: project.location ?? "",
      completionDate: project.completion_date ?? "",
      featuredImageId: project.featured_image_id ?? "",
      galleryIds: project.gallery?.map((asset) => asset.id) ?? [],
      sortOrder: String(project.sort_order ?? 0),
      published: project.published
    });
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
        description: projectForm.description,
        location: projectForm.location || null,
        completion_date: projectForm.completionDate || null,
        featured_image_id: projectForm.featuredImageId || null,
        sort_order: Number(projectForm.sortOrder) || 0,
        published: projectForm.published
      };

      const result = projectForm.id
        ? await supabase.from("projects").update(payload).eq("id", projectForm.id).select("id").single()
        : await supabase.from("projects").insert(payload).select("id").single();

      if (result.error) throw result.error;
      const projectId = result.data.id as string;
      await replaceProjectGallery(supabase, projectId, projectForm.galleryIds);
      setProjectForm(blankProject);
      setMessage("Project saved.");
      await loadAdminData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project");
    } finally {
      setBusy(false);
    }
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
    const { error: deleteError } = await supabase.from("project_comparisons").delete().eq("id", comparisonId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadAdminData();
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
      email: company.email,
      hero_headline: company.hero_headline,
      hero_subheadline: company.hero_subheadline,
      ceo_image_id: company.ceo_image_id || null
    });

    const { error: deleteHeroError } = await supabase.from("homepage_hero_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: insertHeroError } = heroImageIds.length
      ? await supabase.from("homepage_hero_images").insert(
          heroImageIds.map((mediaId, index) => ({
            media_id: mediaId,
            sort_order: index
          }))
        )
      : { error: null };

    setBusy(false);
    if (upsertError || deleteHeroError || insertHeroError) {
      setError(upsertError?.message ?? deleteHeroError?.message ?? insertHeroError?.message ?? "Unable to save company profile");
      return;
    }
    setMessage("Company content saved.");
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
      published: member.published
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
      published: teamForm.published
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

  function editService(service: Service) {
    setTab("services");
    setServiceForm({
      id: service.id,
      title: service.title,
      description: service.description,
      icon: service.icon ?? "",
      sortOrder: String(service.sort_order ?? 0),
      published: service.published
    });
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const payload = {
      title: serviceForm.title,
      description: serviceForm.description,
      icon: serviceForm.icon || null,
      sort_order: Number(serviceForm.sortOrder) || 0,
      published: serviceForm.published
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

  if (!supabase) {
    return (
      <main className="page">
        <div className="empty-state">
          Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the environment to enable the CMS.
          The public site will keep rendering fallback content until Supabase is connected.
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="page">
        <section className="form-card">
          <p className="eyebrow">Admin CMS</p>
          <h1>Sign in to manage content.</h1>
          <p>Use a Supabase Auth user. The SQL policies included in this repo allow authenticated admins to manage content.</p>
          <form className="form-grid" onSubmit={signIn}>
            <label className="field full">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <button className="button" disabled={busy} type="submit">
              Send magic link
            </button>
          </form>
          {message ? <p className="status success">{message}</p> : null}
          {error ? <p className="status error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin CMS</p>
          <h1>Content management</h1>
          <p>Upload photos, organize media, and edit website content without changing code.</p>
        </div>
        <button className="button light" onClick={() => supabase.auth.signOut()} type="button">
          Sign out
        </button>
      </div>

      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <div className="admin-shell">
        <aside className="admin-sidebar">
          {(["media", "company", "projects", "team", "services"] as AdminTab[]).map((item) => (
            <button
              className={`tab-button ${tab === item ? "active" : ""}`}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </aside>

        <section className="admin-panel">
          {tab === "media" ? (
            <div>
              <div className="admin-toolbar">
                <div>
                  <h2>Media library</h2>
                  <p>Drag images from desktop or mobile. Uploads are resized to high-quality WebP when possible.</p>
                </div>
                <label className="field">
                  <span>Upload category</span>
                  <select value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as MediaCategory)}>
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
                <span>Categories: Architecture, Projects, Interior Design, Furniture, Team, CEO, Company</span>
                <input multiple type="file" accept="image/*" onChange={(event) => event.target.files && uploadFiles(event.target.files)} />
              </label>

              <div className="admin-toolbar">
                <label className="field">
                  <span>Filter category</span>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as MediaCategory | "All")}>
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
                    <img src={asset.public_url} alt={asset.alt_text ?? asset.title} />
                    <div className="card-body">
                      <strong>{asset.title}</strong>
                      <small>{asset.category}</small>
                      <small>
                        {asset.width && asset.height ? `${asset.width}x${asset.height}` : "Original"} · {Math.round((asset.size_bytes ?? 0) / 1024)} KB
                      </small>
                      <button className="button light" disabled={busy} onClick={() => deleteMedia(asset)} type="button">
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "company" ? (
            <form className="form-grid" onSubmit={saveCompany}>
              <div className="field full">
                <h2>Company and homepage</h2>
                <p>Change the CEO image, homepage background images, contact details, and hero copy.</p>
              </div>
              <label className="field">
                <span>Company name</span>
                <input value={company?.name ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), name: event.target.value }) as CompanyProfile)} required />
              </label>
              <label className="field">
                <span>Tagline</span>
                <input value={company?.tagline ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), tagline: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field full">
                <span>Description</span>
                <textarea value={company?.description ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), description: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field">
                <span>Hero headline</span>
                <input value={company?.hero_headline ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), hero_headline: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field">
                <span>Hero subheadline</span>
                <input value={company?.hero_subheadline ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), hero_subheadline: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field">
                <span>Address</span>
                <input value={company?.address ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), address: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input value={company?.phone ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), phone: event.target.value }) as CompanyProfile)} />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={company?.email ?? ""} onChange={(event) => setCompany((current) => ({ ...(current ?? { id: 1 }), email: event.target.value }) as CompanyProfile)} />
              </label>
              <SelectImage label="CEO image" value={company?.ceo_image_id ?? ""} categories={["CEO", "Team"]} media={media} onChange={(value) => setCompany((current) => ({ ...(current ?? { id: 1 }), ceo_image_id: value }) as CompanyProfile)} />
              <label className="field full">
                <span>Homepage background images</span>
                <select multiple value={heroImageIds} onChange={(event) => setHeroImageIds(Array.from(event.target.selectedOptions).map((option) => option.value))}>
                  {media
                    .filter((asset) => ["Architecture", "Projects", "Interior Design", "Furniture", "Company"].includes(asset.category))
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.title} ({asset.category})
                      </option>
                    ))}
                </select>
              </label>
              <button className="button" disabled={busy} type="submit">
                Save company content
              </button>
            </form>
          ) : null}

          {tab === "projects" ? (
            <div>
              <form className="form-grid" onSubmit={saveProject}>
                <div className="field full">
                  <h2>{projectForm.id ? "Edit project" : "Create project"}</h2>
                  <p>Each project can have a cover, gallery, location, date, and before/after comparisons.</p>
                </div>
                <label className="field">
                  <span>Title</span>
                  <input value={projectForm.title} onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Slug</span>
                  <input value={projectForm.slug} placeholder="auto-generated if blank" onChange={(event) => setProjectForm({ ...projectForm, slug: event.target.value })} />
                </label>
                <label className="field full">
                  <span>Description</span>
                  <textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Location</span>
                  <input value={projectForm.location} onChange={(event) => setProjectForm({ ...projectForm, location: event.target.value })} />
                </label>
                <label className="field">
                  <span>Completion date</span>
                  <input type="date" value={projectForm.completionDate} onChange={(event) => setProjectForm({ ...projectForm, completionDate: event.target.value })} />
                </label>
                <SelectImage label="Featured cover image" value={projectForm.featuredImageId} categories={["Projects", "Architecture", "Interior Design", "Furniture"]} media={media} onChange={(value) => setProjectForm({ ...projectForm, featuredImageId: value })} />
                <label className="field">
                  <span>Sort order</span>
                  <input value={projectForm.sortOrder} onChange={(event) => setProjectForm({ ...projectForm, sortOrder: event.target.value })} />
                </label>
                <label className="field full">
                  <span>Image gallery</span>
                  <select multiple value={projectForm.galleryIds} onChange={(event) => setProjectForm({ ...projectForm, galleryIds: Array.from(event.target.selectedOptions).map((option) => option.value) })}>
                    {media
                      .filter((asset) => ["Projects", "Architecture", "Interior Design", "Furniture"].includes(asset.category))
                      .map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.title} ({asset.category})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>Published</span>
                  <select value={String(projectForm.published)} onChange={(event) => setProjectForm({ ...projectForm, published: event.target.value === "true" })}>
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="button" disabled={busy} type="submit">
                    Save project
                  </button>
                  <button className="button light" onClick={() => setProjectForm(blankProject)} type="button">
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
                    <input value={comparisonForm.label} onChange={(event) => setComparisonForm({ ...comparisonForm, label: event.target.value })} required />
                  </label>
                  <SelectImage label="Before image" value={comparisonForm.beforeImageId} media={media} onChange={(value) => setComparisonForm({ ...comparisonForm, beforeImageId: value })} />
                  <SelectImage label="After image" value={comparisonForm.afterImageId} media={media} onChange={(value) => setComparisonForm({ ...comparisonForm, afterImageId: value })} />
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
                        <button className="button light" onClick={() => deleteComparison(comparison.id)} type="button">
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
                    {project.featured_image ? <img src={project.featured_image.public_url} alt={project.title} /> : <div className="row-thumb" />}
                    <div>
                      <strong>{project.title}</strong>
                      <p>{project.location ?? "No location"} · {project.published ? "Published" : "Draft"}</p>
                    </div>
                    <div className="button-row">
                      <button className="button light" onClick={() => editProject(project)} type="button">
                        Edit
                      </button>
                      <button className="button light" onClick={() => deleteProject(project.id)} type="button">
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
                  <input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Role</span>
                  <input value={teamForm.role} onChange={(event) => setTeamForm({ ...teamForm, role: event.target.value })} required />
                </label>
                <label className="field full">
                  <span>Bio</span>
                  <textarea value={teamForm.bio} onChange={(event) => setTeamForm({ ...teamForm, bio: event.target.value })} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input value={teamForm.email} onChange={(event) => setTeamForm({ ...teamForm, email: event.target.value })} />
                </label>
                <SelectImage label="Staff photo" value={teamForm.photoId} categories={["Team", "CEO"]} media={media} onChange={(value) => setTeamForm({ ...teamForm, photoId: value })} />
                <label className="field">
                  <span>Sort order</span>
                  <input value={teamForm.sortOrder} onChange={(event) => setTeamForm({ ...teamForm, sortOrder: event.target.value })} />
                </label>
                <label className="field">
                  <span>Published</span>
                  <select value={String(teamForm.published)} onChange={(event) => setTeamForm({ ...teamForm, published: event.target.value === "true" })}>
                    <option value="true">Published</option>
                    <option value="false">Hidden</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="button" type="submit">
                    Save team member
                  </button>
                  <button className="button light" onClick={() => setTeamForm(blankTeam)} type="button">
                    New team member
                  </button>
                </div>
              </form>
              <div className="row-list">
                {team.map((member) => (
                  <div className="row-item" key={member.id}>
                    {member.photo ? <img src={member.photo.public_url} alt={member.name} /> : <div className="row-thumb" />}
                    <div>
                      <strong>{member.name}</strong>
                      <p>{member.role} · {member.published ? "Published" : "Hidden"}</p>
                    </div>
                    <div className="button-row">
                      <button className="button light" onClick={() => editTeam(member)} type="button">
                        Edit
                      </button>
                      <button className="button light" onClick={() => deleteTeam(member.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "services" ? (
            <div>
              <form className="form-grid" onSubmit={saveService}>
                <div className="field full">
                  <h2>{serviceForm.id ? "Edit service" : "Add service"}</h2>
                </div>
                <label className="field">
                  <span>Title</span>
                  <input value={serviceForm.title} onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Icon label</span>
                  <input value={serviceForm.icon} onChange={(event) => setServiceForm({ ...serviceForm, icon: event.target.value })} />
                </label>
                <label className="field full">
                  <span>Description</span>
                  <textarea value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} required />
                </label>
                <label className="field">
                  <span>Sort order</span>
                  <input value={serviceForm.sortOrder} onChange={(event) => setServiceForm({ ...serviceForm, sortOrder: event.target.value })} />
                </label>
                <label className="field">
                  <span>Published</span>
                  <select value={String(serviceForm.published)} onChange={(event) => setServiceForm({ ...serviceForm, published: event.target.value === "true" })}>
                    <option value="true">Published</option>
                    <option value="false">Hidden</option>
                  </select>
                </label>
                <div className="button-row">
                  <button className="button" type="submit">
                    Save service
                  </button>
                  <button className="button light" onClick={() => setServiceForm(blankService)} type="button">
                    New service
                  </button>
                </div>
              </form>
              <div className="row-list">
                {services.map((service) => (
                  <div className="row-item" key={service.id}>
                    <div className="row-thumb" />
                    <div>
                      <strong>{service.title}</strong>
                      <p>{service.published ? "Published" : "Hidden"}</p>
                    </div>
                    <div className="button-row">
                      <button className="button light" onClick={() => editService(service)} type="button">
                        Edit
                      </button>
                      <button className="button light" onClick={() => deleteService(service.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
