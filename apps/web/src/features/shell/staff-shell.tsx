'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CurrentUserResponse } from '@repo/contracts';
import { t } from '../../i18n/messages';
import { logoutStaff } from '../auth/actions';
import { canSeeNavItem, initials, staffNav } from './navigation';

const paths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M4 5h16v16H4z M16 3v4 M8 3v4 M4 11h16',
  rehab: 'M5 4h14v17H5z M9 3h6v3H9z M8 11h8 M8 15h5',
  exercises: 'M3 12h4l3-8 4 16 3-8h4',
  anatomy: 'M12 3v18 M3 12h18 M5 5l14 14 M5 19 19 5',
  reports: 'M4 21V3 M4 21h17 M9 17v-6 M14 17V7 M19 17V4',
  admin: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',
  alerts: 'M12 3 2 21h20z M12 9v5 M12 17h.01',
};

function NavIcon({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[id] ?? paths.dashboard} /></svg>;
}

export function StaffShell({ user, children }: { user: CurrentUserResponse; children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const [paletteNonce, setPaletteNonce] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const commandInput = useRef<HTMLInputElement>(null);
  const palette = useRef<HTMLDivElement>(null);
  const mobileMenu = useRef<HTMLDialogElement>(null);
  const visibleNav = staffNav.filter(item => canSeeNavItem(user, item));
  const current = visibleNav.filter(item => pathname === item.href || (item.href !== '/app' && pathname.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
  const role = user.role === 'ORGANIZATION_ADMIN' ? t('roleOrgAdmin') : user.role === 'REHABILITATION_SPECIALIST' ? t('roleSpecialist') : user.role === 'SYSTEM_ADMIN' ? t('roleSystemAdmin') : user.role;
  const quickActions = [
    { id: 'new-patient', label: 'Новий пацієнт', href: '/app/patients/new', icon: '＋' },
    { id: 'new-assessment', label: 'Нове оцінювання', href: '/app/patients', icon: '◌' },
    { id: 'new-plan', label: 'Новий план реабілітації', href: '/app/patients', icon: '↗' },
    { id: 'body-map', label: 'Відкрити body map', href: '/app/patients', icon: '⌖' },
    { id: 'staff', label: 'Керування командою', href: '/app/administration/staff', icon: '◎' },
    { id: 'settings', label: 'Налаштування', href: '/app/administration/staff', icon: '⚙' },
  ];
  const filteredActions = quickActions.filter(item => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const filteredSections = visibleNav.filter(item => item.enabled && t(item.labelKey).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const commandCount = filteredActions.length + filteredSections.length;

  useEffect(() => {
    try { setCollapsed(window.localStorage.getItem('rehabmis.sidebar.collapsed') === 'true'); } catch { /* optional preference */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('rehabmis.sidebar.collapsed', String(collapsed)); } catch { /* optional preference */ }
  }, [collapsed]);

  useEffect(() => {
    if (paletteNonce > 0) window.setTimeout(() => commandInput.current?.focus(), 0);
  }, [paletteNonce]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (paletteOpen) setPaletteOpen(false);
        else { setQuery(''); setCommandIndex(0); setPaletteOpen(true); setPaletteNonce(value => value + 1); window.setTimeout(() => commandInput.current?.focus(), 50); }
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [paletteOpen]);

  function navigation(compact = false) {
    return <nav aria-label={t('mainNav')} className="workspace-navigation">{(['workspace', 'clinical', 'operations'] as const).map(group => <div key={group} className="workspace-nav-group">{!compact && <p className="workspace-nav-label">{group === 'workspace' ? 'Робочий простір' : group === 'clinical' ? 'Клініка' : 'Операції'}</p>}{visibleNav.filter(item => item.group === group).map(item => <Link key={item.id} href={item.enabled ? item.href : '#'} aria-current={current?.id === item.id ? 'page' : undefined} aria-disabled={!item.enabled} title={compact ? t(item.labelKey) : undefined} onClick={event => { if (!item.enabled) event.preventDefault(); mobileMenu.current?.close(); }} className="workspace-nav-link"><NavIcon id={item.id} /><span className={compact ? 'sr-only' : ''}>{t(item.labelKey)}</span></Link>)}</div>)}</nav>;
  }

  return <div className="workspace-shell" data-collapsed={collapsed}>
    <aside className="workspace-sidebar">
      <Link href="/app" className="workspace-brand" aria-label="RehabMIS — головна"><span className="workspace-mark">R<span>·</span></span>{!collapsed && <span>Rehab<span className="font-normal text-text-secondary">MIS</span></span>}</Link>
      {navigation(collapsed)}
      <div className="workspace-account"><span className="workspace-avatar">{initials(user.displayName)}</span>{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-medium">{user.displayName}</p><p className="truncate text-xs text-text-secondary">{role}</p><p className="mt-1 truncate text-xs text-text-secondary">{user.organization.name}</p></div>}</div>
      <form action={logoutStaff}><button className="workspace-logout" title={t('logout')}>{collapsed ? '↗' : t('logout')}</button></form>
      <button className="workspace-collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Розгорнути навігацію' : 'Згорнути навігацію'} aria-expanded={!collapsed}>{collapsed ? '→' : '← Згорнути'}</button>
    </aside>
    <div className="workspace-canvas">
      <header className="workspace-header"><div className="flex min-w-0 items-center gap-3"><button className="rc-btn rc-btn-secondary md:hidden" onClick={() => mobileMenu.current?.showModal()} aria-label="Відкрити меню">☰</button><span className="truncate text-sm font-medium">{current ? t(current.labelKey) : 'Клінічний простір'}</span></div><button className="workspace-search" onClick={() => { setQuery(''); setCommandIndex(0); setPaletteOpen(true); setPaletteNonce(value => value + 1); window.setTimeout(() => commandInput.current?.focus(), 50); }} aria-label="Швидка навігація" aria-keyshortcuts="Meta+K Control+K"><span>Пошук розділу</span><kbd>⌘ K</kbd></button></header>
      <main id="main" className="workspace-content">{children}</main>
    </div>
    <dialog ref={mobileMenu} className="workspace-mobile-dialog" aria-label="Головна навігація"><div className="flex items-center justify-between p-4"><span className="font-semibold">RehabMIS</span><button className="rc-btn rc-btn-ghost" onClick={() => mobileMenu.current?.close()} aria-label="Закрити меню">✕</button></div>{navigation()}<div className="p-4 text-sm text-text-secondary">{user.organization.name}<form action={logoutStaff}><button className="rc-btn rc-btn-secondary mt-4">{t('logout')}</button></form></div></dialog>
    <div ref={palette} role="dialog" aria-modal="true" hidden={!paletteOpen} onKeyDown={event => { if (event.key === 'Escape') setPaletteOpen(false); }} className="workspace-command" aria-labelledby="command-title"><div className="flex items-center justify-between border-b border-border px-5 py-3"><h2 id="command-title" className="text-sm font-medium">Швидка навігація</h2><button className="rc-btn rc-btn-ghost" onClick={() => setPaletteOpen(false)} aria-label="Закрити пошук">Esc</button></div><label className="sr-only" htmlFor="command-query">Знайти розділ або дію</label><input autoFocus ref={commandInput} id="command-query" value={query} onChange={event => { setQuery(event.target.value); setCommandIndex(0); }} onKeyDown={event => { if (!commandCount) return; if (event.key === 'ArrowDown') { event.preventDefault(); setCommandIndex(index => (index + 1) % commandCount); } else if (event.key === 'ArrowUp') { event.preventDefault(); setCommandIndex(index => (index - 1 + commandCount) % commandCount); } else if (event.key === 'Enter') { event.preventDefault(); document.querySelector<HTMLAnchorElement>(`[data-command-index="${commandIndex}"]`)?.click(); } }} placeholder="Розділ або дія…" className="workspace-command-input" aria-controls="command-results" /><nav id="command-results" aria-label="Швидкі дії" className="p-2"><p className="workspace-command-section">Дії</p>{filteredActions.map((item, index) => <Link data-command-index={index} key={item.id} className="workspace-nav-link" data-active={commandIndex === index} href={item.href} onClick={() => setPaletteOpen(false)}><span aria-hidden="true" className="w-5 text-center text-info">{item.icon}</span>{item.label}<span className="ml-auto text-text-secondary" aria-hidden="true">↗</span></Link>)}<p className="workspace-command-section">Розділи</p>{filteredSections.map((item, index) => <Link data-command-index={filteredActions.length + index} key={item.id} className="workspace-nav-link" data-active={commandIndex === filteredActions.length + index} href={item.href} onClick={() => setPaletteOpen(false)}><NavIcon id={item.id} />{t(item.labelKey)}<span className="ml-auto text-text-secondary" aria-hidden="true">↗</span></Link>)}{!commandCount && <p role="status" className="p-6 text-center text-sm text-text-secondary">Нічого не знайдено. Спробуйте іншу назву.</p>}</nav></div>
  </div>;
}
