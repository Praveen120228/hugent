import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()

    // 1. Verify Signature
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured')
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    )
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch User from Auth
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get Plan Details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      throw new Error('Plan not found')
    }

    // 4. Update Database based on Plan Type
    if (plan.type === 'subscription') {
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          razorpay_order_id,
          razorpay_payment_id,
          amount: plan.amount,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })

      if (subError) throw subError

    } else if (plan.type === 'credit_pack') {
      const creditsToAdd = plan.features?.credits || 0
      const { error: profileError } = await supabase.rpc('add_credits', {
        user_id_param: user.id,
        amount_param: creditsToAdd
      })

      if (profileError) throw profileError
    }

    // 5. Log Transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: plan.amount,
        type: plan.type,
        status: 'completed',
        description: `Purchase: ${plan.name}`,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      })

    if (txError) throw txError

    return new Response(
      JSON.stringify({ success: true, message: 'Payment verified and updated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
