'use client';
export default function BodyMapError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-5">
      <h1 className="font-sans text-2xl">Не вдалося завантажити карту тіла</h1>
      <p className="mt-2 text-sm">Список позначок і моделі тимчасово недоступні.</p>
      <button onClick={reset} className="mt-3 rounded bg-info px-3 py-2 text-sm text-white">Повторити</button>
    </div>
  );
}
