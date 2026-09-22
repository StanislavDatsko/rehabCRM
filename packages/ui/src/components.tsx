import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function Surface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={['ui-surface', className].filter(Boolean).join(' ')} {...props} />;
}

export function IconButton({ className, 'aria-label': ariaLabel, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }) {
  return <button type="button" aria-label={ariaLabel} className={['ui-icon-button', className].filter(Boolean).join(' ')} {...props} />;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={['ui-skeleton', className].filter(Boolean).join(' ')} {...props} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="ui-empty-state"><p className="font-medium text-text-primary">{title}</p>{description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function ErrorState({ title = 'Щось пішло не так', description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div role="alert" className="ui-error-state"><p className="font-medium text-danger">{title}</p>{description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return <div className="ui-stat"><dt>{label}</dt><dd>{value}</dd>{detail ? <span>{detail}</span> : null}</div>;
}
