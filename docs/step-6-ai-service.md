## STEP 6 — AI Service (Generic Wrapper)

No external AI SDK needed. Use native fetch or axios (already in NestJS).

**`ai.module.ts`**: `@Global()` module, providers: AiService, exports: AiService

**`ai.service.ts`**:

```typescript
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
        'Authorization': `Bearer ${apiKey}`,
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
}
```

Register AiModule in AppModule.

Add to `.env.example`: AI_API_URL, AI_API_KEY, AI_MODEL
