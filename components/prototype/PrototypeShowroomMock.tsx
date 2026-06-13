"use client";

/** Minimal post-intro destination for prototype demos only — not the live homepage. */
export default function PrototypeShowroomMock({ variant }: { variant: "cinematic" | "signature" }) {
  return (
    <main className="prototype-showroom-mock">
      <p className="eyebrow">Prototype · {variant === "cinematic" ? "Current Cinematic" : "Signature Open Limits"}</p>
      <h1>Showroom entry (mock)</h1>
      <p>
        In production this transitions to the live showroom grid. This mock confirms the intro exit
        and CTA handoff only.
      </p>
      <a className="button ghost" href="/prototype-comparison">
        Back to comparison
      </a>
    </main>
  );
}
