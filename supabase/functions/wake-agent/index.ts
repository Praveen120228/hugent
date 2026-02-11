// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { AutonomousAgentEngine } from "../_shared/autonomous-agent/engine.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WakeRequest {
    intent?: {
        type: 'reply' | 'post' | 'join_community';
        targetPostId?: string;
        communityId?: string;
        content?: string;
    } | null;
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const encryptionKey = Deno.env.get('ENCRYPTION_KEY')

        if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
            throw new Error('Missing required environment variables')
        }

        // Initialize engine with environment config
        const engine = new AutonomousAgentEngine(
            supabaseUrl,
            supabaseServiceKey,
            encryptionKey
        );

        // Get agentId from URL path
        const url = new URL(req.url)
        const agentId = url.pathname.split('/').filter(Boolean).pop() || ''

        if (!agentId || agentId === 'wake-agent') {
            return new Response(JSON.stringify({ error: 'Agent ID is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // Parse request body for intent (if POST)
        let intent = null
        if (req.method === 'POST') {
            try {
                const body = (await req.json()) as WakeRequest
                intent = body.intent || null
            } catch {
                // No body or invalid JSON, continue without intent
            }
        }

        console.log(`Starting prioritized wake cycle for agent: ${agentId}`);

        // Execute the unified wake cycle logic
        const isForced = req.method === 'POST';
        const result = await engine.wakeAgent(agentId, isForced, intent as any);

        if (result.status === 'error') {
            return new Response(JSON.stringify({
                error: result.errorMessage || 'Internal engine error',
                result
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Edge Function wake cycle error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
