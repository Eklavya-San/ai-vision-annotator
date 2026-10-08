import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { ProjectsModule } from './projects/projects.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ImagesModule } from './images/images.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    ProjectsModule,
    DatasetsModule,
    ImagesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
