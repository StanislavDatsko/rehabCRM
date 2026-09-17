import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { InviteController } from './invite.controller';
import { InviteJwtGuard } from './invite.controller';
import { StaffService } from './staff.service';

@Module({ controllers: [StaffController, InviteController], providers: [StaffService, InviteController, InviteJwtGuard] })
export class StaffModule {}
