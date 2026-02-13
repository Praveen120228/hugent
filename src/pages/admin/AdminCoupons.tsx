import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Tag, Calendar, Hash, Users, X, Check } from 'lucide-react'
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
        setLoading(true)
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
        }
    }

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

    const handleDeleteCoupon = async (code: string) => {
        if (!confirm('Are you sure you want to delete this coupon?')) return
        try {
            const { error } = await supabase
                .from('coupons')
                .delete()
                .eq('code', code)

            if (error) throw error
            toast.success('Coupon deleted')
            fetchCoupons()
        } catch (error) {
            console.error('Error deleting coupon:', error)
            toast.error('Failed to delete coupon')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Promo Coupons</h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Design and distribute promotional discount codes.</p>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)} className="rounded-2xl h-12 px-6 font-bold shadow-lg transition-all hover:scale-[1.02]">
                    <Plus className="mr-2 h-4 w-4" />
                    {showCreate ? 'Discard' : 'New Coupon'}
                </Button>
            </div>

            {showCreate && (
                <div className="bg-card border rounded-3xl p-8 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center space-x-2 mb-6">
                        <Tag className="h-5 w-5 text-primary" />
                        <h3 className="font-black text-xl">Create Promo Code</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Code</label>
                            <input
                                type="text"
                                className="w-full bg-background border rounded-2xl px-5 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/30"
                                placeholder="SUMMER20"
                                value={newCoupon.code}
                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Discount Type</label>
                            <select
                                className="w-full bg-background border rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none"
                                value={newCoupon.discount_type}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value as any })}
                            >
                                <option value="percent">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Value</label>
                            <input
                                type="number"
                                className="w-full bg-background border rounded-2xl px-5 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                value={newCoupon.discount_value}
                                onChange={e => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Max Uses (0 = ∞)</label>
                            <input
                                type="number"
                                className="w-full bg-background border rounded-2xl px-5 py-3 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                value={newCoupon.max_uses}
                                onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">User Exclusive (Optional)</label>
                            <input
                                type="text"
                                className="w-full bg-background border rounded-2xl px-5 py-3 text-xs font-mono focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/30"
                                placeholder="Enter User UUID for targeted discounts"
                                value={newCoupon.specific_user_id || ''}
                                onChange={e => setNewCoupon({ ...newCoupon, specific_user_id: e.target.value || null })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-xl font-bold">Cancel</Button>
                        <Button onClick={handleCreateCoupon} className="rounded-xl px-8 font-black">
                            Save Coupon
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading && !coupons.length ? (
                    <div className="md:col-span-2 lg:col-span-3 flex justify-center py-12">
                        <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Syncing Coupons...</p>
                    </div>
                ) : (
                    coupons.map((coupon) => (
                        <div key={coupon.code} className={`group relative rounded-3xl border bg-card p-6 shadow-sm flex flex-col transition-all hover:shadow-md ${!coupon.active ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Tag className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl tracking-tight uppercase">{coupon.code}</h3>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                            {coupon.active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 space-y-4">
                                <div className="text-4xl font-black text-foreground tracking-tighter">
                                    {coupon.discount_type === 'fixed' ? '₹' : ''}
                                    {coupon.discount_value}
                                    {coupon.discount_type === 'percent' ? '%' : ''}
                                    <span className="text-xs font-bold text-muted-foreground ml-2 tracking-widest uppercase">DISCOUNT</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="flex items-center text-muted-foreground/80 bg-muted/30 p-2 rounded-xl">
                                        <Hash className="h-3 w-3 mr-2 opacity-50" />
                                        {coupon.uses} / {coupon.max_uses === 0 ? '∞' : coupon.max_uses}
                                    </div>
                                    {coupon.valid_until && (
                                        <div className="flex items-center text-muted-foreground/80 bg-muted/30 p-2 rounded-xl">
                                            <Calendar className="h-3 w-3 mr-2 opacity-50" />
                                            {format(new Date(coupon.valid_until), 'MMM d')}
                                        </div>
                                    )}
                                    {coupon.specific_user_id && (
                                        <div className="col-span-2 flex items-center text-blue-500 bg-blue-500/5 p-2 rounded-xl">
                                            <Users className="h-3 w-3 mr-2 opacity-70" />
                                            Private: Targeted Offer
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t mt-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 rounded-xl bg-background hover:bg-muted font-bold transition-transform active:scale-95"
                                    onClick={() => toggleCouponStatus(coupon.code, coupon.active)}
                                >
                                    {coupon.active ? (
                                        <><X className="mr-2 h-3 w-3" /> Pause</>
                                    ) : (
                                        <><Check className="mr-2 h-3 w-3" /> Resume</>
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl text-destructive hover:bg-destructive/10 transition-transform active:scale-90"
                                    onClick={() => handleDeleteCoupon(coupon.code)}
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
