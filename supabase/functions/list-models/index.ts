// @ts-nocheck
/// <reference lib="deno.window" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import * as crypto from "node:crypto"
import { Buffer } from "node:buffer"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const url = new URL(req.url)
        const agentId = url.searchParams.get('agentId')

        if (!agentId) {
            return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Fetch Agent & API Key
        const { data: agent, error: agentError } = await supabaseClient
            .from('agents')
            .select('api_key_id')
            .eq('id', agentId)
            .single()

        if (agentError || !agent?.api_key_id) throw new Error('Agent or API Key not found')

        const { data: apiKeyRecord, error: keyError } = await supabaseClient
            .from('api_keys')
            .select('*')
            .eq('id', agent.api_key_id)
            .single()

        if (keyError || !apiKeyRecord) throw new Error('API Key record not found')

        // 2. Decrypt Key (Logic ported from wake-agent)
        const decryptionKey = Deno.env.get('ENCRYPTION_KEY')
        if (!decryptionKey) throw new Error('Server encryption key missing')

        const decrypt = (encryptedData: string) => {
            const combined = Buffer.from(encryptedData, 'base64')
            const salt = combined.subarray(0, 64)
            const iv = combined.subarray(64, 64 + 16)
            const tag = combined.subarray(64 + 16, 64 + 16 + 16)
            const encrypted = combined.subarray(64 + 16 + 16)

            const masterKey = Buffer.from(decryptionKey, 'base64')
            const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256')
            const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv)
            decipher.setAuthTag(tag)

            let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
            decrypted += decipher.final('utf8')
            return decrypted
        }

        let decryptedKey
        try {
            decryptedKey = decrypt(apiKeyRecord.encrypted_key)
        } catch (e) {
            console.error('Decryption failed:', e)
            throw new Error('Failed to decrypt API key')
        }

        // 3. Fetch Models based on Provider
        let models = []

        interface GoogleModelsResponse {
            models?: Array<{
                name: string;
                displayName: string;
                description: string;
            }>;
            error?: {
                message: string;
            };
        }

        interface OpenAIModelsResponse {
            data?: Array<{
                id: string;
            }>;
            error?: {
                message: string;
            };
        }

        if (apiKeyRecord.provider === 'google' || apiKeyRecord.provider === 'gemini') {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${decryptedKey}`)
            const data = (await resp.json()) as GoogleModelsResponse
            if (data.error) throw new Error(data.error.message)

            // Filter and map Gemini models
            models = data.models?.filter((m) => m.name.includes('gemini')).map((m) => ({
                id: m.name.replace('models/', ''),
                name: m.displayName,
                description: m.description
            })) || []
        } else if (apiKeyRecord.provider === 'openai') {
            const resp = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${decryptedKey}` }
            })
            const data = (await resp.json()) as OpenAIModelsResponse
            if (data.error) throw new Error(data.error.message)

            // Filter and map GPT models
            models = data.data?.filter((m) => m.id.includes('gpt')).map((m) => ({
                id: m.id,
                name: m.id,
                description: 'OpenAI GPT Model'
            })) || []
        } else if (apiKeyRecord.provider === 'anthropic') {
            // Anthropic doesn't have a public list models endpoint yet, return hardcoded list
            models = [
                { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Powerful model for complex tasks' },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and compact model' }
            ]
        }

        return new Response(JSON.stringify({ models }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

