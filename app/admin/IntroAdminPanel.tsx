"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { IntroSlide, MediaAsset } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function IntroAdminPanel({ media }: { media: MediaAsset[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [slides, setSlides] = useState<IntroSlide[]>([]);
  const [logoImageId, setLogoImageId] = useState("");
  const [settings, setSettings] = useState({
    enabled: true,
    autoplayMs: "3200",
    introTitle: "",
    introSubtitle: ""
  });
  const [form, setForm] = useState({ mediaId: "", title: "", subtitle: "", sortOrder: "0" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const [slidesRes, companyRes, settingsRes] = await Promise.all([
      supabase.from("intro_slides").select("*, media:media_assets(*)").order("sort_order"),
      supabase.from("company_profile").select("logo_image_id").eq("id", 1).maybeSingle(),
      supabase.from("site_settings").select("key, value").in("key", [
        "intro_enabled",
        "intro_autoplay_ms",
        "intro_title",
        "intro_subtitle"
      ])
    ]);
    if (slidesRes.error) throw slidesRes.error;
    setSlides((slidesRes.data ?? []) as IntroSlide[]);
    setLogoImageId(companyRes.data?.logo_image_id ?? "");
    const map = Object.fromEntries((settingsRes.data ?? []).map((row) => [row.key, row.value]));
    setSettings({
      enabled: map.intro_enabled !== "false",
      autoplayMs: map.intro_autoplay_ms ?? "3200",
      introTitle: map.intro_title ?? "",
      introSubtitle: map.intro_subtitle ?? ""
    });
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const rows = [
      { key: "intro_enabled", value: String(settings.enabled) },
      { key: "intro_autoplay_ms", value: settings.autoplayMs },
      { key: "intro_title", value: settings.introTitle || "" },
      { key: "intro_subtitle", value: settings.introSubtitle || "" }
    ];
    const { error: upErr } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setMessage("Intro settings saved.");
  }

  async function saveLogo(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const { error: upErr } = await supabase
      .from("company_profile")
      .update({ logo_image_id: logoImageId || null })
      .eq("id", 1);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setMessage("Logo updated.");
  }

  async function addSlide(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !form.mediaId) return;
    const { error: insErr } = await supabase.from("intro_slides").insert({
      media_id: form.mediaId,
      title: form.title || null,
      subtitle: form.subtitle || null,
      sort_order: Number(form.sortOrder) || 0,
      published: true
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setForm({ mediaId: "", title: "", subtitle: "", sortOrder: "0" });
    setMessage("Intro slide added.");
    await load();
  }

  async function removeSlide(id: string) {
    if (!supabase) return;
    await supabase.from("intro_slides").delete().eq("id", id);
    await load();
  }

  return (
    <div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <form className="form-grid form-card" onSubmit={saveSettings}>
        <div className="field full">
          <h3>Intro experience</h3>
          <p>Animation timing and default intro copy. CEO portrait is set in Homepage tab.</p>
        </div>
        <label className="field">
          <span>Show intro on first visit</span>
          <select
            onChange={(e) => setSettings({ ...settings, enabled: e.target.value === "true" })}
            value={String(settings.enabled)}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </label>
        <label className="field">
          <span>Slide duration (ms)</span>
          <input
            min={1500}
            onChange={(e) => setSettings({ ...settings, autoplayMs: e.target.value })}
            step={100}
            type="number"
            value={settings.autoplayMs}
          />
        </label>
        <label className="field">
          <span>Default intro title</span>
          <input
            onChange={(e) => setSettings({ ...settings, introTitle: e.target.value })}
            placeholder="Open Limits Design"
            value={settings.introTitle}
          />
        </label>
        <label className="field">
          <span>Default intro subtitle</span>
          <input
            onChange={(e) => setSettings({ ...settings, introSubtitle: e.target.value })}
            placeholder="Luxury Design Studio"
            value={settings.introSubtitle}
          />
        </label>
        <button className="button" type="submit">
          Save intro settings
        </button>
      </form>

      <form className="form-grid form-card" onSubmit={saveLogo}>
        <div className="field full">
          <h3>Intro logo</h3>
          <p>Logo shown in the first-time visitor intro modal. Upload in Media, then select here.</p>
        </div>
        <label className="field full">
          <span>Logo image</span>
          <select onChange={(e) => setLogoImageId(e.target.value)} value={logoImageId}>
            <option value="">None — animated text logo</option>
            {media.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          Save logo
        </button>
      </form>

      <form className="form-grid form-card" onSubmit={addSlide}>
        <div className="field full">
          <h3>Intro slideshow slides</h3>
          <p>Additional slides after logo and CEO portrait. CEO image is set in Homepage tab.</p>
        </div>
        <label className="field">
          <span>Image</span>
          <select
            onChange={(e) => setForm({ ...form, mediaId: e.target.value })}
            required
            value={form.mediaId}
          >
            <option value="">Select from media library…</option>
            {media.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input onChange={(e) => setForm({ ...form, title: e.target.value })} value={form.title} />
        </label>
        <label className="field">
          <span>Subtitle</span>
          <input onChange={(e) => setForm({ ...form, subtitle: e.target.value })} value={form.subtitle} />
        </label>
        <label className="field">
          <span>Sort order</span>
          <input onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} type="number" value={form.sortOrder} />
        </label>
        <button className="button" type="submit">
          Add slide
        </button>
      </form>

      <div className="row-list">
        {slides.map((slide) => (
          <div className="row-item" key={slide.id}>
            {slide.media?.public_url ? (
              <img alt={slide.title ?? ""} className="row-thumb-img" src={slide.media.public_url} />
            ) : (
              <div className="row-thumb" />
            )}
            <div>
              <strong>{slide.title ?? slide.media?.title ?? "Slide"}</strong>
              <p>{slide.subtitle ?? ""}</p>
            </div>
            <button className="button ghost" onClick={() => removeSlide(slide.id)} type="button">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
