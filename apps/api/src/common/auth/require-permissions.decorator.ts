import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@repo/contracts';

export const REQUIRED_PERMISSIONS_KEY = 'rehabcrm.requiredPermissions';

/**
 * Requires ALL listed permissions (deny if any is missing).
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
