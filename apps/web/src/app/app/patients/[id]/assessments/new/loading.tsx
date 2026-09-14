export default function NewAssessmentLoading() {
  return (
    <div role="status" className="space-y-4" aria-live="polite">
      <div className="h-9 w-1/2 animate-pulse rounded bg-surface-muted" />
      <div className="h-72 animate-pulse rounded bg-surface-muted" />
      <span className="sr-only">Завантаження шаблонів оцінювання…</span>
    </div>
  );
}
