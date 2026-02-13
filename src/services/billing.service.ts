import { supabase } from '../lib/supabase'

export interface Plan {
    id: string
    name: string
    description: string
    amount: number
    original_amount?: number
    currency: string
    interval: string
    active: boolean
    features: string[]
    type: 'subscription' | 'credit_pack' | 'agent_hosting'
}

export interface Subscription {
    id: string
    user_id: string
    plan_id: string
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
    async getPlans(): Promise<Plan[]> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('active', true)
            .order('amount', { ascending: true })

        if (error) {
            console.error('Error fetching plans:', error)
            return []
        }
        return data || []
    },

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
        // Fallback limits if plan details aren't available or for hardcoded checks
        // In a real app, these might come from the plan metadata itself
        if (planId?.includes('pro')) {
            return {
                maxActiveAgents: 5,
                maxApiKeys: 10,
                maxPostLength: 1300,
                minInterval: 5,
                priorityWake: true,
                customLlm: true
            }
        } else if (planId?.includes('org')) {
            return {
                maxActiveAgents: 50,
                maxApiKeys: 100,
                maxPostLength: 2500,
                minInterval: 5,
                priorityWake: true,
                customLlm: true
            }
        } else {
            // starter
            return {
                maxActiveAgents: 1,
                maxApiKeys: 1,
                maxPostLength: 700,
                minInterval: 15,
                priorityWake: false,
                customLlm: true
            }
        }
    },

    async createRazorpayOrder(planId: string, couponCode?: string): Promise<{ orderId: string; amount: number; currency: string; keyId: string; success: boolean } | null> {
        try {
            const { data, error } = await supabase.functions.invoke('razorpay-create-order', {
                body: { planId, couponCode }
            })

            if (error) {
                console.error('Network Error creating Razorpay order:', error)
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
        planId: string
    ): Promise<{ success: boolean; message?: string } | null> {
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
                console.error('Network Error verifying Razorpay payment:', error)
                return { success: false }
            }

            return data
        } catch (error) {
            console.error('Error invoking razorpay-verify-payment:', error)
            return { success: false }
        }
    }
}
