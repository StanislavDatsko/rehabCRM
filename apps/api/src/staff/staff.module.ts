import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { InviteController } from './invite.controller';
import { StaffService } from './staff.service';
import { ConfiguredStaffMailer, STAFF_MAILER } from './staff-mailer';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [StaffController, InviteController],
  providers: [StaffService, InviteController, ConfiguredStaffMailer, { provide: STAFF_MAILER, useExisting: ConfiguredStaffMailer }],
})
export class StaffModule {}
