import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, description, actions, metadata }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode; metadata?: ReactNode }) {
  return <header className="ui-page-header"><div className="min-w-0">{eyebrow && <p className="rc-kicker mb-2">{eyebrow}</p>}<div className="flex flex-wrap items-center gap-3"><h1 className="ui-page-title">{title}</h1>{metadata}</div>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>}</div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}</header>;
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const letters = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase();
  return <span className={`ui-avatar ui-avatar-${size}`} aria-hidden="true">{letters || '·'}</span>;
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className="ui-status" data-tone={tone}><span className="ui-status-dot" aria-hidden="true" />{children}</span>;
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold tracking-tight">{title}</h2>{description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}</div>{action}</div>;
}
