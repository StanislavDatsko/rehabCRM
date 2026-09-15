import { Module } from '@nestjs/common';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { PatientMediaController } from './media.controller';
import { PatientMediaService } from './media.service';
@Module({ imports: [StorageModule], controllers: [PatientMediaController], providers: [PatientMediaService] })
export class PatientMediaModule {}
