import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { InviteController } from './invite.controller';
import { InviteJwtGuard } from './invite.controller';
import { StaffService } from './staff.service';
import { ConfiguredStaffMailer, STAFF_MAILER } from './staff-mailer';

@Module({
  controllers: [StaffController, InviteController],
  providers: [StaffService, InviteController, InviteJwtGuard, ConfiguredStaffMailer, { provide: STAFF_MAILER, useExisting: ConfiguredStaffMailer }],
})
export class StaffModule {}
