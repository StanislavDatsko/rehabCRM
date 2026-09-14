import { Module } from '@nestjs/common';
import { StorageModule } from '../infrastructure/storage/storage.module';
import { AnatomyController } from './anatomy.controller';
import { AnatomyService } from './anatomy.service';

@Module({ imports: [StorageModule], controllers: [AnatomyController], providers: [AnatomyService] })
export class AnatomyModule {}
