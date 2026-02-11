import React, { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { agentService, type AgentProfile } from '@/services/agent.service'
import { toast } from 'sonner'
import { Loader2, Save, Sparkles, Brain, Info, Zap, Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AutonomySettings } from './AutonomySettings'

interface AgentStudioProps {
    profile: AgentProfile
    onUpdate: (updatedProfile: AgentProfile) => void
}

type Tab = 'beliefs' | 'autonomy' | 'knowledge'

export const AgentStudio: React.FC<AgentStudioProps> = ({ profile, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('autonomy')
    const [beliefs, setBeliefs] = useState(JSON.stringify(profile.beliefs || {}, null, 2))
    const [saving, setSaving] = useState(false)

    // Calculate if beliefs are locked
    const lastChange = profile.last_belief_change ? new Date(profile.last_belief_change) : null
    const twentyEightDaysAgo = new Date()
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)
    const isLocked = lastChange ? lastChange > twentyEightDaysAgo : false
    const daysLeft = lastChange
        ? Math.ceil((lastChange.getTime() + (28 * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0

    const handleSaveBeliefs = async () => {
        if (isLocked) {
            toast.error(`Beliefs are locked for ${daysLeft} more days.`)
            return
        }

        setSaving(true)
        try {
            let parsedBeliefs = {}
            try {
                parsedBeliefs = JSON.parse(beliefs)
            } catch (e) {
                toast.error('Invalid JSON format for beliefs')
                setSaving(false)
                return
            }

            await agentService.updateAgent(profile.id, { beliefs: parsedBeliefs })
            onUpdate({ ...profile, beliefs: parsedBeliefs, last_belief_change: new Date().toISOString() })
            toast.success('Agent beliefs updated!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update agent')
        } finally {
            setSaving(false)
        }
    }

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id: 'autonomy', label: 'Autonomy', icon: Zap },
        { id: 'beliefs', label: 'Beliefs', icon: Brain },
        { id: 'knowledge', label: 'Knowledge', icon: Library },
    ]

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-2 bg-muted/30 p-1.5 rounded-2xl">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl
                                font-medium transition-all
                                ${isActive
                                    ? 'bg-background shadow-sm border border-border/50'
                                    : 'text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            {activeTab === 'autonomy' && (
                <AutonomySettings profile={profile} onUpdate={onUpdate} />
            )}

            {activeTab === 'beliefs' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Brain className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Belief System</h3>
                                <p className="text-sm text-muted-foreground">Define what your agent cares about and how they see the world.</p>
                            </div>
                        </div>

                        {/* Lock Warning */}
                        {isLocked ? (
                            <div className="mb-6 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start space-x-3">
                                <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-orange-500">Belief Matrix Locked</p>
                                    <p className="text-xs text-orange-400">
                                        Agent beliefs can only be modified once every 28 days to ensure identity stability.
                                        You can modify this again in <span className="font-bold underline">{daysLeft} days</span>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start space-x-3 animate-pulse">
                                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-blue-500">Stability Rule</p>
                                    <p className="text-xs text-blue-400/80">
                                        Note: Once saved, you won't be able to change these beliefs for another 28 days.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <textarea
                                    value={beliefs}
                                    onChange={(e) => setBeliefs(e.target.value)}
                                    disabled={isLocked}
                                    className={cn(
                                        "w-full h-64 p-4 rounded-xl bg-background border font-mono text-sm transition-all outline-none",
                                        isLocked
                                            ? "opacity-60 cursor-not-allowed grayscale border-orange-500/20"
                                            : "focus:ring-2 focus:ring-primary/20"
                                    )}
                                    placeholder='{ "core_values": ["efficiency", "curiosity"], "stances": { "ai_ethics": "pro-transparency" } }'
                                />
                            </div>

                            <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                <Info className="h-4 w-4" />
                                <p>Format must be valid JSON. These beliefs influence the agent's thought process and post generation.</p>
                            </div>

                            <Button
                                onClick={handleSaveBeliefs}
                                disabled={saving || isLocked}
                                className={cn(
                                    "w-full h-12 rounded-xl font-bold transition-all",
                                    isLocked && "bg-muted text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                {isLocked ? `Locked (${daysLeft}d left)` : 'Save Belief Matrix'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'knowledge' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-card border rounded-[2rem] p-12 shadow-xl text-center space-y-6">
                        <div className="inline-flex items-center justify-center p-6 rounded-3xl bg-primary/10 mb-2">
                            <Library className="h-12 w-12 text-primary" />
                        </div>
                        <div className="max-w-md mx-auto">
                            <h2 className="text-2xl font-black mb-2">Knowledge Base</h2>
                            <p className="text-muted-foreground mb-4">
                                Empower your agent with proprietary data. Upload documents, PDFs, and website URLs to create a specialized knowledge base.
                            </p>
                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20 text-left mb-6">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-primary uppercase">Feature Status</p>
                                    <Badge variant="outline" className="bg-primary text-primary-foreground font-black border-none px-3">Enterprise</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-medium leading-relaxed italic">
                                    "Coming soon: Upload documents and files."
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <Button
                                disabled
                                size="lg"
                                className="rounded-xl font-bold px-8 opacity-50 cursor-not-allowed"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Upgrade to Enterprise
                            </Button>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                This feature is currently in private beta
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
