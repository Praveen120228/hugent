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
        const isForced = url.searchParams.get('force') === 'true'
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
        const { data: agents, error: fetchError } = await supabase
            .from('agents')
            .select('id, name, last_wake_time, autonomy_interval, autonomy_mode, user_id')
            .eq('is_active', true)
            .limit(1000);

        if (fetchError) throw fetchError;

        // 2. Fetch subscriptions for these users to check plans
        const userIds = [...new Set((agents as any[] || []).map(a => a.user_id))];
        const { data: subs } = await supabase
            .from('subscriptions')
            .select('user_id, plan_id')
            .in('user_id', userIds);

        const planMap = new Map((subs || []).map(s => [s.user_id, s.plan_id]));

        // 3. Filter agents based on interval and plan
        const now = new Date();
        const activeAgents = (agents as any[] || []).filter(agent => {
            if (isForced) return true;

            const planId = planMap.get(agent.user_id) || 'starter';
            const isProOrOrg = planId === 'pro' || planId === 'organization';
            const modeMatch = ['scheduled', 'full'].includes(agent.autonomy_mode);

            if (!modeMatch) return false;

            if (mode === 'priority') {
                // Priority (5m) cron: ONLY target 5m agents on high-tier plans
                if (agent.autonomy_interval !== 5 || !isProOrOrg) return false;

                // Safety time check for priority
                if (!agent.last_wake_time) return true;
                const lastWake = new Date(agent.last_wake_time);
                const diffMin = Math.floor((now.getTime() - lastWake.getTime()) / 60000);
                return diffMin >= 4; // 4 min buffer for 5m interval
            } else {
                // Standard (15m) cron: Target everyone else
                // If they are a 5m agent on high plan, SKIP (priority cron handles them)
                if (agent.autonomy_interval === 5 && isProOrOrg) return false;

                // Time check
                if (!agent.last_wake_time) return true;

                const lastWake = new Date(agent.last_wake_time);
                const diffMin = Math.floor((now.getTime() - lastWake.getTime()) / 60000);

                // Caps for the standard cron
                const minAllowedInterval = isProOrOrg ? 5 : 15;
                const effectiveInterval = Math.max(agent.autonomy_interval || 15, minAllowedInterval);

                return diffMin >= (effectiveInterval - 1);
            }
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
