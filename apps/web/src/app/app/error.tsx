'use client';

import { useEffect } from 'react';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { /* Keep the error boundary intentionally quiet: clinical details must not leak into UI. */ }, []);
  return <main id="main" className="rc-atmosphere mx-auto max-w-2xl rounded-3xl p-10 text-white shadow-brand"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-lime">RehabMIS · workspace</p><h1 className="mt-4 font-serif text-4xl">Робочий простір тимчасово недоступний</h1><p className="mt-4 text-white/75">Дані не втрачено. Повторіть спробу або поверніться до огляду.</p><button onClick={reset} className="rc-btn mt-8 bg-brand-lime text-purple-950">Повторити</button></main>;
}
