import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityEventLogger } from '../common/auth/security-events';
import { AuthenticationGuard } from './authentication.guard';
import { IdentityService } from './identity.service';
import { JoseTokenVerifier } from './jose-token-verifier';
import { MeController } from './me.controller';
import { PermissionsGuard } from './permissions.guard';
import { TOKEN_VERIFIER } from './token-verifier';
import { IDENTITY_PROVIDER_ADMIN } from './identity-provider-admin.port';
import { NeonAuthIdentityProviderAdminAdapter } from './neon-auth-identity-provider-admin.adapter';

@Global()
@Module({
  controllers: [MeController],
  providers: [
    IdentityService,
    SecurityEventLogger,
    { provide: TOKEN_VERIFIER, useClass: JoseTokenVerifier },
    { provide: IDENTITY_PROVIDER_ADMIN, useClass: NeonAuthIdentityProviderAdminAdapter },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [IdentityService, TOKEN_VERIFIER, IDENTITY_PROVIDER_ADMIN, SecurityEventLogger],
})
export class IdentityModule {}
