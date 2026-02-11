import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Tag, Calendar, Hash, Users } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Coupon {
    code: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
    max_uses: number
    uses: number
    valid_until: string | null
    active: boolean
    specific_user_id?: string | null
}

export const AdminCoupons: React.FC = () => {
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
        code: '',
        discount_type: 'percent',
        discount_value: 0,
        max_uses: 0,
        active: true,
        specific_user_id: null
    })

    useEffect(() => {
        fetchCoupons()
    }, [])

    const fetchCoupons = async () => {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCoupons(data || [])
        } catch (error) {
            console.error('Error fetching coupons:', error)
            toast.error('Failed to fetch coupons')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCoupon = async () => {
        if (!newCoupon.code || !newCoupon.discount_value) {
            toast.error('Please fill in required fields')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('coupons')
                .insert([{
                    ...newCoupon,
                    active: true,
                    uses: 0,
                    created_at: new Date().toISOString()
                }])

            if (error) throw error

            toast.success('Coupon created successfully')
            setShowCreate(false)
            setNewCoupon({
                code: '',
                discount_type: 'percent',
                discount_value: 0,
                max_uses: 0,
                active: true,
                specific_user_id: null
            })
            fetchCoupons()
        } catch (error) {
            console.error('Error creating coupon:', error)
            toast.error('Failed to create coupon')
        } finally {
            setLoading(false)
        }
    }

    // Quick toggle for status
    const toggleCouponStatus = async (code: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('coupons')
                .update({ active: !currentStatus })
                .eq('code', code)

            if (error) throw error

            setCoupons(coupons.map(c =>
                c.code === code ? { ...c, active: !currentStatus } : c
            ))
            toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`)
        } catch (error) {
            console.error('Error updating coupon:', error)
            toast.error('Failed to update coupon status')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
                    <p className="text-muted-foreground">Manage discount codes and promotions.</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {showCreate ? 'Cancel' : 'Create Coupon'}
                </Button>
            </div>

            {showCreate && (
                <div className="bg-card border rounded-xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-semibold mb-4">Create New Coupon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-sm font-medium">Coupon Code (e.g. SUMMER25)</label>
                            <input
                                type="text"
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                value={newCoupon.code}
                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Discount Type</label>
                            <select
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                value={newCoupon.discount_type}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value as any })}
                            >
                                <option value="percent">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Discount Value</label>
                            <input
                                type="number"
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                value={newCoupon.discount_value}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Max Uses (0 for unlimited)</label>
                            <input
                                type="number"
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                value={newCoupon.max_uses}
                                onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium">Specific User ID (Optional)</label>
                            <input
                                type="text"
                                className="w-full mt-1 p-2 border rounded-md bg-background"
                                placeholder="UUID of the user (leave empty for global)"
                                value={newCoupon.specific_user_id || ''}
                                onChange={e => setNewCoupon({ ...newCoupon, specific_user_id: e.target.value || null })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">If set, only this user can redeem this coupon.</p>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleCreateCoupon} disabled={loading}>
                            Create Coupon
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-muted-foreground">Loading coupons...</p>
                ) : (
                    coupons.map((coupon) => (
                        <div key={coupon.code} className={`relative rounded-xl border bg-card p-6 shadow-sm flex flex-col ${!coupon.active ? 'opacity-75' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-primary" />
                                    <h3 className="font-mono font-bold text-lg">{coupon.code}</h3>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {coupon.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="mb-6 space-y-2">
                                <div className="text-2xl font-bold text-foreground">
                                    {coupon.discount_type === 'fixed' ? '₹' : ''}
                                    {coupon.discount_value}
                                    {coupon.discount_type === 'percent' ? '%' : ''}
                                    <span className="text-base font-normal text-muted-foreground ml-1">OFF</span>
                                </div>

                                <div className="flex flex-col text-sm text-muted-foreground gap-2">
                                    <div className="flex items-center gap-1">
                                        <Hash className="h-3 w-3" />
                                        {coupon.uses} / {coupon.max_uses === 0 ? '∞' : coupon.max_uses} used
                                    </div>
                                    {coupon.valid_until && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(coupon.valid_until), 'MMM d, yyyy')}
                                        </div>
                                    )}
                                    {coupon.specific_user_id && (
                                        <div className="flex items-center gap-1 text-blue-500">
                                            <Users className="h-3 w-3" />
                                            User Exclusive
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => toggleCouponStatus(coupon.code, coupon.active)}
                                >
                                    {coupon.active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
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
