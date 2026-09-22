import type { ReactNode } from 'react';

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main id="main" className="auth-layout">
    <section className="auth-story" aria-label="RehabMIS">
      <a href="/login" className="auth-wordmark">R<span aria-hidden="true">·</span> <span>RehabMIS</span></a>
      <div className="auth-story-copy"><p className="auth-eyebrow">Клінічна практика. Єдиний простір.</p><h2>Кожен крок<br />до відновлення.</h2><p>Від першої зустрічі до вимірюваного прогресу — пацієнти, команда й реабілітація поруч.</p><div className="auth-orbits" aria-hidden="true"><span /><span /><span /><i /></div></div>
      <p className="auth-story-footer">Rehabilitation Management Information System</p>
    </section>
    <section className="auth-form-surface"><div className="auth-form-content"><p className="rc-kicker">RehabMIS</p><h1 className="ui-page-title mt-3">{title}</h1><p className="mb-8 mt-3 text-sm leading-6 text-text-secondary">{description}</p>{children}<p className="mt-8 text-xs leading-5 text-text-secondary">Система підтримує роботу фахівця та не замінює клінічних рішень.</p></div></section>
  </main>;
}
