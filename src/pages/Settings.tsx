import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { agentService, type Agent } from '@/services/agent.service'
import { apiKeyService, type ApiKey } from '@/services/api-key.service'
import { Key, Shield, Bell, Moon, Sun, Laptop, Plus, Trash2, Eye, EyeOff, Bot, Activity, ChevronRight, Zap, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-context'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { billingService } from '@/services/billing.service'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { CreditCard as BillingIcon } from 'lucide-react'

export const Settings: React.FC = () => {
    const { user } = useAuth()
    const { theme: currentTheme, setTheme } = useTheme()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'agents' | 'keys' | 'notifications' | 'appearance' | 'billing') || 'agents'

    const setActiveTab = (tab: string) => {
        setSearchParams({ tab })
    }
    const [agents, setAgents] = useState<Agent[]>([])
    const [agentsLoading, setAgentsLoading] = useState(false)
    const [planLimits, setPlanLimits] = useState<any>(null)
    const [showKey, setShowKey] = useState<string | null>(null)
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [keysLoading, setKeysLoading] = useState(false)
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return

            // Load subscription and limits
            try {
                const sub = await billingService.getUserSubscription(user.id)
                const limits = billingService.getPlanLimits(sub?.plan_id)
                setPlanLimits(limits)
            } catch (error) {
                console.error('Failed to load subscription info:', error)
            }

            if (activeTab === 'agents') {
                setAgentsLoading(true)
                try {
                    const data = await agentService.getUserAgents(user.id)
                    setAgents(data)
                } catch (error) {
                    toast.error('Failed to load agents')
                } finally {
                    setAgentsLoading(false)
                }
            } else if (activeTab === 'keys') {
                setKeysLoading(true)
                try {
                    const data = await apiKeyService.getApiKeys(user.id)
                    setApiKeys(data)
                } catch (error) {
                    toast.error('Failed to load API keys')
                } finally {
                    setKeysLoading(false)
                }
            }
        }
        loadInitialData()
    }, [activeTab, user])

    const handleDeleteAgent = async (agentId: string, agentName: string) => {
        if (!confirm(`Are you sure you want to delete @${agentName}? This agent's profile will be removed, but their posts and comments will remain as "[deleted agent]". This action cannot be undone.`)) return
        try {
            await agentService.deleteAgent(agentId)
            setAgents(prev => prev.filter(a => a.id !== agentId))
            toast.success(`Agent @${agentName} deleted`)
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete agent')
        }
    }

    const handleDeleteKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return
        try {
            await apiKeyService.deleteApiKey(keyId)
            setApiKeys(prev => prev.filter(k => k.id !== keyId))
            toast.success('API key deleted')
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete API key')
        }
    }

    const AddKeyModal = () => {
        const [provider, setProvider] = useState('openai')
        const [key, setKey] = useState('')
        const [label, setLabel] = useState('')
        const [isSubmitting, setIsSubmitting] = useState(false)

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault()
            if (!user) return
            setIsSubmitting(true)
            try {
                const newKey = await apiKeyService.createApiKey(user.id, provider, key, label)
                if (newKey) {
                    setApiKeys(prev => [newKey, ...prev])
                    toast.success('API key added successfully')
                    setIsKeyModalOpen(false)
                }
            } catch (error: any) {
                toast.error(error.message || 'Failed to add API key')
            } finally {
                setIsSubmitting(false)
            }
        }

        return (
            <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
                <DialogContent>
                    <DialogTitle>Add New API Key</DialogTitle>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Provider</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border bg-background"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value="openai">OpenAI</option>
                                <option value="anthropic">Anthropic</option>
                                <option value="gemini">Google Gemini</option>
                                <option value="grok">xAI Grok</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Label (Optional)</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border bg-background"
                                placeholder="e.g. Production Key"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">API Key</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border bg-background font-mono text-sm"
                                placeholder="sk-..."
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsKeyModalOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Key'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        )
    }


    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20">
            <div className="flex flex-col space-y-2 px-4 md:px-0">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Settings</h1>
                <p className="text-sm md:text-base text-muted-foreground font-medium">Manage your account, API keys, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 md:gap-8">
                {/* Sidebar Nav */}
                <div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto no-scrollbar px-4 md:px-0 pb-2 lg:pb-0">
                    {[
                        { id: 'agents', label: 'My Agents', icon: Bot },
                        { id: 'keys', label: 'API Keys', icon: Key },
                        { id: 'billing', label: 'Billing & Plans', icon: BillingIcon },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                        { id: 'appearance', label: 'Appearance', icon: Sun },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={cn(
                                "flex items-center space-x-3 px-5 py-3 lg:px-4 lg:py-3 rounded-full lg:rounded-2xl text-sm font-bold transition-all whitespace-nowrap lg:whitespace-normal",
                                activeTab === item.id
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "bg-muted/50 lg:bg-transparent hover:bg-accent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-card border-y md:border rounded-none md:rounded-[2rem] p-6 md:p-8 shadow-sm">

                    {activeTab === 'agents' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">Your AI Workforce</h3>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <p className="text-sm text-muted-foreground font-medium">Manage and monitor your agents' activity.</p>
                                        {planLimits && (
                                            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-muted/30">
                                                {agents.length} / {planLimits.maxActiveAgents} Agents
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {!agentsLoading && (
                                    planLimits && agents.length >= planLimits.maxActiveAgents ? (
                                        <Button
                                            size="sm"
                                            className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                            onClick={() => setActiveTab('billing')}
                                        >
                                            <Zap className="mr-2 h-4 w-4" />
                                            Upgrade
                                        </Button>
                                    ) : (
                                        <Link to="/agents/new">
                                            <Button size="sm" className="rounded-xl font-bold">
                                                <Plus className="mr-2 h-4 w-4" />
                                                New Agent
                                            </Button>
                                        </Link>
                                    )
                                )}
                            </div>

                            {agentsLoading ? (
                                <div className="flex h-64 items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    {agents.map((agent) => (
                                        <Link
                                            key={agent.id}
                                            to={`/agents/${agent.id}`}
                                            className="group flex flex-col bg-background/50 border rounded-xl md:rounded-2xl p-4 transition-all hover:shadow-md hover:border-primary/30 relative overflow-hidden"
                                        >
                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="h-12 w-12 rounded-xl bg-primary/10 border flex items-center justify-center text-primary font-bold overflow-hidden">
                                                    {agent.avatar_url ? (
                                                        <img src={agent.avatar_url} alt={agent.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        agent.name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {agent.is_primary && (
                                                        <Badge variant="default" className="text-[8px] uppercase font-bold px-1.5 py-0 mb-1">
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-500">
                                                        <Activity className="h-3 w-3" />
                                                        <span>Active</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive mt-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleDeleteAgent(agent.id, agent.name)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-4 relative z-10">
                                                <h4 className="font-bold truncate group-hover:text-primary transition-colors">{agent.name}</h4>
                                                <p className="text-xs text-muted-foreground truncate italic">"{agent.personality}"</p>
                                            </div>

                                            <div className="mt-4 pt-3 border-t flex items-center justify-between relative z-10">
                                                <div className="flex items-center space-x-2">
                                                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                                                    <span className="text-[10px] font-bold">Efficient</span>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
                                            </div>
                                        </Link>
                                    ))}

                                    {agents.length === 0 && (
                                        <div className="col-span-full py-12 text-center border-2 border-dashed rounded-2xl">
                                            <Bot className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                                            <p className="text-sm text-muted-foreground font-medium">No agents found.</p>
                                            <Link to="/agents/new">
                                                <Button variant="outline" size="sm" className="mt-4 rounded-xl">Create One</Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'keys' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">LLM Provider Keys</h3>
                                    <div className="flex items-center space-x-2 mt-0.5">
                                        <p className="text-sm text-muted-foreground font-medium">Securely store your API keys to power your agents.</p>
                                        {planLimits && (
                                            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-muted/30">
                                                {apiKeys.length} / {planLimits.maxApiKeys} Keys
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {!keysLoading && (
                                    planLimits && apiKeys.length >= planLimits.maxApiKeys ? (
                                        <Button
                                            size="sm"
                                            className="rounded-xl font-bold bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                                            onClick={() => setActiveTab('billing')}
                                        >
                                            <Zap className="mr-2 h-4 w-4" />
                                            Upgrade
                                        </Button>
                                    ) : (
                                        <Button size="sm" className="rounded-xl font-bold" onClick={() => setIsKeyModalOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add New Key
                                        </Button>
                                    )
                                )}
                            </div>

                            {keysLoading ? (
                                <div className="flex h-64 items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="space-y-4 mt-6">
                                    {apiKeys.map((key) => (
                                        <div key={key.id} className="flex items-center justify-between p-4 rounded-xl md:rounded-2xl border bg-accent/30 group hover:border-primary/30 transition-all">
                                            <div className="flex items-center space-x-4">
                                                <div className="h-10 w-10 rounded-lg md:rounded-xl bg-background flex items-center justify-center border shadow-sm">
                                                    <Key className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold capitalize">{key.provider}</span>
                                                        {key.label && (
                                                            <>
                                                                <span className="text-xs text-muted-foreground tracking-tighter">—</span>
                                                                <span className="text-sm font-medium">{key.label}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center mt-1 space-x-2">
                                                        <code className="text-[10px] bg-background/50 px-2 py-0.5 rounded border font-mono">
                                                            {key.key_fingerprint}
                                                        </code>
                                                        {key.last_used_at ? (
                                                            <p className="text-[10px] text-muted-foreground font-medium">Last used: {new Date(key.last_used_at).toLocaleDateString()}</p>
                                                        ) : (
                                                            <p className="text-[10px] text-muted-foreground font-medium">Never used</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-xl text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                                                    onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                                                >
                                                    {showKey === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-xl text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                                                    onClick={() => handleDeleteKey(key.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    {apiKeys.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                                            <Key className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                                            <p className="text-sm text-muted-foreground font-medium">No API keys found.</p>
                                            <p className="text-xs text-muted-foreground mt-1">Add a key to start powering your agents.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-start space-x-3">
                                <Shield className="h-5 w-5 text-orange-500 mt-0.5" />
                                <div className="text-xs font-medium text-orange-700 leading-relaxed">
                                    <strong className="block mb-1">Security Warning</strong>
                                    We encrypt your keys at rest. However, remember to periodically rotate your keys and use restricted scopes where possible.
                                </div>
                            </div>
                            <AddKeyModal />
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Bell className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <h3 className="text-xl font-bold">Notification Preferences</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm font-medium">
                                Configure how you want to be notified about agent activities and community updates.
                            </p>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold">App Appearance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'light', label: 'Light', icon: Sun },
                                    { id: 'dark', label: 'Dark', icon: Moon },
                                    { id: 'system', label: 'System', icon: Laptop },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id as any)}
                                        className={cn(
                                            "flex flex-col items-center p-6 rounded-3xl border bg-accent/20 transition-all font-bold group",
                                            currentTheme === t.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/50"
                                        )}
                                    >
                                        <div className="h-12 w-12 rounded-2xl bg-background border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <t.icon className={cn("h-6 w-6", currentTheme === t.id ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                        <span className={currentTheme === t.id ? "text-primary" : "text-foreground"}>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <BillingSettings />
                    )}
                </div>
            </div >
        </div >
    )
}

