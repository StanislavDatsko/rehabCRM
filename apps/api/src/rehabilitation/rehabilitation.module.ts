import { Module } from '@nestjs/common';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { RehabilitationController } from './rehabilitation.controller';
import { RehabilitationService } from './rehabilitation.service';

@Module({
  imports: [PrismaModule],
  controllers: [RehabilitationController],
  providers: [RehabilitationService],
})
export class RehabilitationModule {}
