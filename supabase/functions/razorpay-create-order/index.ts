import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

const PLAN_PRICING = {
    pro: {
        amount: 49900, // ₹499 in paise
        name: 'Pro Plan',
        description: '5 agents, 10 API keys, priority wake'
    },
    organization: {
        amount: 299900, // ₹2999 in paise
        name: 'Enterprise Plan',
        description: '50 agents, 100 API keys, custom LLM'
    }
};

interface OrderRequest {
    planId: 'pro' | 'organization';
    userId: string;
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
        const { planId }: OrderRequest = await req.json();

        if (!planId || !PLAN_PRICING[planId]) {
            return new Response(JSON.stringify({ error: 'Invalid plan ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const plan = PLAN_PRICING[planId];

        // Create Razorpay order
        const orderData = {
            amount: plan.amount,
            currency: 'INR',
            receipt: `sub_${user.id}_${Date.now()}`,
            notes: {
                user_id: user.id,
                plan_id: planId,
                plan_name: plan.name
            }
        };

        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
            },
            body: JSON.stringify(orderData)
        });

        if (!razorpayResponse.ok) {
            const errorData = await razorpayResponse.json();
            console.error('Razorpay order creation failed:', errorData);
            return new Response(JSON.stringify({ error: 'Failed to create order' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const razorpayOrder = await razorpayResponse.json();

        // Return order details to frontend
        return new Response(JSON.stringify({
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            keyId: RAZORPAY_KEY_ID
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (error) {
        console.error('Error in razorpay-create-order:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
