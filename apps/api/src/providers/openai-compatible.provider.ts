import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { AnnotationRequest, AnnotationResult, VisionModelConfig } from '@vision-annotator/shared';
import { parseAnnotationResult } from './annotation-result.schema';
import type { VisionProvider } from './vision.provider';

@Injectable()
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
          {
            type: 'text',
            text: `${request.instructions}\nLabels: ${request.labels.join(', ')}\nReturn JSON only using {"annotations":[{"label":"...","confidence":0,"bbox":{"x":0,"y":0,"width":0,"height":0},"polygon":[{"x":0,"y":0}]}]}. Include either bbox or polygon for each annotation.`,
          },
          { type: 'image_url', image_url: { url: request.imageUrl } },
        ],
      }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Vision model returned an empty response');
    }

    return parseAnnotationResult(content);
  }
}
