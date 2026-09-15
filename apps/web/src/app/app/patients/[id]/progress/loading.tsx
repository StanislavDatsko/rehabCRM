export default function ProgressLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="h-9 w-72 animate-pulse rounded-xl bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-surface-muted" />
      <span className="sr-only">Завантаження динаміки…</span>
    </div>
  );
}
