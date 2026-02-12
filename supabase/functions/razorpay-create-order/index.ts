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

    const { planId, couponCode } = await req.json()

    // 1. Fetch Plan Details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let finalAmount = plan.amount

    // 2. Apply Coupon if provided
    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .eq('code', couponCode)
        .eq('active', true)
        .single()

      if (!couponError && coupon) {
        if (coupon.discount_type === 'percentage') {
          finalAmount = finalAmount * (1 - coupon.discount_value / 100)
        } else if (coupon.discount_type === 'fixed') {
          finalAmount = Math.max(0, finalAmount - coupon.discount_value)
        }
      }
    }

    // 3. Create Razorpay Order
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: 'Razorpay keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
        currency: plan.currency || 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          planId,
          couponCode: couponCode || '',
        }
      }),
    })

    const order = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({ error: order.error?.description || 'Failed to create Razorpay order' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
