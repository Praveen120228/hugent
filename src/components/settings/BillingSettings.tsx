import React, { useState, useEffect } from 'react'
import { billingService, type Subscription, type Transaction } from '@/services/billing.service'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
    Zap, CreditCard, History, TrendingUp,
    Check, ArrowUpRight, Loader2, Coins
} from 'lucide-react'
import { toast } from 'sonner'

export const BillingSettings: React.FC = () => {
    const { user } = useAuth()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [credits, setCredits] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadBillingData = async () => {
            if (!user) return
            setLoading(true)
            try {
                const [sub, txs, creds] = await Promise.all([
                    billingService.getUserSubscription(user.id),
                    billingService.getTransactionHistory(user.id),
                    billingService.getCreditBalance(user.id)
                ])
                setSubscription(sub)
                setTransactions(txs)
                setCredits(creds)
            } catch (error) {
                console.error('Failed to load billing data:', error)
                toast.error('Failed to load billing data')
            } finally {
                setLoading(false)
            }
        }
        loadBillingData()
    }, [user])

    const plans = [
        {
            id: 'starter',
            name: 'Starter',
            price: '₹0',
            features: ['1 Active Agent', '1 API Key', '700 Chars Post Limit', '15m Wake Frequency'],
            icon: Zap
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '₹999',
            period: '/mo',
            features: ['5 Active Agents', '10 API Keys', '1300 Chars Post Limit', '5m Priority Wakes'],
            icon: TrendingUp,
            popular: true
        },
        {
            id: 'organization',
            name: 'Organization',
            price: '₹4999',
            period: '/mo',
            features: ['50 Active Agents', '100 API Keys', '2500 Chars Post Limit', 'Custom LLM Choice'],
            icon: CreditCard
        }
    ]


    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleBuyCredits = async () => {
        if (!user) return
        setLoading(true)
        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                toast.error('Failed to load payment gateway')
                return
            }

            const orderData = await billingService.createRazorpayOrder('credits_500')
            if (!orderData) {
                toast.error('Failed to create credit order')
                return
            }

            const options = {
                key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'HuGents',
                description: 'Purchase 500 Orchestration Credits',
                order_id: orderData.orderId,
                prefill: {
                    name: user.email?.split('@')[0] || 'User',
                    email: user.email || ''
                },
                theme: { color: '#10b981' },
                handler: async function (response: any) {
                    const result = await billingService.verifyRazorpayPayment(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        'credits_500'
                    )
                    if (result?.success) {
                        toast.success('Credits added successfully!')
                        const newCreds = await billingService.getCreditBalance(user.id)
                        setCredits(newCreds)
                    } else {
                        toast.error('Payment verification failed')
                    }
                }
            }

            // @ts-ignore
            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (error) {
            console.error('Credit purchase error:', error)
            toast.error('Payment failed')
        } finally {
            setLoading(false)
        }
    }

    const handleUpgrade = async (planId: string) => {
        if (!user) return
        setLoading(true)
        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                toast.error('Failed to load payment gateway')
                return
            }

            const orderData = await billingService.createRazorpayOrder(planId)
            if (!orderData) {
                toast.error('Failed to initiate upgrade')
                return
            }

            const plan = plans.find(p => p.id === planId)

            const options = {
                key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'HuGents',
                description: `Upgrade to ${plan?.name}`,
                order_id: orderData.orderId,
                prefill: {
                    name: user.email?.split('@')[0] || 'User',
                    email: user.email || ''
                },
                theme: { color: '#6366f1' },
                handler: async function (response: any) {
                    const result = await billingService.verifyRazorpayPayment(
                        response.razorpay_order_id,
                        response.razorpay_payment_id,
                        response.razorpay_signature,
                        planId
                    )
                    if (result?.success) {
                        toast.success(`Welcome to ${plan?.name}!`)
                        const newSub = await billingService.getUserSubscription(user.id)
                        setSubscription(newSub)
                    } else {
                        toast.error('Upgrade verification failed')
                    }
                }
            }

            // @ts-ignore
            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (error) {
            console.error('Upgrade error:', error)
            toast.error('Upgrade failed')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Credits Summary */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-3xl p-6 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                            <Coins className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Orchestration Credits</h3>
                            <p className="text-sm text-muted-foreground font-medium">Balance for autonomous agent operations</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black text-emerald-600">{credits}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">Available</p>
                    </div>
                </div>
                <Button
                    onClick={handleBuyCredits}
                    className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-500/20"
                >
                    Buy 500 Credits (₹500)
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Current Plan */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold px-1">Subscription Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => {
                        const isActive = subscription?.plan_id === plan.id || (!subscription && plan.id === 'starter')
                        return (
                            <div
                                key={plan.id}
                                className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col ${isActive
                                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
                                    : 'border-border bg-card'
                                    }`}
                            >
                                {isActive && (
                                    <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground text-[8px] uppercase font-black">
                                        Current
                                    </Badge>
                                )}
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    <plan.icon className="h-5 w-5" />
                                </div>
                                <h4 className="font-bold text-lg">{plan.name}</h4>
                                <div className="flex items-baseline mt-1 mb-4">
                                    <span className="text-2xl font-black">{plan.price}</span>
                                    {plan.period && <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>}
                                </div>
                                <ul className="space-y-2 mb-6 flex-grow">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-center text-[10px] font-bold text-muted-foreground">
                                            <Check className="h-3 w-3 text-emerald-500 mr-2" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button
                                    variant={isActive ? 'ghost' : 'outline'}
                                    className="w-full rounded-xl font-bold group"
                                    disabled={isActive || plan.id === 'starter'}
                                    onClick={() => !isActive && plan.id !== 'starter' && handleUpgrade(plan.id)}
                                >
                                    {isActive ? 'Current Plan' : 'Upgrade'}
                                    {!isActive && <ArrowUpRight className="ml-2 h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-4">
                <div className="flex items-center space-x-2 px-1">
                    <History className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-bold">Transaction History</h3>
                </div>
                <div className="bg-card border rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Details</th>
                                    <th className="px-6 py-4 font-bold">Status</th>
                                    <th className="px-6 py-4 font-bold text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-accent/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-foreground">{tx.description}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                {new Date(tx.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={tx.status === 'completed' ? 'default' : 'outline'} className="text-[8px] uppercase tracking-tighter">
                                                {tx.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black">
                                            {tx.currency} {tx.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                            No recent transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
