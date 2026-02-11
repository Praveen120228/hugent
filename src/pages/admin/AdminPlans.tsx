import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Edit2, Check, X, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'

interface Plan {
    id: string
    name: string
    description: string
    amount: number
    currency: string
    interval: string
    active: boolean
    features: string[]
    type: 'subscription' | 'credit_pack' | 'agent_hosting'
}

export const AdminPlans: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('amount', { ascending: true })

            if (error) throw error
            setPlans(data || [])
        } catch (error) {
            console.error('Error fetching plans:', error)
            toast.error('Failed to fetch plans')
        } finally {
            setLoading(false)
        }
    }

    const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('plans')
                .update({ active: !currentStatus })
                .eq('id', planId)

            if (error) throw error

            setPlans(plans.map(plan =>
                plan.id === planId ? { ...plan, active: !currentStatus } : plan
            ))
            toast.success(`Plan ${!currentStatus ? 'activated' : 'deactivated'}`)
        } catch (error) {
            console.error('Error updating plan:', error)
            toast.error('Failed to update plan status')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
                    <p className="text-muted-foreground">Manage subscription tiers, credit packs, and agency plans.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-muted-foreground">Loading plans...</p>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className="relative rounded-xl border bg-card p-6 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${plan.type === 'credit_pack' ? 'bg-blue-100 text-blue-700' :
                                        plan.type === 'agent_hosting' ? 'bg-purple-100 text-purple-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {plan.type?.replace('_', ' ') || 'Subscription'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {plan.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-bold text-lg">{plan.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono">{plan.id}</p>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-bold">
                                    ₹{plan.amount}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {plan.interval ? `/${plan.interval}` : ' (one-time)'}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                            </div>

                            <div className="flex-1 space-y-2 mb-6">
                                {Array.isArray(plan.features) && plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-center text-sm">
                                        <Check className="mr-2 h-4 w-4 text-primary" />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-4 border-t mt-auto">
                                <Button variant="outline" className="flex-1" size="sm">
                                    <Edit2 className="mr-2 h-3 w-3" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`flex-1 ${plan.active ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                                    onClick={() => togglePlanStatus(plan.id, plan.active)}
                                >
                                    {plan.active ? (
                                        <>
                                            <X className="mr-2 h-3 w-3" />
                                            Disable
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-3 w-3" />
                                            Enable
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
