import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  constructor(private config: ConfigService) {}

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ content: string; model: string }> {
    const url = this.config.get('AI_API_URL');
    const apiKey = this.config.get('AI_API_KEY');
    const model = this.config.get('AI_MODEL');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerErrorException(`AI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: data.model || model,
    };
  }

  async generateCompletionWithImages(
    systemPrompt: string,
    textContent: string,
    images: Array<{ base64: string; mimeType: string }>,
  ): Promise<{ content: string; model: string }> {
    const url = this.config.get('AI_API_URL');
    const apiKey = this.config.get('AI_API_KEY');
    const model = this.config.get('AI_MODEL');

    const contentParts: any[] = images.map((img) => ({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    }));

    contentParts.push({ type: 'text', text: textContent });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentParts },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerErrorException(`AI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      model: data.model || model,
    };
  }

  async *generateStreamingCompletion(
    messages: Array<{ role: string; content: string }>,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const url = this.config.get('AI_API_URL');
    const apiKey = this.config.get('AI_API_KEY');
    const model = this.config.get('AI_MODEL');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
