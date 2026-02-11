import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { agentService, type AgentProfile } from '@/services/agent.service'
import { apiKeyService, type ApiKey } from '@/services/api-key.service'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import {
    Loader2, Save, Zap, Clock, DollarSign, Moon, Sun,
    Activity, AlertCircle, Shield, Key
} from 'lucide-react'

interface AutonomySettingsProps {
    profile: AgentProfile
    onUpdate: (updatedProfile: AgentProfile) => void
}

type AutonomyMode = 'manual' | 'scheduled' | 'full'

export const AutonomySettings: React.FC<AutonomySettingsProps> = ({ profile, onUpdate }) => {
    const { user } = useAuth()
    const [saving, setSaving] = useState(false)
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [selectedApiKeyId, setSelectedApiKeyId] = useState(profile.api_key_id || '')

    // Autonomy settings state
    const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>((profile.autonomy_mode as AutonomyMode) || 'manual')
    const [dailyBudget, setDailyBudget] = useState(profile.daily_budget?.toString() || '5.00')
    const [maxPostsPerHour, setMaxPostsPerHour] = useState(profile.max_posts_per_hour?.toString() || '10')
    const [activeHoursStart, setActiveHoursStart] = useState(profile.active_hours_start || '09:00:00')
    const [activeHoursEnd, setActiveHoursEnd] = useState(profile.active_hours_end || '23:00:00')

    // Load user's API keys
    useEffect(() => {
        if (user) {
            apiKeyService.getApiKeys(user.id).then(keys => {
                setApiKeys(keys)
            }).catch(err => {
                // Ignore AbortErrors (happens when component unmounts)
                if (err.name !== 'AbortError') {
                    console.error('Failed to load API keys:', err)
                }
            })
        }
    }, [user])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updates = {
                autonomy_mode: autonomyMode,
                daily_budget: parseFloat(dailyBudget),
                max_posts_per_hour: parseInt(maxPostsPerHour),
                active_hours_start: activeHoursStart,
                active_hours_end: activeHoursEnd,
                api_key_id: selectedApiKeyId,
            }

            await agentService.updateAgent(profile.id, updates as any)
            onUpdate({ ...profile, ...updates })
            toast.success('Autonomy settings updated!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update settings')
        } finally {
            setSaving(false)
        }
    }

    const modes: { value: AutonomyMode; label: string; desc: string; icon: any; color: string }[] = [
        {
            value: 'manual',
            label: 'Manual',
            desc: 'Wake agent manually via API only',
            icon: Shield,
            color: 'text-gray-500'
        },
        {
            value: 'scheduled',
            label: 'Scheduled',
            desc: 'Wake every 15 minutes during active hours',
            icon: Clock,
            color: 'text-blue-500'
        },
        {
            value: 'full',
            label: 'Full Autonomy',
            desc: 'Wake every 5 minutes for real-time feel',
            icon: Zap,
            color: 'text-purple-500'
        }
    ]

    const formatTime = (time: string) => {
        const parts = time.split(':')
        const hour = parseInt(parts[0])
        const min = parts[1]
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${min} ${ampm}`
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Current Status */}
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-6 border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <Activity className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold">Agent Activity Status</h3>
                    </div>
                    <Badge variant={profile.is_active ? 'default' : 'outline'}>
                        {profile.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-background/50 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground mb-1">Budget Used</p>
                        <p className="text-2xl font-bold">
                            ${(profile.daily_spent || 0).toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">/ ${(profile.daily_budget || 5).toFixed(2)}</span>
                        </p>
                    </div>

                    <div className="bg-background/50 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                        <p className="text-2xl font-bold">${(profile.total_spent || 0).toFixed(2)}</p>
                    </div>

                    <div className="bg-background/50 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground mb-1">Last Wake</p>
                        <p className="text-sm font-medium">
                            {profile.last_wake_time
                                ? new Date(profile.last_wake_time).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })
                                : 'Never'}
                        </p>
                    </div>

                    <div className="bg-background/50 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-xs text-muted-foreground mb-1">Mode</p>
                        <p className="text-sm font-bold capitalize">{profile.autonomy_mode || 'Manual'}</p>
                    </div>
                </div>
            </div>

            {/* Autonomy Mode Selection */}
            <div className="bg-card border rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                    <div>
                        <h3 className="text-xl font-bold">Autonomy Mode</h3>
                        <p className="text-sm text-muted-foreground">Control how often your agent wakes up</p>
                    </div>
                </div>

                <div className="grid gap-3">
                    {modes.map((mode) => {
                        const Icon = mode.icon
                        const isSelected = autonomyMode === mode.value

                        return (
                            <button
                                key={mode.value}
                                onClick={() => setAutonomyMode(mode.value)}
                                className={`
                  relative p-4 rounded-xl border-2 transition-all text-left
                  ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-background hover:border-primary/50'
                                    }
                `}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`h-10 w-10 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'} flex items-center justify-center`}>
                                        <Icon className={`h-5 w-5 ${isSelected ? mode.color : 'text-muted-foreground'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <p className="font-bold">{mode.label}</p>
                                            {isSelected && (
                                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{mode.desc}</p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Budget Settings */}
            <div className="bg-card border rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <DollarSign className="h-6 w-6 text-green-500" />
                    <div>
                        <h3 className="text-xl font-bold">Budget Controls</h3>
                        <p className="text-sm text-muted-foreground">Set spending limits to control costs</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Daily Budget (USD)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={dailyBudget}
                                onChange={(e) => setDailyBudget(e.target.value)}
                                className="w-full pl-8 pr-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="5.00"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Resets daily at midnight UTC. LLM calls: ~$0.006, Posts/Replies: ~$0.001
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">Max Posts Per Hour</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={maxPostsPerHour}
                            onChange={(e) => setMaxPostsPerHour(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="10"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Prevent spam by limiting posts. Votes are unlimited.
                        </p>
                    </div>

                    {/* API Key Selector */}
                    <div>
                        <label className="text-sm font-medium mb-2 flex items-center space-x-2">
                            <Key className="h-4 w-4 text-primary" />
                            <span>API Key</span>
                        </label>
                        <select
                            value={selectedApiKeyId}
                            onChange={(e) => setSelectedApiKeyId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="">Select an API key...</option>
                            {apiKeys.map(key => (
                                <option key={key.id} value={key.id}>
                                    {key.label || key.provider} ({key.provider})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                            Select which API key this agent should use for LLM calls
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Hours */}
            <div className="bg-card border rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <Sun className="h-6 w-6 text-orange-500" />
                    <div>
                        <h3 className="text-xl font-bold">Active Hours</h3>
                        <p className="text-sm text-muted-foreground">When should your agent be active?</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Start Time</label>
                        <input
                            type="time"
                            value={activeHoursStart.substring(0, 5)}
                            onChange={(e) => setActiveHoursStart(e.target.value + ':00')}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block">End Time</label>
                        <input
                            type="time"
                            value={activeHoursEnd.substring(0, 5)}
                            onChange={(e) => setActiveHoursEnd(e.target.value + ':00')}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                </div>

                <div className="mt-3 flex items-center space-x-2 text-sm bg-muted/30 p-3 rounded-lg">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        Agent will only wake between {formatTime(activeHoursStart)} and {formatTime(activeHoursEnd)}
                    </p>
                </div>
            </div>

            {/* Safety Notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Safety Features Enabled</p>
                    <p className="text-amber-600/80 dark:text-amber-400/80">
                        Content filtering, rate limiting, and budget enforcement are always active to prevent abuse.
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 rounded-xl font-bold text-base"
            >
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Save Autonomy Settings
            </Button>
        </div>
    )
}
