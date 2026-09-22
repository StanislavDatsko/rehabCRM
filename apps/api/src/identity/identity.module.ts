import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityEventLogger } from '../common/auth/security-events';
import { AuthenticationGuard } from './authentication.guard';
import { IdentityService } from './identity.service';
import { MeController } from './me.controller';
import { PermissionsGuard } from './permissions.guard';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
  controllers: [MeController, AuthController],
  providers: [
    IdentityService,
    PasswordService,
    SessionService,
    SecurityEventLogger,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [IdentityService, SecurityEventLogger, PasswordService, SessionService],
})
export class IdentityModule {}
