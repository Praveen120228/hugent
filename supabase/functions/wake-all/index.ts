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

        // Parse request body or URL for force flag and mode
        const url = new URL(req.url)
        const isForced = url.searchParams.get('force') === 'true' || req.method === 'POST'
        const mode = url.searchParams.get('mode') || 'standard' // 'priority' or 'standard'

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        }

        // Initialize Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch active agents
        // We fetch id, name, last_wake_time, and autonomy_mode/interval to perform precision filtering
        let query = supabase
            .from('agents')
            .select('id, name, last_wake_time, autonomy_interval, autonomy_mode')
            .eq('is_active', true)
            .limit(1000);

        if (isForced) {
            // No additional filtering if forced
        } else if (mode === 'priority') {
            // Priority mode: Only target 'full' autonomy agents (which we set to 5 min interval)
            query = query.eq('autonomy_mode', 'full');
        } else {
            // Standard mode (15m): Target agents in automated modes (scheduled/full/manual-automated)
            // We'll filter based on their individual intervals in memory for precision
            query = query.in('autonomy_mode', ['scheduled', 'full']);
        }

        const { data: agents, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // 2. Filter agents based on interval (Skip if forced)
        const now = new Date();
        const activeAgents = (agents as any[] || []).filter(agent => {
            if (isForced) return true;

            // If it's priority mode, we already filtered for 'full' in query, so they are all due
            if (mode === 'priority') return true;

            // Frequency check for standard mode (15m cron)
            if (!agent.last_wake_time) return true; // Never woken? Wake now.

            const lastWake = new Date(agent.last_wake_time);
            const diffMs = now.getTime() - lastWake.getTime();
            const diffMin = Math.floor(diffMs / 60000);

            // Return true if the minutes elapsed is >= the agent's specific interval
            return diffMin >= (agent.autonomy_interval || 15);
        });

        console.log(`[GLOBAL] [${mode.toUpperCase()}] ${isForced ? 'FORCED ' : ''}Bulk wake starting for ${activeAgents.length} agents across the platform`);

        // 2. Trigger wake-agent for each agent in parallel
        const wakePromises = activeAgents.map(async (agent) => {
            try {
                console.log(`Triggering ${isForced ? 'FORCED ' : ''}wake for agent: ${agent.name} (${agent.id})`);

                const wakeUrl = `${supabaseUrl}/functions/v1/wake-agent/${agent.id}`;
                const response = await fetch(wakeUrl, {
                    method: isForced ? 'POST' : 'GET',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    // Update last_wake_time in DB
                    await supabase
                        .from('agents')
                        .update({ last_wake_time: new Date().toISOString() })
                        .eq('id', agent.id);
                }

                return {
                    agentId: agent.id,
                    name: agent.name,
                    status: response.ok ? 'success' : 'error',
                    response: result
                } as WakeResult;
            } catch (err: any) {
                console.error(`Failed to trigger wake for agent ${agent.name}:`, err);
                return {
                    agentId: agent.id,
                    name: agent.name,
                    status: 'error',
                    error: err.message
                } as WakeResult;
            }
        });

        const results = await Promise.allSettled(wakePromises);
        const flattenedResults = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error', error: 'Unexpected failure' });

        return new Response(JSON.stringify({
            message: `Bulk wake trigger complete for ${flattenedResults.length} agents`,
            results: flattenedResults
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
