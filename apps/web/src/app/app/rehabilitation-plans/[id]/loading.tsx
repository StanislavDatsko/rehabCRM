export default function LoadingPlan() {
  return <div className="space-y-5" role="status" aria-busy="true" aria-live="polite"><div className="ui-skeleton h-9 w-72" /><div className="ui-skeleton h-24 w-full" /><div className="ui-skeleton h-72 w-full" /><span className="sr-only">Завантаження плану реабілітації…</span></div>;
}
