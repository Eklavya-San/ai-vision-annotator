import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AnnotationsController],
  providers: [AnnotationsService],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}
