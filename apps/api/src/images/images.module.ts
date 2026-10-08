import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
