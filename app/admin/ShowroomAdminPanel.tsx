"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { MediaAsset, ShowroomHotspotLinkType, ShowroomImage, ShowroomSection } from "@/lib/cms/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type HotspotForm = {
  label: string;
  linkType: ShowroomHotspotLinkType;
  linkTarget: string;
  x: number;
  y: number;
};

export default function ShowroomAdminPanel({ media }: { media: MediaAsset[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [sections, setSections] = useState<ShowroomSection[]>([]);
  const [images, setImages] = useState<ShowroomImage[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [activeImageId, setActiveImageId] = useState("");
  const [sectionForm, setSectionForm] = useState({ imageId: "", description: "" });
  const [roomForm, setRoomForm] = useState({ mediaId: "", title: "", description: "" });
  const [hotspotForm, setHotspotForm] = useState<HotspotForm>({
    label: "",
    linkType: "furniture",
    linkTarget: "",
    x: 50,
    y: 50
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: sectionData, error: sectionErr } = await supabase
      .from("showroom_sections")
      .select("*, image:media_assets(*)")
      .order("sort_order");
    if (sectionErr) throw sectionErr;
    setSections((sectionData ?? []) as ShowroomSection[]);
    if (!activeSectionId && sectionData?.[0]) setActiveSectionId(sectionData[0].id);
  }, [supabase, activeSectionId]);

  const loadImages = useCallback(async () => {
    if (!supabase || !activeSectionId) return;
    const { data, error: imgErr } = await supabase
      .from("showroom_images")
      .select("*, media:media_assets(*), hotspots:showroom_hotspots(*)")
      .eq("section_id", activeSectionId)
      .order("sort_order");
    if (imgErr) throw imgErr;
    setImages((data ?? []) as ShowroomImage[]);
  }, [supabase, activeSectionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e: Error) => setError(e.message));
  }, [load]);

  useEffect(() => {
    if (!activeSectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadImages().catch((e: Error) => setError(e.message));
  }, [activeSectionId, loadImages]);

  const activeImage = images.find((img) => img.id === activeImageId) ?? images[0];

  async function saveSectionImage(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !activeSectionId) return;
    const { error: upErr } = await supabase
      .from("showroom_sections")
      .update({
        image_id: sectionForm.imageId || null,
        description: sectionForm.description || null
      })
      .eq("id", activeSectionId);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setMessage("Showroom box updated.");
    await load();
  }

  async function addRoom(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !activeSectionId || !roomForm.mediaId) return;
    const { error: insErr } = await supabase.from("showroom_images").insert({
      section_id: activeSectionId,
      media_id: roomForm.mediaId,
      title: roomForm.title || "Room",
      description: roomForm.description || null,
      sort_order: images.length,
      published: true
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setRoomForm({ mediaId: "", title: "", description: "" });
    setMessage("Room image added.");
    await loadImages();
  }

  function placeHotspot(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setHotspotForm((f) => ({ ...f, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }));
  }

  async function saveHotspot(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !activeImage?.id || !hotspotForm.label || !hotspotForm.linkTarget) return;
    const { error: insErr } = await supabase.from("showroom_hotspots").insert({
      showroom_image_id: activeImage.id,
      label: hotspotForm.label,
      x_percent: hotspotForm.x,
      y_percent: hotspotForm.y,
      width_percent: 10,
      height_percent: 10,
      link_type: hotspotForm.linkType,
      link_target: hotspotForm.linkTarget,
      sort_order: (activeImage.hotspots?.length ?? 0)
    });
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setHotspotForm({ label: "", linkType: "furniture", linkTarget: "", x: 50, y: 50 });
    setMessage("Hotspot saved.");
    await loadImages();
  }

  async function deleteHotspot(id: string) {
    if (!supabase) return;
    await supabase.from("showroom_hotspots").delete().eq("id", id);
    await loadImages();
  }

  return (
    <div>
      {message ? <p className="status success">{message}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      <div className="admin-toolbar">
        <label className="field">
          <span>Showroom section</span>
          <select onChange={(e) => setActiveSectionId(e.target.value)} value={activeSectionId}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="form-grid form-card" onSubmit={saveSectionImage}>
        <div className="field full">
          <h3>Entry box (homepage)</h3>
          <p>Background image for the four main showroom boxes on the homepage.</p>
        </div>
        <label className="field">
          <span>Box image</span>
          <select
            onChange={(e) => setSectionForm({ ...sectionForm, imageId: e.target.value })}
            value={sectionForm.imageId}
          >
            <option value="">None</option>
            {media.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Description</span>
          <input
            onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
            value={sectionForm.description}
          />
        </label>
        <button className="button" type="submit">
          Save box
        </button>
      </form>

      <form className="form-grid form-card" onSubmit={addRoom}>
        <div className="field full">
          <h3>Room images</h3>
          <p>Interactive showroom scenes for this section.</p>
        </div>
        <label className="field">
          <span>Room image</span>
          <select
            onChange={(e) => setRoomForm({ ...roomForm, mediaId: e.target.value })}
            required
            value={roomForm.mediaId}
          >
            <option value="">Select…</option>
            {media.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input onChange={(e) => setRoomForm({ ...roomForm, title: e.target.value })} value={roomForm.title} />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
            value={roomForm.description}
          />
        </label>
        <button className="button" type="submit">
          Add room
        </button>
      </form>

      {images.length ? (
        <>
          <div className="showroom-admin-tabs">
            {images.map((img) => (
              <button
                className={activeImage?.id === img.id ? "active" : ""}
                key={img.id}
                onClick={() => setActiveImageId(img.id)}
                type="button"
              >
                {img.title}
              </button>
            ))}
          </div>

          {activeImage?.media?.public_url ? (
            <div className="showroom-admin-editor">
              <div className="showroom-scene editable" onClick={placeHotspot} role="presentation">
                <img alt={activeImage.title} className="showroom-scene-image" src={activeImage.media.public_url} />
                {(activeImage.hotspots ?? []).map((h) => (
                  <span
                    className="showroom-hotspot preview"
                    key={h.id}
                    style={{
                      left: `${h.x_percent}%`,
                      top: `${h.y_percent}%`,
                      width: `${h.width_percent}%`,
                      height: `${h.height_percent}%`
                    }}
                  />
                ))}
                <span
                  className="showroom-hotspot preview draft"
                  style={{ left: `${hotspotForm.x}%`, top: `${hotspotForm.y}%`, width: "10%", height: "10%" }}
                />
              </div>
              <form className="form-grid" onSubmit={saveHotspot}>
                <p className="meta">Click the room image to position the hotspot ({hotspotForm.x}%, {hotspotForm.y}%)</p>
                <label className="field">
                  <span>Label</span>
                  <input
                    onChange={(e) => setHotspotForm({ ...hotspotForm, label: e.target.value })}
                    required
                    value={hotspotForm.label}
                  />
                </label>
                <label className="field">
                  <span>Link type</span>
                  <select
                    onChange={(e) =>
                      setHotspotForm({ ...hotspotForm, linkType: e.target.value as ShowroomHotspotLinkType })
                    }
                    value={hotspotForm.linkType}
                  >
                    <option value="furniture">Furniture item (slug)</option>
                    <option value="material">Material (slug)</option>
                    <option value="project">Project (slug)</option>
                    <option value="custom">Custom URL</option>
                  </select>
                </label>
                <label className="field">
                  <span>Link target</span>
                  <input
                    onChange={(e) => setHotspotForm({ ...hotspotForm, linkTarget: e.target.value })}
                    placeholder="e.g. audit-sofa or /contact"
                    required
                    value={hotspotForm.linkTarget}
                  />
                </label>
                <button className="button" type="submit">
                  Add hotspot
                </button>
              </form>
              <div className="row-list">
                {(activeImage.hotspots ?? []).map((h) => (
                  <div className="row-item" key={h.id}>
                    <div>
                      <strong>{h.label}</strong>
                      <p>
                        {h.link_type}: {h.link_target} · ({h.x_percent}%, {h.y_percent}%)
                      </p>
                    </div>
                    <button className="button ghost" onClick={() => deleteHotspot(h.id)} type="button">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
