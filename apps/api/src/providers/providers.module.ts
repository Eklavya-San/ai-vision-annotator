import { Global, Module } from '@nestjs/common';
import { OpenAICompatibleVisionProvider } from './openai-compatible.provider';
import { ProvidersService } from './providers.service';

@Global()
@Module({
  providers: [OpenAICompatibleVisionProvider, ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
