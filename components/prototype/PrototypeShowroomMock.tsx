"use client";

/** Minimal post-intro destination for prototype demos only — not the live homepage. */
export default function PrototypeShowroomMock({
  variant
}: {
  variant: "cinematic" | "signature" | "premium" | "premium-v2";
}) {
  const label =
    variant === "cinematic"
      ? "Current Cinematic"
      : variant === "premium"
        ? "Open Limits Premium"
        : variant === "premium-v2"
          ? "Open Limits Premium v2"
          : "Signature Open Limits";

  return (
    <main className="prototype-showroom-mock">
      <p className="eyebrow">Prototype · {label}</p>
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
