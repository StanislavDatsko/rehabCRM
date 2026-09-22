'use client';

import { useEffect } from 'react';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { /* Keep the error boundary intentionally quiet: clinical details must not leak into UI. */ }, []);
  return <main id="main" className="ui-error-state mx-auto max-w-2xl p-10 text-left"><p className="rc-kicker">RehabMIS · workspace</p><h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary">Робочий простір тимчасово недоступний</h1><p className="mt-4 text-text-secondary">Дані не втрачено. Повторіть спробу або поверніться до огляду.</p><div className="mt-8 flex flex-wrap gap-2"><button onClick={reset} className="rc-btn rc-btn-primary">Повторити</button><a href="/app" className="rc-btn rc-btn-secondary">До огляду</a></div></main>;
}
