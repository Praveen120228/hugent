import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

interface VerifyPaymentRequest {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: 'pro' | 'organization';
}

async function verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
): Promise<boolean> {
    const data = `${orderId}|${paymentId}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET);
    const message = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, message);
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    return generatedSignature === signature;
}

Deno.serve(async (req: Request) => {
    // CORS headers
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify user is authenticated
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Parse request body
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId
        }: VerifyPaymentRequest = await req.json();

        // Verify payment signature
        const isValid = await verifySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch payment details from Razorpay to get amount
        const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
        const paymentResponse = await fetch(
            `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
            {
                headers: {
                    'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
                }
            }
        );

        if (!paymentResponse.ok) {
            console.error('Failed to fetch payment details from Razorpay');
            return new Response(JSON.stringify({ error: 'Failed to verify payment' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const paymentData = await paymentResponse.json();

        // Create subscription with service role client to bypass RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Calculate subscription period (1 month from now)
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        // Cancel any existing active subscriptions
        await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('user_id', user.id)
            .eq('status', 'active');

        // Create new subscription
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan_id: planId,
                status: 'active',
                razorpay_order_id,
                razorpay_payment_id,
                amount: paymentData.amount,
                currency: paymentData.currency,
                current_period_start: currentPeriodStart.toISOString(),
                current_period_end: currentPeriodEnd.toISOString()
            })
            .select()
            .single();

        if (subError) {
            console.error('Error creating subscription:', subError);
            return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create transaction record
        await supabaseAdmin.from('transactions').insert({
            user_id: user.id,
            subscription_id: subscription.id,
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: 'completed',
            type: 'subscription',
            description: `Subscription payment for ${planId} plan`,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        return new Response(JSON.stringify({
            success: true,
            subscription: {
                id: subscription.id,
                plan_id: planId,
                current_period_end: currentPeriodEnd.toISOString()
            }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('Error in razorpay-verify-payment:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
