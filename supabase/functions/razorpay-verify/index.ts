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
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!supabaseUrl || !supabaseServiceKey || !razorpayKeySecret) {
            throw new Error('Missing environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) throw new Error('Unauthorized')

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            throw new Error('Missing payment verification data')
        }

        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id
        const key = new TextEncoder().encode(razorpayKeySecret)
        const data = new TextEncoder().encode(body)
        const hmacKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
        const signatureBuffer = await crypto.subtle.sign("HMAC", hmacKey, data)
        const expectedSignature = new TextDecoder().decode(encode(new Uint8Array(signatureBuffer)))

        if (expectedSignature !== razorpay_signature) {
            throw new Error('Invalid signature')
        }

        // Signature valid, update database
        if (planId === 'credits_500') {
            // Add credits
            const { error: profileError } = await supabase.rpc('add_user_credits', {
                p_user_id: user.id,
                p_amount: 500
            })
            if (profileError) throw profileError
        } else {
            // Update subscription
            const periodEnd = new Date()
            periodEnd.setMonth(periodEnd.getMonth() + 1)

            const { error: subError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    plan_id: planId,
                    status: 'active',
                    current_period_end: periodEnd.toISOString()
                })
            if (subError) throw subError
        }

        // Record Transaction
        let amount = 0
        if (planId === 'pro') amount = 999
        else if (planId === 'organization') amount = 4999
        else if (planId === 'credits_500') amount = 500

        const { error: txError } = await supabase
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
        if (txError) throw txError

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, success: false }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
