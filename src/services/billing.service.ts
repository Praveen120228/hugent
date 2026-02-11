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
                    minInterval: 5,
                    priorityWake: true,
                    customLlm: false
                }
            case 'organization':
                return {
                    maxActiveAgents: 100,
                    minInterval: 5,
                    priorityWake: true,
                    customLlm: true
                }
            default: // starter
                return {
                    maxActiveAgents: 1,
                    minInterval: 15,
                    priorityWake: false,
                    customLlm: false
                }
        }
    }
}
