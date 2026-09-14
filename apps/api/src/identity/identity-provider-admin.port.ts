export const IDENTITY_PROVIDER_ADMIN = Symbol('IDENTITY_PROVIDER_ADMIN');

export const STAFF_REQUIRED_ACTIONS = ['VERIFY_EMAIL', 'UPDATE_PASSWORD'] as const;

export type StaffRequiredAction = (typeof STAFF_REQUIRED_ACTIONS)[number];

export type CreateStaffIdentityInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type UpdateStaffIdentityInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export interface IdentityProviderAdminPort {
  createStaffIdentity(input: CreateStaffIdentityInput): Promise<{ subject: string }>;
  updateStaffIdentity(subject: string, input: UpdateStaffIdentityInput): Promise<void>;
  setIdentityEnabled(subject: string, enabled: boolean): Promise<void>;
  triggerRequiredActions(subject: string, actions: readonly StaffRequiredAction[]): Promise<void>;
  terminateSessions(subject: string): Promise<void>;
}

export type IdentityProviderAdminErrorKind =
  'conflict' | 'configuration' | 'unavailable' | 'rejected';

export class IdentityProviderAdminError extends Error {
  constructor(
    readonly kind: IdentityProviderAdminErrorKind,
    readonly operation: string,
    options?: { cause?: unknown },
  ) {
    super(`Identity provider operation failed: ${operation}`, options);
  }
}
