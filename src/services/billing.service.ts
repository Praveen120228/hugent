import { supabase } from '../lib/supabase'

export interface Subscription {
    id: string
    user_id: string
    plan_id: 'starter' | 'pro' | 'organization'
    status: 'active' | 'canceled' | 'past_due'
    current_period_end: string
    created_at: string
}

export interface Transaction {
    id: string
    user_id: string
    amount: number
    currency: string
    status: 'completed' | 'pending' | 'failed'
    type: 'subscription' | 'credit_purchase'
    description: string
    created_at: string
}

export const billingService = {
    async getUserSubscription(userId: string): Promise<Subscription | null> {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle()

        if (error) {
            console.error('Error fetching subscription:', error)
            return null
        }
        return data
    },

    async getTransactionHistory(userId: string): Promise<Transaction[]> {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching transactions:', error)
            return []
        }
        return data || []
    },

    async getCreditBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching credits:', error)
            return 0
        }
        return data?.credits || 0
    },

    getPlanLimits(planId: string | undefined) {
        switch (planId) {
            case 'pro':
                return {
                    maxActiveAgents: 5,
                    maxApiKeys: 10,
                    maxPostLength: 1300,
                    minInterval: 5,
                    priorityWake: true,
                    customLlm: false
                }
            case 'organization':
                return {
                    maxActiveAgents: 50,
                    maxApiKeys: 100,
                    maxPostLength: 2500,
                    minInterval: 5,
                    priorityWake: true,
                    customLlm: true
                }
            default: // starter
                return {
                    maxActiveAgents: 1,
                    maxApiKeys: 1,
                    maxPostLength: 700,
                    minInterval: 15,
                    priorityWake: false,
                    customLlm: false
                }
        }
    },

    // Plan pricing in paise (1 rupee = 100 paise)
    PLAN_PRICING: {
        pro: {
            amount: 99900, // ₹999
            name: 'Pro Plan',
            period: 'month'
        },
        organization: {
            amount: 499900, // ₹4999
            name: 'Enterprise Plan',
            period: 'month'
        }
    },

    async createRazorpayOrder(planId: 'pro' | 'organization'): Promise<{ orderId: string; amount: number; currency: string; keyId: string } | null> {
        try {
            const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
                body: { planId }
            })

            if (error) {
                console.error('Network/Transport Error creating Razorpay order:', error)
                return null
            }

            if (data && data.success === false) {
                console.error('Razorpay Edge Function Error:', data.error, data.details || data.message || '')
                return null
            }

            return data
        } catch (error) {
            console.error('Error invoking razorpay-create-order:', error)
            return null
        }
    },

    async verifyRazorpayPayment(
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
        planId: 'pro' | 'organization'
    ): Promise<{ success: boolean; subscription?: any } | null> {
        try {
            const { data, error } = await supabase.functions.invoke('razorpay-verify-payment', {
                body: {
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_signature: razorpaySignature,
                    planId
                }
            })

            if (error) {
                console.error('Network/Transport Error verifying Razorpay payment:', error)
                return { success: false }
            }

            if (data && data.success === false) {
                console.error('Razorpay Verification Edge Function Error:', data.error, data.details || data.message || '')
                return { success: false }
            }

            return data
        } catch (error) {
            console.error('Error invoking razorpay-verify-payment:', error)
            return { success: false }
        }
    }
}
