import { Injectable } from '@nestjs/common';
import { parseApiEnv } from '@repo/config/api-env';
import {
  IdentityProviderAdminError,
  type CreateStaffIdentityInput,
  type IdentityProviderAdminPort,
  type StaffRequiredAction,
  type UpdateStaffIdentityInput,
} from './identity-provider-admin.port';

@Injectable()
export class NeonAuthIdentityProviderAdminAdapter implements IdentityProviderAdminPort {
  private readonly env = parseApiEnv();

  async createStaffIdentity(input: CreateStaffIdentityInput): Promise<{ subject: string }> {
    const result = await this.request<{ id?: string }>('auth/users', {
      email: input.email,
      name: `${input.firstName} ${input.lastName}`.trim(),
    });
    if (!result.id) throw new IdentityProviderAdminError('rejected', 'create_user');
    return { subject: result.id };
  }

  async updateStaffIdentity(subject: string, input: UpdateStaffIdentityInput): Promise<void> {
    void subject; void input;
    throw new IdentityProviderAdminError('rejected', 'update_user_not_supported_by_neon_management_api');
  }

  async setIdentityEnabled(subject: string, enabled: boolean): Promise<void> {
    void subject; void enabled;
    throw new IdentityProviderAdminError('rejected', 'set_enabled_not_supported_by_neon_management_api');
  }

  async triggerRequiredActions(subject: string, actions: readonly StaffRequiredAction[]): Promise<void> {
    void subject; void actions;
    throw new IdentityProviderAdminError('rejected', 'required_actions_not_supported_by_neon_management_api');
  }

  async terminateSessions(subject: string): Promise<void> {
    void subject;
    throw new IdentityProviderAdminError('rejected', 'terminate_sessions_not_supported_by_neon_management_api');
  }

  private async request<T = unknown>(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
    if (!this.env.NEON_API_KEY || !this.env.NEON_PROJECT_ID || !this.env.NEON_BRANCH_ID) {
      throw new IdentityProviderAdminError('configuration', 'load_configuration');
    }
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${this.env.NEON_PROJECT_ID}/branches/${this.env.NEON_BRANCH_ID}/${path}`, {
      method,
      headers: { Accept: 'application/json', Authorization: `Bearer ${this.env.NEON_API_KEY}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' && body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new IdentityProviderAdminError(response.status >= 500 ? 'unavailable' : 'rejected', path);
    return (await response.json().catch(() => ({}))) as T;
  }
}
