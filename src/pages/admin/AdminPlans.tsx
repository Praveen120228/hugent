import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Edit2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'
import { Badge } from '../../components/ui/Badge'

interface Plan {
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

export const AdminPlans: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
    const [showCreate, setShowCreate] = useState(false)
    const [newPlan, setNewPlan] = useState<Partial<Plan>>({
        id: '',
        name: '',
        description: '',
        amount: 0,
        original_amount: 0,
        currency: 'INR',
        interval: '',
        type: 'subscription',
        features: [],
        active: true
    })

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        setLoading(true)
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

    const handleSavePlan = async (plan: Partial<Plan>) => {
        try {
            // Remove 0 or null original_amount to keep it clean if not used
            const planToSave = { ...plan }
            if (!planToSave.original_amount || planToSave.original_amount <= 0) {
                delete planToSave.original_amount
            }

            const { error } = await supabase
                .from('plans')
                .upsert(planToSave)

            if (error) throw error

            toast.success('Plan saved successfully')
            setEditingPlan(null)
            setShowCreate(false)
            fetchPlans()
        } catch (error) {
            console.error('Error saving plan:', error)
            toast.error('Failed to save plan')
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

    const deletePlan = async (planId: string) => {
        if (!confirm('Are you sure you want to delete this plan? This may affect existing subscriptions.')) return
        try {
            const { error } = await supabase
                .from('plans')
                .delete()
                .eq('id', planId)

            if (error) throw error
            toast.success('Plan deleted')
            fetchPlans()
        } catch (error) {
            console.error('Error deleting plan:', error)
            toast.error('Failed to delete plan')
        }
    }

    const calculateDiscount = (amount: number, original_amount?: number) => {
        if (!original_amount || original_amount <= amount) return null
        const discount = Math.round(((original_amount - amount) / original_amount) * 100)
        return `${discount}% OFF`
    }

    const STANDARD_PLANS: Record<string, Partial<Plan>> = {
        'starter': {
            name: 'Starter',
            description: 'Perfect for exploring AI agents. Includes basic features and limited successful runs.',
            amount: 0,
            original_amount: 0,
            currency: 'INR',
            interval: 'month',
            type: 'subscription',
            active: true
        },
        'pro_monthly': {
            name: 'Pro Monthly',
            description: 'For serious creators. Priority wake cycles and increased limits.',
            amount: 2900,
            original_amount: 3500,
            currency: 'INR',
            interval: 'month',
            type: 'subscription',
            active: true
        },
        'pro_yearly': {
            name: 'Pro Yearly',
            description: 'Best value for serious creators. All Pro features with 2 months free.',
            amount: 29000,
            original_amount: 34800,
            currency: 'INR',
            interval: 'year',
            type: 'subscription',
            active: true
        },
        'org_monthly': {
            name: 'Organization Monthly',
            description: 'For teams and businesses. Advanced orchestration, custom LLMs, and priority support.',
            amount: 9900,
            original_amount: 11500,
            currency: 'INR',
            interval: 'month',
            type: 'subscription',
            active: true
        },
        'org_yearly': {
            name: 'Organization Yearly',
            description: 'Maximum power for your organization. Save 20% with annual billing.',
            amount: 99000,
            original_amount: 118800,
            currency: 'INR',
            interval: 'year',
            type: 'subscription',
            active: true
        },
        'credits_500': {
            name: '500 Credits Pack',
            description: 'Add 500 orchestration credits to your account. Credits never expire.',
            amount: 500,
            original_amount: 600,
            currency: 'INR',
            interval: '',
            type: 'credit_pack',
            active: true
        },
        'credits_1000': {
            name: '1000 Credits Pack',
            description: 'Add 1000 orchestration credits to your account. Best value for high volume.',
            amount: 900,
            original_amount: 1200,
            currency: 'INR',
            interval: '',
            type: 'credit_pack',
            active: true
        },
        'agent_hosting_basic': {
            name: 'Basic Agent Hosting',
            description: 'Host a single autonomous agent with 24/7 uptime guarantee.',
            amount: 1500,
            original_amount: 1800,
            currency: 'INR',
            interval: 'month',
            type: 'agent_hosting',
            active: true
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
                    <p className="text-muted-foreground">Manage subscription tiers, credit packs, and agency plans.</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {showCreate ? 'Cancel' : 'Create Plan'}
                </Button>
            </div>

            {/* Create/Edit Form */}
            {(showCreate || editingPlan) && (
                <div className="bg-card border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4">{showCreate ? 'Create New Plan' : `Edit ${editingPlan?.name}`}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan ID</label>
                            <input
                                type="text"
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="e.g. pro_monthly"
                                disabled={!!editingPlan}
                                value={editingPlan?.id || newPlan.id}
                                onChange={e => {
                                    const val = e.target.value
                                    if (showCreate) {
                                        const standardPlan = STANDARD_PLANS[val]
                                        if (standardPlan) {
                                            setNewPlan({ ...newPlan, id: val, ...standardPlan })
                                        } else {
                                            setNewPlan({ ...newPlan, id: val })
                                        }
                                    } else {
                                        setEditingPlan({ ...editingPlan!, id: val })
                                    }
                                }}
                                list="plan-suggestions"
                            />
                            <datalist id="plan-suggestions">
                                <option value="starter">Starter (Free)</option>
                                <option value="pro_monthly">Pro Monthly</option>
                                <option value="pro_yearly">Pro Yearly</option>
                                <option value="org_monthly">Organization Monthly</option>
                                <option value="org_yearly">Organization Yearly</option>
                                <option value="credits_500">Credits 500 pack</option>
                                <option value="credits_1000">Credits 1000 pack</option>
                                <option value="agent_hosting_basic">Basic Agent Hosting</option>
                            </datalist>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                            <input
                                type="text"
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={editingPlan?.name || newPlan.name}
                                onChange={e => showCreate ? setNewPlan({ ...newPlan, name: e.target.value }) : setEditingPlan({ ...editingPlan!, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                            <select
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={editingPlan?.type || newPlan.type}
                                onChange={e => showCreate ? setNewPlan({ ...newPlan, type: e.target.value as any }) : setEditingPlan({ ...editingPlan!, type: e.target.value as any })}
                            >
                                <option value="subscription">Subscription</option>
                                <option value="credit_pack">Credit Pack</option>
                                <option value="agent_hosting">Agent Hosting</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
                            <select
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={editingPlan?.currency || newPlan.currency}
                                onChange={e => showCreate ? setNewPlan({ ...newPlan, currency: e.target.value }) : setEditingPlan({ ...editingPlan!, currency: e.target.value })}
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                            <input
                                type="number"
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                value={editingPlan ? (isNaN(editingPlan.amount) ? '' : editingPlan.amount) : (isNaN(newPlan.amount!) ? '' : newPlan.amount!)}
                                onChange={e => {
                                    const val = parseFloat(e.target.value)
                                    showCreate ? setNewPlan({ ...newPlan, amount: isNaN(val) ? 0 : val }) : setEditingPlan({ ...editingPlan!, amount: isNaN(val) ? 0 : val })
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Original Price <span className="text-muted-foreground/50">(Optional)</span></label>
                            <input
                                type="number"
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="For discount display"
                                value={editingPlan ? (editingPlan.original_amount && !isNaN(editingPlan.original_amount) ? editingPlan.original_amount : '') : (newPlan.original_amount && !isNaN(newPlan.original_amount) ? newPlan.original_amount : '')}
                                onChange={e => {
                                    const val = parseFloat(e.target.value)
                                    showCreate ? setNewPlan({ ...newPlan, original_amount: isNaN(val) ? 0 : val }) : setEditingPlan({ ...editingPlan!, original_amount: isNaN(val) ? 0 : val })
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interval</label>
                            <input
                                type="text"
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="e.g. month, year (empty for one-time)"
                                value={editingPlan?.interval || newPlan.interval}
                                onChange={e => showCreate ? setNewPlan({ ...newPlan, interval: e.target.value }) : setEditingPlan({ ...editingPlan!, interval: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1 md:col-span-2 lg:col-span-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                            <textarea
                                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px]"
                                value={editingPlan?.description || newPlan.description}
                                onChange={e => showCreate ? setNewPlan({ ...newPlan, description: e.target.value }) : setEditingPlan({ ...editingPlan!, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => { setEditingPlan(null); setShowCreate(false); }}>Cancel</Button>
                        <Button onClick={() => handleSavePlan(showCreate ? newPlan : editingPlan!)}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Plan
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-muted-foreground">Loading plans...</p>
                ) : (
                    plans.map((plan) => (
                        <div key={plan.id} className={`relative rounded-3xl border bg-card p-6 shadow-sm flex flex-col transition-all ${!plan.active ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-md'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${plan.type === 'credit_pack' ? 'bg-emerald-100 text-emerald-700' :
                                    plan.type === 'agent_hosting' ? 'bg-purple-100 text-purple-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {plan.type?.replace('_', ' ') || 'Subscription'}
                                </span>
                                <div className="flex space-x-2">
                                    {calculateDiscount(plan.amount, plan.original_amount) && (
                                        <Badge className="bg-destructive text-destructive-foreground text-[10px] uppercase font-black px-2 py-0.5 animate-pulse">
                                            {calculateDiscount(plan.amount, plan.original_amount)}
                                        </Badge>
                                    )}
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${plan.active
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {plan.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h3 className="font-black text-xl leading-tight">{plan.name}</h3>
                                <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-60 uppercase tracking-tighter">{plan.id}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-3xl font-black">
                                        {formatCurrency(plan.amount, plan.currency)}
                                    </span>
                                    {plan.original_amount && plan.original_amount > plan.amount && (
                                        <span className="text-lg font-bold text-muted-foreground line-through decoration-destructive/50">
                                            {formatCurrency(plan.original_amount, plan.currency)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {plan.interval ? `Per ${plan.interval}` : 'One-time Payment'}
                                </span>
                                <p className="text-sm text-muted-foreground mt-3 font-medium line-clamp-2">{plan.description}</p>
                            </div>

                            <div className="flex gap-2 pt-4 border-t mt-auto">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl bg-background hover:bg-muted font-bold"
                                    size="sm"
                                    onClick={() => setEditingPlan(plan)}
                                >
                                    <Edit2 className="mr-2 h-3 w-3" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`flex-1 rounded-xl font-bold ${plan.active ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                                    onClick={() => togglePlanStatus(plan.id, plan.active)}
                                >
                                    {plan.active ? 'Disable' : 'Enable'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl text-destructive hover:bg-destructive/10"
                                    onClick={() => deletePlan(plan.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
