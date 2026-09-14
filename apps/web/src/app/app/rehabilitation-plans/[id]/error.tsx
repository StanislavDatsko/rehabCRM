'use client';

export default function RehabilitationPlanError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-5">
      <h1 className="font-serif text-xl text-danger">Не вдалося відкрити план реабілітації</h1>
      <p className="mt-2 text-sm text-text-secondary">
        План не знайдено, він недоступний у вашій організації або сталася тимчасова помилка.
      </p>
      <button type="button" onClick={reset} className="rc-btn rc-btn-secondary mt-4">
        Спробувати ще раз
      </button>
    </div>
  );
}
