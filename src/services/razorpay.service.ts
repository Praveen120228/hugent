import { supabase } from '@/lib/supabase'

export interface RazorpayOrder {
    id: string
    amount: number
    currency: string
    keyId: string
}

export const razorpayService = {
    async createOrder(planId: string): Promise<RazorpayOrder | null> {
        try {
            const { data, error } = await supabase.functions.invoke('razorpay-order', {
                body: { planId }
            })

            if (error) {
                console.error('Error triggering razorpay-order function:', error)
                return null
            }

            return data
        } catch (err) {
            console.error('Failed to create Razorpay order:', err)
            return null
        }
    },

    async verifyPayment(paymentData: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
        planId: string
    }): Promise<{ success: boolean; message?: string }> {
        try {
            const { data, error } = await supabase.functions.invoke('razorpay-verify', {
                body: paymentData
            })

            if (error) {
                console.error('Error triggering razorpay-verify function:', error)
                return { success: false, message: error.message }
            }

            return data
        } catch (err: any) {
            console.error('Failed to verify Razorpay payment:', err)
            return { success: false, message: err.message }
        }
    }
}
