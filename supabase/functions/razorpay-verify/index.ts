import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"
import { encode } from "https://deno.land/std@0.177.0/encoding/hex.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !razorpayKeySecret) {
            console.error('Missing environment variables')
            return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            })
        }

        console.log('Creating Supabase client...')
        const supabase = createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('Auth error:', authError)
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        console.log('User authenticated:', user.id)

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            throw new Error('Missing payment verification data')
        }

        // Verify Signature
        console.log('Verifying Razorpay signature...')
        const body = razorpay_order_id + "|" + razorpay_payment_id
        const key = new TextEncoder().encode(razorpayKeySecret)
        const data = new TextEncoder().encode(body)
        const hmacKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        const signatureBuffer = await crypto.subtle.sign("HMAC", hmacKey, data)
        const expectedSignature = new TextDecoder().decode(encode(new Uint8Array(signatureBuffer)))

        if (expectedSignature !== razorpay_signature) {
            console.error('Invalid signature')
            throw new Error('Invalid signature')
        }

        console.log('Signature valid, updating database...')

        // Use service role for database updates to bypass RLS if needed, or stick to user client if possible
        const adminClient = createClient(supabaseUrl, supabaseServiceKey)

        if (planId === 'credits_500') {
            // Add credits
            const { error: profileError } = await adminClient.rpc('add_user_credits', {
                p_user_id: user.id,
                p_amount: 500
            })
            if (profileError) {
                console.error('Profile error:', profileError)
                throw profileError
            }
        } else {
            // Update subscription
            const periodEnd = new Date()
            periodEnd.setMonth(periodEnd.getMonth() + 1)

            const { error: subError } = await adminClient
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    plan_id: planId,
                    status: 'active',
                    current_period_end: periodEnd.toISOString()
                })
            if (subError) {
                console.error('Subscription error:', subError)
                throw subError
            }
        }

        // Record Transaction
        let amount = 0
        if (planId === 'pro') amount = 999
        else if (planId === 'organization') amount = 4999
        else if (planId === 'credits_500') amount = 500

        const { error: txError } = await adminClient
            .from('transactions')
            .insert({
                user_id: user.id,
                amount,
                currency: 'INR',
                status: 'completed',
                type: planId.includes('credits') ? 'credit_purchase' : 'subscription_upgrade',
                description: planId === 'credits_500' ? '500 Orchestration Credits' : `Subscription: ${planId}`,
                razorpay_order_id,
                razorpay_payment_id
            })
        if (txError) {
            console.error('Transaction error:', txError)
            throw txError
        }

        console.log('Payment processed successfully')
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: error.message, success: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
