import {
  PERMISSIONS,
  hasPermission,
  type CurrentUserResponse,
  type Permission,
} from '@repo/contracts';

export type NavItem = {
  id: string;
  href: string;
  labelKey:
    | 'navDashboard'
    | 'navPatients'
    | 'navCalendar'
    | 'navRehabilitation'
    | 'navExercises'
    | 'navAnatomy'
    | 'navReports'
    | 'navAdmin'
    | 'navAlerts';
  permission?: Permission;
  enabled: boolean;
  group: 'workspace' | 'clinical' | 'operations';
};

export const staffNav: NavItem[] = [
  { id: 'dashboard', href: '/app', labelKey: 'navDashboard', enabled: true, group: 'workspace' },
  {
    id: 'patients',
    href: '/app/patients',
    labelKey: 'navPatients',
    permission: PERMISSIONS.PATIENT_READ_ADMIN,
    enabled: true,
    group: 'clinical',
  },
  {
    id: 'calendar',
    href: '/app/calendar',
    labelKey: 'navCalendar',
    permission: PERMISSIONS.APPOINTMENT_READ,
    enabled: true,
    group: 'operations',
  },
  {
    id: 'rehab',
    href: '/app/rehabilitation-plans',
    labelKey: 'navRehabilitation',
    permission: PERMISSIONS.REHABILITATION_PLAN_READ,
    enabled: true,
    group: 'clinical',
  },
  {
    id: 'exercises',
    href: '/app/exercises',
    labelKey: 'navExercises',
    permission: PERMISSIONS.EXERCISE_READ,
    enabled: true,
    group: 'clinical',
  },
  {
    id: 'anatomy',
    href: '/app/anatomy',
    labelKey: 'navAnatomy',
    permission: PERMISSIONS.ANATOMY_READ,
    enabled: true,
    group: 'clinical',
  },
  {
    id: 'reports',
    href: '/app/reports',
    labelKey: 'navReports',
    permission: PERMISSIONS.CLINICAL_REPORT_READ,
    enabled: true,
    group: 'operations',
  },
  {
    id: 'admin',
    href: '/app/administration/staff',
    labelKey: 'navAdmin',
    permission: PERMISSIONS.STAFF_READ,
    enabled: true,
    group: 'operations',
  },
];

export function canSeeNavItem(user: CurrentUserResponse, item: NavItem): boolean {
  if (!item.permission) {
    return true;
  }
  return hasPermission(user.permissions, item.permission);
}

export function initials(displayName: string): string {
  const parts = displayName.split(' ').filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}
