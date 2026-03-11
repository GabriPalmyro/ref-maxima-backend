import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeminiImageService {
  private readonly logger = new Logger(GeminiImageService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly model = 'google/gemini-3-pro-image-preview';

  constructor(private readonly config: ConfigService) {
    this.apiUrl = config.getOrThrow<string>('AI_API_URL');
    this.apiKey = config.getOrThrow<string>('AI_API_KEY');
  }

  async generateImage(
    prompt: string,
    referenceImage: Buffer,
    mimeType: string,
  ): Promise<Buffer> {
    const base64Image = referenceImage.toString('base64');

    const body = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      modalities: ['image', 'text'],
      image_config: {
        aspect_ratio: '4:5',
        image_size: '2K',
      },
    };

    this.logger.log('Calling Nano Banana Pro via OpenRouter...');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenRouter API error: ${error}`);
      throw new InternalServerErrorException(
        `Image generation API error: ${response.status}`,
      );
    }

    const data = await response.json();

    // OpenRouter returns images as base64 data URLs in choices[0].message.images
    const images = data.choices?.[0]?.message?.images;
    if (!images || images.length === 0) {
      this.logger.error('No image in response', JSON.stringify(data));
      throw new InternalServerErrorException('AI did not return an image');
    }

    const dataUrl: string = images[0].image_url.url;
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');

    return Buffer.from(base64Data, 'base64');
  }
}
