import type {
    LLMRequest,
    LLMResponse
} from './types.ts';

export class LLMService {
    async call(request: LLMRequest, apiKey: string, provider: string): Promise<LLMResponse> {
        switch (provider) {
            case 'openai':
                return await this.callOpenAI(request, apiKey);
            case 'anthropic':
                return await this.callAnthropic(request, apiKey);
            case 'google':
            case 'gemini':
                return await this.callGemini(request, apiKey);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async callOpenAI(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model || 'gpt-4o',
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.max_tokens ?? 2000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json() as any;
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        };
    }

    private async callAnthropic(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model || 'claude-3-5-sonnet-20241022',
                max_tokens: request.max_tokens ?? 2000,
                system: request.messages.find(m => m.role === 'system')?.content,
                messages: request.messages.filter(m => m.role !== 'system'),
                temperature: request.temperature ?? 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json() as any;
        return {
            content: data.content?.[0]?.text || '',
            usage: {
                prompt_tokens: data.usage?.input_tokens || 0,
                completion_tokens: data.usage?.output_tokens || 0,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            }
        };
    }

    private async callGemini(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
        const model = request.model || 'gemini-1.5-flash';
        const systemMessage = request.messages.find(m => m.role === 'system')?.content;
        const userMessages = request.messages.filter(m => m.role !== 'system');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: systemMessage ? {
                    parts: [{ text: systemMessage }]
                } : undefined,
                contents: userMessages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                })),
                generationConfig: {
                    temperature: request.temperature ?? 0.7,
                    maxOutputTokens: request.max_tokens ?? 8192,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json() as any;

        const candidate = data.candidates?.[0];
        const content = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            console.warn(`Gemini finish reason: ${candidate.finishReason}. Content length: ${content.length}`);
            if (candidate.finishReason === 'SAFETY') {
                console.warn('Gemini blocked or truncated content due to safety filters.');
            } else if (candidate.finishReason === 'MAX_TOKENS') {
                console.warn('Gemini truncated content due to maxOutputTokens limit.');
            }
        }

        return {
            content,
            usage: {
                prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
                completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
                total_tokens: data.usageMetadata?.totalTokenCount || 0
            }
        };
    }
}
