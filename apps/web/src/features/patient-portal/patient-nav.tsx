'use client';

import { usePathname } from 'next/navigation';

export function isPatientNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/patient' && pathname.startsWith(`${href}/`));
}

export function PatientNav({ links }: { links: readonly (readonly [string, string])[] }) {
  const pathname = usePathname();
  return <nav aria-label="Patient navigation" className="patient-navigation">{links.map(([href, label]) => { const active = isPatientNavActive(pathname, href); return <a key={href} href={href} aria-current={active ? 'page' : undefined} className="patient-navigation-link">{label}</a>; })}</nav>;
}
