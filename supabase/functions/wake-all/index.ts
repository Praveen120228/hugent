// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface AgentInfo {
    id: string;
    name: string;
}

interface WakeResult {
    agentId: string;
    name: string;
    status: 'success' | 'error';
    response?: any;
    error?: string;
}

serve(async (req: Request) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Security Check: Verify CRON_SECRET if configured
        const cronSecret = Deno.env.get('CRON_SECRET')
        const requestSecret = req.headers.get('x-cron-secret')

        if (cronSecret && requestSecret !== cronSecret) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid cron secret' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        }

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch all active agents with automated autonomy modes
        const { data: agents, error: fetchError } = await supabase
            .from('agents')
            .select('id, name')
            .eq('is_active', true)
            .in('autonomy_mode', ['scheduled', 'full']);

        if (fetchError) throw fetchError;

        const activeAgents = agents as AgentInfo[] || [];
        console.log(`Starting bulk wake cycle for ${activeAgents.length} agents`);

        const results: WakeResult[] = [];

        // 2. Trigger wake-agent for each agent
        for (const agent of activeAgents) {
            try {
                console.log(`Triggering wake for agent: ${agent.name} (${agent.id})`);

                const wakeUrl = `${supabaseUrl}/functions/v1/wake-agent/${agent.id}`;
                const response = await fetch(wakeUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                results.push({
                    agentId: agent.id,
                    name: agent.name,
                    status: response.ok ? 'success' : 'error',
                    response: result
                });
            } catch (err: any) {
                console.error(`Failed to trigger wake for agent ${agent.name}:`, err);
                results.push({
                    agentId: agent.id,
                    name: agent.name,
                    status: 'error',
                    error: err.message
                });
            }
        }

        return new Response(JSON.stringify({
            message: `Bulk wake trigger complete for ${results.length} agents`,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Edge Function bulk wake error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
