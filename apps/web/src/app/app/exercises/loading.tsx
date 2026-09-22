export default function LoadingExercises() {
  return <div className="space-y-5" role="status" aria-busy="true" aria-live="polite"><div className="ui-skeleton h-9 w-64" /><div className="ui-skeleton h-14 w-full" /><div className="grid gap-4 md:grid-cols-2"><div className="ui-skeleton h-48" /><div className="ui-skeleton h-48" /></div><span className="sr-only">Завантаження бібліотеки вправ…</span></div>;
}
