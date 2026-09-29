import { Module } from '@nestjs/common';
import { CalendarBlocksController } from './calendar-blocks.controller';
import { CalendarBlocksService } from './calendar-blocks.service';
@Module({ controllers: [CalendarBlocksController], providers: [CalendarBlocksService] })
export class CalendarBlocksModule {}
