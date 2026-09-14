export type AuthenticatedPrincipal = {
  subject: string;
  userId: string;
  organizationId: string;
  membershipId: string;
  role: import('@repo/contracts').StaffRole;
  permissions: import('@repo/contracts').Permission[];
  email: string;
  displayName: string;
  organizationName: string;
};
