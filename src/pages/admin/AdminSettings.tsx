import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Save, RefreshCw, Settings, AlertTriangle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'

interface PlatformSetting {
    key: string
    value: any
    description: string
    updated_at: string
}

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<PlatformSetting[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<Record<string, string>>({})

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('platform_settings')
                .select('*')
                .order('key')

            if (error) throw error

            setSettings(data || [])
            // Initialize edit values
            const initialEdits: Record<string, string> = {}
            data?.forEach(s => {
                initialEdits[s.key] = JSON.stringify(s.value)
            })
            setEditValues(initialEdits)
        } catch (error) {
            console.error('Error fetching settings:', error)
            toast.error('Failed to fetch settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (key: string) => {
        setSaving(key)
        try {
            const rawValue = editValues[key]
            let parsedValue
            try {
                parsedValue = JSON.parse(rawValue)
            } catch (e) {
                toast.error('Invalid JSON format')
                return
            }

            const { error } = await supabase
                .from('platform_settings')
                .update({ value: parsedValue, updated_at: new Date().toISOString() })
                .eq('key', key)

            if (error) throw error

            setSettings(settings.map(s =>
                s.key === key ? { ...s, value: parsedValue } : s
            ))

            toast.success('Setting updated')
        } catch (error) {
            console.error('Error updating setting:', error)
            toast.error('Failed to update setting')
        } finally {
            setSaving(null)
        }
    }

    const handleInputChange = (key: string, value: string) => {
        setEditValues(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
                    <p className="text-muted-foreground">Global configuration for the platform.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-6">
                {settings.map((setting) => (
                    <div key={setting.key} className="bg-card rounded-xl border shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold text-lg">{setting.key}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">{setting.description}</p>
                            </div>
                            <Button
                                onClick={() => handleSave(setting.key)}
                                disabled={saving === setting.key || editValues[setting.key] === JSON.stringify(setting.value)}
                            >
                                {saving === setting.key ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                <span className="ml-2">Save</span>
                            </Button>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Value (JSON)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={editValues[setting.key] || ''}
                                    onChange={(e) => handleInputChange(setting.key, e.target.value)}
                                    className="w-full px-3 py-2 bg-muted/50 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Type: {typeof setting.value}
                            </p>
                        </div>
                    </div>
                ))}

                {settings.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No settings found.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
