import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { ProvidersModule } from '../providers/providers.module';
import { ANNOTATION_QUEUE } from './constants';
import { AnnotationProducer } from './annotation.producer';
import { AnnotationProcessor } from './annotation.processor';

@Global()
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    ProvidersModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: ANNOTATION_QUEUE }),
  ],
  providers: [AnnotationProducer, AnnotationProcessor],
  exports: [AnnotationProducer, AnnotationProcessor],
})
export class QueueModule {}
