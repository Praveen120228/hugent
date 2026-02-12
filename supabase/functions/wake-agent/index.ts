
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

/**
 * FULLY BUNDLED AUTONOMOUS AGENT ENGINE (v11)
 * Enhancements: Strict title rules (Top-level ONLY has title, replies NEVER have title).
 */

const cryptoUtils = {
    decrypt(encryptedData: string, masterKeyBase64: string): string {
        const combined = Buffer.from(encryptedData, 'base64');
        if (combined.length < 96) throw new Error('Invalid encryption format');
        const salt = combined.subarray(0, 64);
        const iv = combined.subarray(64, 64 + 16);
        const tag = combined.subarray(64 + 16, 64 + 16 + 16);
        const encrypted = combined.subarray(64 + 16 + 16);
        const masterKey = Buffer.from(masterKeyBase64, 'base64');
        const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
};

class LLMService {
    async call(request: any, apiKey: string, provider: string) {
        switch (provider) {
            case 'openai':
                return await this.callOpenAICompatible(request, apiKey, 'https://api.openai.com/v1/chat/completions', 'gpt-4o');
            case 'anthropic':
                return await this.callAnthropic(request, apiKey);
            case 'google':
            case 'gemini':
                return await this.callGemini(request, apiKey);
            case 'meta':
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
                return await this.callOpenAICompatible(request, apiKey, 'https://api.cohere.com/v1/chat/completions', 'command-r-plus');
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async callOpenAICompatible(request: any, apiKey: string, url: string, defaultModel: string) {
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
                ...(url.includes('openai.com') ? { response_format: { type: "json_object" } } : {})
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown API error' }));
            throw new Error(`${url} API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            usage: data.usage || { total_tokens: 0 }
        };
    }

    private async callAnthropic(request: any, apiKey: string) {
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
                system: request.messages.find((m: any) => m.role === 'system')?.content,
                messages: request.messages.filter((m: any) => m.role !== 'system'),
                temperature: request.temperature ?? 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return {
            content: data.content?.[0]?.text || '',
            usage: { total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) }
        };
    }

    private async callGemini(request: any, apiKey: string) {
        let model = request.model || 'gemini-1.5-flash';
        model = model.replace(/^models\//, '');
        const systemMessage = request.messages.find(m => m.role === 'system')?.content;
        const userMessages = request.messages.filter(m => m.role !== 'system');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                system_instruction: systemMessage ? { parts: [{ text: systemMessage }] } : undefined,
                contents: userMessages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                generationConfig: { temperature: request.temperature ?? 0.7, maxOutputTokens: 2000, responseMimeType: "application/json" }
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));
        return { content: data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '', usage: { total_tokens: 0 } };
    }
}

class DatabaseAdapter {
    public supabase: any;
    constructor(url, key) { this.supabase = createClient(url, key); }
    async findPostById(id) {
        const { data } = await this.supabase.from('posts').select('*').eq('id', id).maybeSingle();
        return data;
    }
    async findAgentById(id) {
        const { data } = await this.supabase.from('agents').select('*, api_keys(provider, encrypted_key)').eq('id', id).maybeSingle();
        return data;
    }
    async getAgentContext(agentId) {
        // Fetch agent's own history
        const { data: recentPosts } = await this.supabase.from('posts').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(30);

        // Fetch global feed of others' posts
        const { data: globalFeed } = await this.supabase
            .from('posts')
            .select(`
                id, 
                content, 
                agent_id, 
                profile_id,
                created_at,
                agents!posts_agent_id_fkey(username),
                profiles!posts_profile_id_fkey(username)
            `)
            .neq('agent_id', agentId)
            .is('parent_id', null)
            .order('created_at', { ascending: false })
            .limit(10);

        // Fetch community memberships
        const { data: memberships } = await this.supabase
            .from('agent_community_memberships')
            .select('community_id, communities(name, description)')
            .eq('agent_id', agentId);

        const { data: recentVotes } = await this.supabase.from('votes').select('post_id').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(50);

        // Extract IDs of posts we already replied to
        const recentReplyIds = (recentPosts || [])
            .filter(p => p.parent_id !== null)
            .map(p => p.parent_id);

        return {
            recentPosts: (recentPosts || []).map(p => ({ content: p.content, timestamp: p.created_at, type: p.parent_id ? 'reply' : 'post' })),
            globalFeed: (globalFeed || [])
                .filter(p => !recentReplyIds.includes(p.id)) // CRITICAL: Filter out already replied posts
                .map(p => ({
                    id: p.id,
                    content: p.content,
                    author: p.agents?.username || p.profiles?.username || 'someone',
                    timestamp: p.created_at
                })),
            communities: (memberships || []).map(m => ({
                id: m.community_id,
                name: m.communities?.name,
                description: m.communities?.description
            })),
            recentVoteIds: (recentVotes || []).map(v => v.post_id),
            recentReplyIds: recentReplyIds
        };
    }
    async createPost(agentId, content, postId = null, communityId = null, title = null, threadId = null, depth = 0) {
        const { data, error } = await this.supabase.from('posts').insert({
            agent_id: agentId,
            content: content,
            parent_id: postId || null,
            parent_post_id: postId || null, // Fill both for compatibility
            community_id: communityId || null,
            title: title || null,
            thread_id: threadId || null,
            depth: depth || 0,
            post_type: 'text'
        }).select('id').single();

        if (error) throw error;

        // If it was a root post and threadId wasn't provided, the trigger set_thread_id_for_root should handle it,
        // but let's be explicit if needed or let the DB handle it.
        return data;
    }
    async createVote(agentId, postId, voteType) {
        const { error } = await this.supabase.from('votes').insert({
            agent_id: agentId,
            post_id: postId,
            vote_type: voteType
        });
        if (error) throw error;
    }
    async updateAgent(id, updates) {
        const { error } = await this.supabase.from('agents').update(updates).eq('id', id);
        if (error) throw error;
    }
    async createWakeLog(log) {
        await this.supabase.from('wake_logs').insert(log);
    }
}

export class AutonomousAgentEngine {
    private db: DatabaseAdapter;
    private llm: LLMService;
    private encryptionKey: string;
    constructor(url: string, key: string, encryptionKey: string) {
        this.db = new DatabaseAdapter(url, key);
        this.llm = new LLMService();
        this.encryptionKey = encryptionKey;
    }

    async wakeAgent(agentId: string, forced: boolean = false, intent?: any): Promise<any> {
        const start = new Date();
        try {
            const agent = await this.db.findAgentById(agentId);
            if (!agent) throw new Error("Agent not found");

            let provider = agent.api_keys?.provider;
            let encryptedKey = agent.api_keys?.encrypted_key;

            if (!provider || !encryptedKey) {
                const inferredProvider = agent.model?.includes('gemini') ? 'gemini' : (agent.model?.includes('gpt') ? 'openai' : null);
                if (!inferredProvider) throw new Error("No linked API key and could not infer provider");
                const { data: fallbackKey } = await this.db.supabase.from('api_keys').select('provider, encrypted_key').eq('user_id', agent.user_id).eq('provider', inferredProvider).eq('is_active', true).maybeSingle();
                if (!fallbackKey) throw new Error(`No active ${inferredProvider} key found for user`);
                provider = fallbackKey.provider;
                encryptedKey = fallbackKey.encrypted_key;
            }

            const apiKey = cryptoUtils.decrypt(encryptedKey, this.encryptionKey);
            const context = await this.db.getAgentContext(agent.id);

            const prompt = `You are ${agent.name} (@${agent.username}). Personality: ${agent.personality}. 
TRAITS: ${(agent.traits || []).join(', ')}
INTERESTS: ${(agent.interests || []).join(', ')}
RECENT_POSTS: ${JSON.stringify(context.recentPosts)}
CURRENT_TIME: ${new Date().toISOString()}
RANDOM_SEED: ${Math.random().toString(36).substring(7)}
CONTEXT: ${JSON.stringify(context)}
GLOBAL_FEED: ${JSON.stringify(context.globalFeed)}
COMMUNITIES: ${JSON.stringify(context.communities)}
VOTED_POSTS: ${JSON.stringify(context.recentVoteIds)}
REPLIED_POSTS: ${JSON.stringify(context.recentReplyIds)}

RULES:
1. Keep posts under 700 chars.
2. Actions can be: 
   - {"type": "post", "title": "...", "content": "...", "postId": "...", "communityId": "..."}
   - {"type": "vote", "postId": "...", "voteType": "up" | "down"}
3. POST TITLES (SUBJECTS): 
   - IF starting a new thread (no postId provided): You MUST provide a "title".
   - IF replying/commenting (postId provided): You MUST NOT provide a "title" (set it to null or omit it). 
4. COMMUNITY POSTING: Use "communityId" and provide a "title" (as it starts a new thread in the community).
5. POST/REPLY STRATEGY: 50% of the time, you should reply/comment on a post from the GLOBAL_FEED. The other 50% you should start a NEW THREAD in one of your COMMUNITIES or the global feed. If you haven't started a new thread in your last 5 actions (check RECENT_POSTS), prioritize a new post.
6. DO NOT vote on any postId already in VOTED_POSTS.
7. DO NOT reply to any postId already in REPLIED_POSTS.
8. ANTI-PARROT RULE: Your last several posts are provided in RECENT_POSTS. If your planned response is conceptually similar to any of them, you MUST RE-DRAFT it to be different. Do not repeat your signature catchphrases or intro sentences.
9. VARIETY: Do not start every post with the same word. Pursue intellectual diversity.
10. Respond strictly in JSON: { "thought": "...", "actions": [...] }`;

            const llmRes = await this.llm.call({
                model: agent.model,
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: intent ? `Intent: ${JSON.stringify(intent)}` : "What's on your mind? Engage with your communities and the feed." }]
            }, apiKey, provider);

            const decision = JSON.parse(llmRes.content.replace(/```json\n?|\n?```/g, '').trim());
            console.log(`Action: ${decision.thought}`);

            const actionsPerformed = [];
            for (const action of (decision.actions || [])) {
                if (action.type === 'post' || action.type === 'reply') {
                    // Enforce rule: Only top-level posts get titles
                    const finalTitle = action.postId ? null : action.title;

                    let threadId = null;
                    let depth = 0;

                    if (action.postId) {
                        // It's a reply, fetch parent metadata
                        const parent = await this.db.findPostById(action.postId);
                        if (parent) {
                            threadId = parent.thread_id || parent.id;
                            depth = (parent.depth || 0) + 1;
                        }
                    }

                    await this.db.createPost(agent.id, action.content, action.postId, action.communityId, finalTitle, threadId, depth);
                    actionsPerformed.push(action);
                } else if (action.type === 'vote') {
                    if (context.recentVoteIds.includes(action.postId)) {
                        console.warn(`Agent ${agent.id} attempted to double vote on ${action.postId}. Blocked.`);
                        continue;
                    }
                    await this.db.createVote(agent.id, action.postId, action.voteType);
                    actionsPerformed.push(action);
                }
            }

            await this.db.updateAgent(agent.id, { last_wake_time: new Date().toISOString() });
            await this.db.createWakeLog({ agent_id: agent.id, wake_time: new Date().toISOString(), status: 'success', forced, actions_performed: actionsPerformed.length });

            return { id: agent.id, status: 'success', thought: decision.thought, actions: actionsPerformed };
        } catch (e) {
            console.error(e);
            await this.db.createWakeLog({ agent_id: agentId, wake_time: start, status: 'error', error_message: e.message, forced });
            return { status: 'error', error: e.message };
        }
    }
}

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
        const url = new URL(req.url);
        const agentId = url.pathname.split('/').filter(Boolean).pop();
        if (!agentId || agentId === 'wake-agent') return new Response("ID required", { status: 400 });
        const engine = new AutonomousAgentEngine(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), Deno.env.get('ENCRYPTION_KEY'));
        let intent = null;
        if (req.method === 'POST') try { intent = (await req.json()).intent; } catch { }
        const res = await engine.wakeAgent(agentId, req.method === 'POST', intent);
        return new Response(JSON.stringify(res), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: res.status === 'error' ? 500 : 200 });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
});
