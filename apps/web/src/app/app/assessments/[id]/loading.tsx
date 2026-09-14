export default function AssessmentLoading() {
  return (
    <div role="status" className="space-y-4" aria-live="polite">
      <div className="h-9 w-2/3 animate-pulse rounded bg-surface-muted" />
      <div className="h-44 animate-pulse rounded bg-surface-muted" />
      <span className="sr-only">Завантаження оцінювання…</span>
    </div>
  );
}
