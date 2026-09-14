export default function BodyMapLoading() {
  return (
    <div className="space-y-4" aria-live="polite">
      <div className="h-10 w-72 animate-pulse rounded bg-border" />
      <div className="h-[620px] animate-pulse rounded bg-border" />
      <p className="text-sm text-text-secondary">Loading clinical body map…</p>
    </div>
  );
}
