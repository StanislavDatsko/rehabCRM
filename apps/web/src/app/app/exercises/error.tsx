'use client';

export default function ExerciseLibraryError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-5">
      <h1 className="font-sans text-xl text-danger">Не вдалося завантажити бібліотеку вправ</h1>
      <p className="mt-2 text-sm text-text-secondary">Перевірте фільтри або повторіть запит.</p>
      <button type="button" onClick={reset} className="rc-btn rc-btn-secondary mt-4">
        Спробувати ще раз
      </button>
    </div>
  );
}
