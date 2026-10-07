import OpenAI from 'openai';
import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';
import type { VisionProvider } from './vision.provider';

export class OpenAICompatibleVisionProvider implements VisionProvider {
  async annotate(request: AnnotationRequest, config: VisionModelConfig): Promise<AnnotationResult> {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_COMPATIBLE_API_KEY ?? 'not-needed',
      baseURL: config.baseUrl,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      temperature: 0,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${request.instructions}\nLabels: ${request.labels.join(', ')}\nReturn JSON only.` },
          { type: 'image_url', image_url: { url: request.imageUrl } },
        ],
      }],
    });

    const content = response.choices[0]?.message?.content ?? '{"annotations":[]}';
    return JSON.parse(content) as AnnotationResult;
  }
}
