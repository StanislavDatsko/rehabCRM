import { Injectable } from '@nestjs/common';
import { parseApiEnv } from '@repo/config/api-env';
import {
  IdentityProviderAdminError,
  type CreateStaffIdentityInput,
  type IdentityProviderAdminPort,
  type StaffRequiredAction,
  type UpdateStaffIdentityInput,
} from './identity-provider-admin.port';

type TokenResponse = { access_token?: string; expires_in?: number };

@Injectable()
export class KeycloakIdentityProviderAdminAdapter implements IdentityProviderAdminPort {
  private readonly env = parseApiEnv();
  private token: { value: string; expiresAt: number } | null = null;

  async createStaffIdentity(input: CreateStaffIdentityInput): Promise<{ subject: string }> {
    const response = await this.request('create_user', '/users', {
      method: 'POST',
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        enabled: true,
        emailVerified: false,
        requiredActions: ['VERIFY_EMAIL', 'UPDATE_PASSWORD'],
      }),
    });
    const location = response.headers.get('location');
    const subject = location?.split('/').filter(Boolean).at(-1);
    if (!subject) {
      throw new IdentityProviderAdminError('rejected', 'create_user_location');
    }
    return { subject };
  }

  async updateStaffIdentity(subject: string, input: UpdateStaffIdentityInput): Promise<void> {
    await this.request('update_user', `/users/${encodeURIComponent(subject)}`, {
      method: 'PUT',
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      }),
    });
  }

  async setIdentityEnabled(subject: string, enabled: boolean): Promise<void> {
    await this.request(
      enabled ? 'enable_user' : 'disable_user',
      `/users/${encodeURIComponent(subject)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      },
    );
  }

  async triggerRequiredActions(
    subject: string,
    actions: readonly StaffRequiredAction[],
  ): Promise<void> {
    await this.request(
      'execute_actions_email',
      `/users/${encodeURIComponent(subject)}/execute-actions-email?lifespan=${this.env.OIDC_ADMIN_ACTION_LIFESPAN_SECONDS}`,
      { method: 'PUT', body: JSON.stringify(actions) },
    );
  }

  async terminateSessions(subject: string): Promise<void> {
    await this.request('logout_user', `/users/${encodeURIComponent(subject)}/logout`, {
      method: 'POST',
    });
  }

  private configuration(): {
    baseUrl: string;
    realm: string;
    clientId: string;
    clientSecret: string;
  } {
    const {
      OIDC_ADMIN_BASE_URL: baseUrl,
      OIDC_ADMIN_REALM: realm,
      OIDC_ADMIN_CLIENT_ID: clientId,
      OIDC_ADMIN_CLIENT_SECRET: clientSecret,
    } = this.env;
    if (!baseUrl || !realm || !clientId || !clientSecret) {
      throw new IdentityProviderAdminError('configuration', 'load_configuration');
    }
    return { baseUrl: baseUrl.replace(/\/$/, ''), realm, clientId, clientSecret };
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 10_000) {
      return this.token.value;
    }
    const config = this.configuration();
    let response: Response;
    try {
      response = await fetch(
        `${config.baseUrl}/realms/${encodeURIComponent(config.realm)}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: config.clientId,
            client_secret: config.clientSecret,
          }),
          signal: AbortSignal.timeout(5_000),
        },
      );
    } catch (error) {
      throw new IdentityProviderAdminError('unavailable', 'client_credentials', { cause: error });
    }
    if (!response.ok) {
      throw new IdentityProviderAdminError('rejected', 'client_credentials');
    }
    const payload = (await response.json()) as TokenResponse;
    if (!payload.access_token) {
      throw new IdentityProviderAdminError('rejected', 'client_credentials_payload');
    }
    this.token = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(payload.expires_in ?? 60, 30) * 1_000,
    };
    return this.token.value;
  }

  private async request(operation: string, path: string, init: RequestInit): Promise<Response> {
    const config = this.configuration();
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await fetch(
        `${config.baseUrl}/admin/realms/${encodeURIComponent(config.realm)}${path}`,
        {
          ...init,
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
            ...init.headers,
          },
          signal: AbortSignal.timeout(5_000),
        },
      );
    } catch (error) {
      throw new IdentityProviderAdminError('unavailable', operation, { cause: error });
    }
    if (response.status === 409) {
      throw new IdentityProviderAdminError('conflict', operation);
    }
    if (!response.ok) {
      throw new IdentityProviderAdminError(
        response.status >= 500 ? 'unavailable' : 'rejected',
        operation,
      );
    }
    return response;
  }
}
