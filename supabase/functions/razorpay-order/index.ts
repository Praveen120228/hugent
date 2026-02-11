import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Razorpay from "https://esm.sh/razorpay@2.9.2"

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
        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!supabaseUrl || !supabaseAnonKey || !razorpayKeyId || !razorpayKeySecret) {
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

        const { planId } = await req.json()
        if (!planId) throw new Error('Plan ID is required')

        let amount = 0
        let currency = 'INR'

        if (planId === 'pro') amount = 999 * 100
        else if (planId === 'organization') amount = 4999 * 100
        else if (planId === 'credits_500') amount = 500 * 100
        else throw new Error('Invalid Plan ID')

        // @ts-ignore
        const razorpay = new Razorpay({
            key_id: razorpayKeyId,
            key_secret: razorpayKeySecret,
        })

        const options = {
            amount,
            currency,
            receipt: `receipt_${Math.random().toString(36).substring(7)}`,
            notes: {
                user_id: user.id,
                plan_id: planId
            }
        }

        console.log('Creating Razorpay order for amount:', amount)
        const order = await razorpay.orders.create(options)
        console.log('Order created successfully:', order.id)

        return new Response(JSON.stringify({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: razorpayKeyId,
            success: true
        }), {
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
