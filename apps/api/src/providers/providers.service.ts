import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';
import { OpenAICompatibleVisionProvider } from './openai-compatible.provider';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly config: ConfigService,
    private readonly provider: OpenAICompatibleVisionProvider,
  ) {}

  async annotate(
    request: AnnotationRequest,
    overrideConfig?: Partial<VisionModelConfig>,
  ): Promise<AnnotationResult> {
    const config: VisionModelConfig = {
      providerType: 'openai-compatible',
      baseUrl:
        overrideConfig?.baseUrl ??
        this.config.get<string>('OPENAI_COMPATIBLE_BASE_URL') ??
        'https://openrouter.ai/api/v1',
      model:
        overrideConfig?.model ??
        this.config.get<string>('OPENAI_COMPATIBLE_MODEL') ??
        'qwen/qwen-2.5-vl-72b-instruct',
    };

    return this.provider.annotate(request, config);
  }
}
