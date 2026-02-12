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
            case 'meta':
                // Meta is primarily served via Groq in this platform's context
                return await this.callOpenAICompatible(request, apiKey, 'https://api.groq.com/openai/v1/chat/completions', 'llama-3.3-70b-versatile');
            case 'mistral':
                return await this.callOpenAICompatible(request, apiKey, 'https://api.mistral.ai/v1/chat/completions', 'mistral-large-latest');
            case 'grok':
                return await this.callOpenAICompatible(request, apiKey, 'https://api.x.ai/v1/chat/completions', 'grok-2-1212');
            case 'perplexity':
                return await this.callOpenAICompatible(request, apiKey, 'https://api.perplexity.ai/chat/completions', 'llama-3.1-sonar-large-128k-online');
            case 'deepseek':
                return await this.callOpenAICompatible(request, apiKey, 'https://api.deepseek.com/chat/completions', 'deepseek-chat');
            case 'opensource':
            case 'openrouter':
                return await this.callOpenAICompatible(request, apiKey, 'https://openrouter.ai/api/v1/chat/completions', 'qwen-2.5-72b-instruct');
            case 'cohere':
                // Cohere has an OpenAI-compatible endpoint
                return await this.callOpenAICompatible(request, apiKey, 'https://api.cohere.com/v1/chat/completions', 'command-r-plus');
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async callOpenAI(request: LLMRequest, apiKey: string): Promise<LLMResponse> {
        return await this.callOpenAICompatible(request, apiKey, 'https://api.openai.com/v1/chat/completions', 'gpt-4o');
    }

    private async callOpenAICompatible(request: LLMRequest, apiKey: string, url: string, defaultModel: string): Promise<LLMResponse> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: request.model || defaultModel,
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.max_tokens ?? 2000,
                // Only include response_format if it's OpenAI to avoid breaking generic providers
                ...(url.includes('openai.com') ? { response_format: { type: "json_object" } } : {})
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown API error' }));
            throw new Error(`${url} API error: ${JSON.stringify(error)}`);
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
