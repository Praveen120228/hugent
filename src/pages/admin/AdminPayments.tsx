import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Search, Filter, Download, ExternalLink } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'

interface Transaction {
    id: string
    created_at: string
    user_id: string
    amount: number
    currency: string
    status: string
    razorpay_payment_id: string
    razorpay_order_id: string
    profiles?: {
        email: string
        full_name: string
    }
}

export const AdminPayments: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    profiles:user_id (email, full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setTransactions(data || [])
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredTransactions = transactions.filter(txn =>
        txn.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                    <p className="text-muted-foreground">Manage and audit all financial transactions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by Payment ID or Email..."
                        className="w-full bg-background rounded-md border pl-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="ghost" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Amount</th>
                                <th className="px-4 py-3 font-medium">Payment ID</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        Loading transactions...
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((txn) => (
                                    <tr key={txn.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {format(new Date(txn.created_at), 'MMM d, yyyy HH:mm')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{txn.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{txn.profiles?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {txn.amount ? `₹${txn.amount}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {txn.razorpay_payment_id || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
                                                ${txn.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    txn.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {txn.razorpay_payment_id && (
                                                    <a
                                                        href={`https://dashboard.razorpay.com/app/payments/${txn.razorpay_payment_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-primary hover:underline text-xs"
                                                    >
                                                        View in Rzp <ExternalLink className="ml-1 h-3 w-3" />
                                                    </a>
                                                )}
                                                {txn.status === 'completed' && txn.razorpay_payment_id && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="h-6 text-xs px-2"
                                                        onClick={async () => {
                                                            if (!confirm(`Are you sure you want to refund payment ${txn.razorpay_payment_id}?`)) return

                                                            const loadingToast = toast.loading('Processing refund...')
                                                            try {
                                                                const { error } = await supabase.functions.invoke('razorpay-refund', {
                                                                    body: { payment_id: txn.razorpay_payment_id }
                                                                })

                                                                if (error) throw error

                                                                toast.success('Refund processed successfully', { id: loadingToast })
                                                                fetchTransactions()
                                                            } catch (err: any) {
                                                                console.error('Refund failed:', err)
                                                                toast.error(err.message || 'Refund failed', { id: loadingToast })
                                                            }
                                                        }}
                                                    >
                                                        Refund
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
