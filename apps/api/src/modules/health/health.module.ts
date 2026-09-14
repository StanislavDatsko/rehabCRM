import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { StorageModule } from '../../infrastructure/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
