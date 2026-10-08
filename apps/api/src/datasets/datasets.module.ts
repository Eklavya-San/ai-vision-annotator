import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
