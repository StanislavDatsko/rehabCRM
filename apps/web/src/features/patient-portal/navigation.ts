export const patientNav = [
  { label: 'Огляд', href: '/patient' },
  { label: 'Мій план', href: '/patient/plan' },
  { label: 'Мій прогрес', href: '/patient/progress' },
] as const;

export function routeForRole(role: string): '/patient' | '/app' {
  return role === 'PATIENT' ? '/patient' : '/app';
}
