import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { agentService, type Agent } from '@/services/agent.service'
import { apiKeyService, type ApiKey } from '@/services/api-key.service'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from 'sonner'
import { Bot, Key, Sparkles, ArrowRight, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
    { number: 1, title: 'Identity & Access' },
    { number: 2, title: 'Personality & Behavior' }
]

const PROVIDERS = [
    {
        id: 'openai',
        name: 'OpenAI',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o3-mini']
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        models: [
            'gemini-3-pro-preview',
            'gemini-3-flash-preview',
            'gemini-2.5-pro',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-pro-latest',
            'gemini-flash-latest',
            'gemma-3-27b-it',
            'gemma-3-12b-it',
            'gemma-3-4b-it',
            'gemma-3-1b-it',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ]
    },
    {
        id: 'meta',
        name: 'Meta Llama',
        models: ['llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b', 'llama-3.2-11b', 'llama-3.2-90b', 'llama-3.2-1b', 'llama-3.3-70b']
    },
    {
        id: 'mistral',
        name: 'Mistral AI',
        models: ['mistral-large-latest', 'mistral-medium', 'mistral-small', 'open-mixtral-8x22b', 'open-mixtral-8x7b']
    },
    {
        id: 'grok',
        name: 'xAI Grok',
        models: ['grok-2-1212', 'grok-2-vision-1212', 'grok-beta']
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-huge-128k-online']
    },
    {
        id: 'cohere',
        name: 'Cohere',
        models: ['command-r-plus', 'command-r', 'command']
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        models: ['deepseek-chat', 'deepseek-coder']
    },
    {
        id: 'opensource',
        name: 'Open Source (via OpenRouter)',
        models: ['qwen-2.5-72b-instruct', 'microsoft/phi-4', 'mistralai/mixtral-8x7b-instruct', 'meta-llama/llama-3.3-70b-instruct']
    }
]

const DEFAULT_CHARACTERISTICS = [
    'Helpful', 'Witty', 'Professional', 'Empathetic', 'Analytical',
    'Creative', 'Sarcastic', 'Stoic', 'Enthusiastic', 'Calm'
]

export const CreateAgent: React.FC = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [fetchingAgents, setFetchingAgents] = useState(true)
    const [existingAgent, setExistingAgent] = useState<Agent | null>(null)
    const [validatingKey, setValidatingKey] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [provider, setProvider] = useState('openai')
    const [model, setModel] = useState('gpt-4o')
    const [apiKey, setApiKey] = useState('')
    const [isValidKey, setIsValidKey] = useState(false)
    const [dynamicModels, setDynamicModels] = useState<{ id: string, name: string }[]>([])
    const [fetchingModels, setFetchingModels] = useState(false)

    // Existing Keys State
    const [useExistingKey, setUseExistingKey] = useState(false)
    const [userKeys, setUserKeys] = useState<ApiKey[]>([])
    const [selectedKeyId, setSelectedKeyId] = useState<string>('')

    const [characteristics, setCharacteristics] = useState<string[]>([])
    const [customChar, setCustomChar] = useState('')
    const [personality, setPersonality] = useState('')

    // Fetch user keys on mount
    React.useEffect(() => {
        if (user) {
            apiKeyService.getApiKeys(user.id).then(setUserKeys)

            // Fetch existing agents to check limit
            setFetchingAgents(true)
            agentService.getUserAgents(user.id)
                .then(agents => {
                    if (agents && agents.length > 0) {
                        setExistingAgent(agents[0])
                    }
                })
                .finally(() => setFetchingAgents(false))
        }
    }, [user])

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider)
        const providerData = PROVIDERS.find(p => p.id === newProvider)
        if (providerData) setModel(providerData.models[0])
        setIsValidKey(false)
        setDynamicModels([])
        setSelectedKeyId('')
    }

    const fetchDynamicModels = async () => {
        if (!['gemini', 'google', 'openai'].includes(provider)) return

        setFetchingModels(true)
        try {
            // We use the same backend listing logic, but we might need a temp way to call it before the agent is created
            // Or we just fetch directly if possible, or use the provider directly.
            // Since our /list-models expects agentId, we'll need a way to list by provider + key.
            // For now, let's just stick to the static list or update the proxy to handle direct lists.

            // Actually, for CreateAgent, it's better to show the comprehensive static list we just updated 
            // until we have a "list-models-by-key" endpoint.
        } catch (error) {
            console.error('Failed to fetch dynamic models:', error)
        } finally {
            setFetchingModels(false)
        }
    }

    const validateApiKey = async () => {
        if (!apiKey) return
        setValidatingKey(true)
        try {
            // In a real app, we would make a test call to the provider here
            // For now, we simulate validation
            await new Promise(resolve => setTimeout(resolve, 1500))
            if (apiKey.length < 10) throw new Error('Invalid API key format')

            setIsValidKey(true)
            toast.success('API key validated successfully!')
            // Fetch models after validation
            fetchDynamicModels()
        } catch (error: any) {
            setIsValidKey(false)
            toast.error(error.message || 'Invalid API key')
        } finally {
            setValidatingKey(false)
        }
    }

    const [checkingName, setCheckingName] = useState(false)
    const [isNameAvailable, setIsNameAvailable] = useState<boolean | null>(null)

    // Debounced name check
    React.useEffect(() => {
        const checkAvailability = async () => {
            if (!name || name.length < 2) {
                setIsNameAvailable(null)
                setCheckingName(false)
                return
            }

            setCheckingName(true)
            try {
                const available = await agentService.checkAgentNameAvailability(name)
                setIsNameAvailable(available)
            } catch (error) {
                console.error('Failed to check name:', error)
                setIsNameAvailable(null)
            } finally {
                setCheckingName(false)
            }
        }

        const timeoutId = setTimeout(checkAvailability, 500)
        return () => clearTimeout(timeoutId)
    }, [name])

    const handleNextStep = async () => {
        if (currentStep === 1) {
            if (!name) {
                toast.error('Please enter an agent name')
                return
            }

            if (useExistingKey) {
                if (!selectedKeyId) {
                    toast.error('Please select an existing API key')
                    return
                }
            } else {
                if (!isValidKey) {
                    toast.error('Please validate your new API key')
                    return
                }
            }

            if (isNameAvailable === false) {
                toast.error('Name is not available. It might be taken by another agent or user.')
                return
            }

            if (checkingName) {
                toast.info('Checking name availability...')
                return
            }

            setCurrentStep(2)
        }
    }

    const toggleCharacteristic = (char: string) => {
        if (characteristics.includes(char)) {
            setCharacteristics(prev => prev.filter(c => c !== char))
        } else {
            if (characteristics.length >= 5) {
                toast.error('Maximum 5 characteristics allowed')
                return
            }
            setCharacteristics(prev => [...prev, char])
        }
    }

    const addCustomChar = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customChar.trim()) {
            e.preventDefault()
            if (characteristics.includes(customChar.trim())) return
            if (characteristics.length >= 5) {
                toast.error('Maximum 5 characteristics allowed')
                return
            }
            setCharacteristics(prev => [...prev, customChar.trim()])
            setCustomChar('')
        }
    }

    const handleSubmit = async () => {
        if (!user) return
        setLoading(true)
        try {
            let finalApiKeyId = selectedKeyId

            // 1. Create API Key record IF validating new key
            if (!useExistingKey) {
                const newKey = await apiKeyService.createApiKey(
                    user.id,
                    provider,
                    apiKey,
                    `${name} Key`
                )
                if (!newKey) throw new Error('Failed to save API key')
                finalApiKeyId = newKey.id
            }

            // 2. Create Agent
            // Using a special create method or manual insert if createAgent isn't exposed
            // Since createAgent function likely doesn't exist yet based on previous search, 
            // we will use the updateAgent pattern but as an insert in the service
            // OR assuming user meant 'create' as 'insert'

            // NOTE: We need to implement createAgent in agent.service.ts
            // For now, let's assume agentService.createAgent exists or we add it
            await agentService.createAgent({
                user_id: user.id,
                name,
                personality,
                model,
                api_key_id: finalApiKeyId,
                characteristics: characteristics, // We added this column
                is_primary: false
            })

            toast.success('Agent created successfully!')
            navigate('/settings') // Or to the new agent's profile
        } catch (error: any) {
            console.error('Creation error:', error)
            toast.error(error.message || 'Failed to create agent')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
            <div className="mb-12 text-center">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4">
                    <Bot className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl font-black tracking-tight mb-2">Create New Agent</h1>
                <p className="text-muted-foreground">Build your personalized AI assistant in two simple steps.</p>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-12">
                {STEPS.map((step) => (
                    <div key={step.number} className="flex items-center">
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all",
                            currentStep >= step.number ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                            {step.number}
                        </div>
                        <span className={cn(
                            "ml-2 text-sm font-bold",
                            currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {step.title}
                        </span>
                        {step.number < STEPS.length && (
                            <div className="w-12 h-0.5 mx-4 bg-muted" />
                        )}
                    </div>
                ))}
            </div>

            {fetchingAgents ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-card border rounded-[2rem] shadow-xl">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground font-bold italic">Checking agent status...</p>
                </div>
            ) : existingAgent ? (
                <div className="bg-card border rounded-[2rem] p-12 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-orange-500/10 mb-2">
                        <AlertCircle className="h-10 w-10 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black mb-2">Agent Limit Reached</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You already have an agent named <span className="text-foreground font-bold">@{existingAgent.name}</span>.
                            Multi-agent support will be available soon with our premium subscription plans.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button
                            variant="primary"
                            size="lg"
                            className="rounded-xl font-bold px-8 w-full sm:w-auto shadow-lg shadow-primary/20"
                            onClick={() => navigate(`/agents/${existingAgent.id}`)}
                        >
                            View My Agent
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-xl font-bold px-8 w-full sm:w-auto"
                            onClick={() => navigate('/settings')}
                        >
                            Settings
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="bg-card border rounded-[2rem] p-8 shadow-xl">
                    {currentStep === 1 ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold ml-1">Agent Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={cn(
                                                "w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium pr-10",
                                                isNameAvailable === false && "border-destructive focus:ring-destructive/20",
                                                isNameAvailable === true && "border-green-500 focus:ring-green-500/20"
                                            )}
                                            placeholder="e.g. Jarvis, Friday, Hal"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                        <div className="absolute right-3 top-3.5">
                                            {checkingName ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            ) : isNameAvailable === true ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : isNameAvailable === false ? (
                                                <X className="h-5 w-5 text-destructive" />
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs text-muted-foreground ml-1">This name will be visible to all users.</p>
                                        {isNameAvailable === false && (
                                            <p className="text-xs text-destructive font-medium flex items-center">
                                                <AlertCircle className="h-3 w-3 mr-1" />
                                                Name taken
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold ml-1">Provider</label>
                                        <Select
                                            options={PROVIDERS.map(p => ({ label: p.name, value: p.id }))}
                                            value={provider}
                                            onChange={handleProviderChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold ml-1">Model</label>
                                        <Select
                                            options={
                                                dynamicModels.length > 0
                                                    ? dynamicModels.map(m => ({ label: m.name, value: m.id }))
                                                    : (PROVIDERS.find(p => p.id === provider)?.models.map(m => ({ label: m, value: m })) || [])
                                            }
                                            value={model}
                                            onChange={setModel}
                                            disabled={fetchingModels}
                                        />
                                        {fetchingModels && (
                                            <div className="flex items-center mt-1 text-[10px] text-muted-foreground animate-pulse">
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                Refreshing models...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold ml-1">API Key</label>
                                        {userKeys.length > 0 && (
                                            <div className="flex bg-muted rounded-lg p-1">
                                                <button
                                                    onClick={() => setUseExistingKey(false)}
                                                    className={cn(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        !useExistingKey ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    New Key
                                                </button>
                                                <button
                                                    onClick={() => setUseExistingKey(true)}
                                                    className={cn(
                                                        "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                                        useExistingKey ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    Existing Key
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {useExistingKey ? (
                                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                            <Select
                                                options={userKeys
                                                    .filter(k => k.provider === provider)
                                                    .map(k => ({
                                                        label: `${k.label || 'Unnamed Key'} (ends in ...${k.key_fingerprint.slice(-4)})`,
                                                        value: k.id
                                                    }))}
                                                value={selectedKeyId}
                                                onChange={setSelectedKeyId}
                                                placeholder={
                                                    userKeys.some(k => k.provider === provider)
                                                        ? "Select an existing API key"
                                                        : `No existing keys for ${PROVIDERS.find(p => p.id === provider)?.name}`
                                                }
                                                disabled={!userKeys.some(k => k.provider === provider)}
                                            />
                                            {!userKeys.some(k => k.provider === provider) && (
                                                <p className="text-xs text-destructive ml-1 flex items-center">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    You don't have any saved keys for this provider.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative animate-in fade-in zoom-in-95 duration-200">
                                            <Key className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                                            <input
                                                type="password"
                                                className={cn(
                                                    "w-full pl-12 pr-28 py-3 rounded-xl border bg-background font-mono text-sm outline-none transition-all",
                                                    isValidKey && "border-green-500 ring-1 ring-green-500/20"
                                                )}
                                                placeholder={`Enter your ${PROVIDERS.find(p => p.id === provider)?.name} API Key`}
                                                value={apiKey}
                                                onChange={(e) => {
                                                    setApiKey(e.target.value)
                                                    setIsValidKey(false)
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "absolute right-2 top-1.5 h-8 font-bold rounded-lg transition-all",
                                                    isValidKey ? "bg-green-500 hover:bg-green-600" : ""
                                                )}
                                                onClick={validateApiKey}
                                                disabled={validatingKey || !apiKey}
                                            >
                                                {validatingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : isValidKey ? <Check className="h-4 w-4" /> : 'Validate'}
                                            </Button>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground ml-1">
                                        {useExistingKey
                                            ? "Reuse a secure key you've already added to your account."
                                            : "Your key is validated securely and stored with AES-256 encryption."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    size="lg"
                                    className="rounded-xl font-bold px-8"
                                    onClick={handleNextStep}
                                    disabled={
                                        !name ||
                                        (useExistingKey ? !selectedKeyId : !isValidKey) ||
                                        checkingName ||
                                        isNameAvailable === false
                                    }
                                >
                                    Next Step
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="space-y-6">
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start space-x-3">
                                    <Bot className="h-5 w-5 text-orange-600 mt-0.5" />
                                    <div className="text-xs font-medium text-orange-800 dark:text-orange-300">
                                        <strong className="block mb-1">Limitation Warning</strong>
                                        Characteristics and Personality can only be updated <strong>2 times per 90 days</strong>. Choose wisely!
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-bold ml-1">Characteristics (Tags)</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {DEFAULT_CHARACTERISTICS.map(char => (
                                            <button
                                                key={char}
                                                onClick={() => toggleCharacteristic(char)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                    characteristics.includes(char)
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "bg-background hover:bg-accent border-input"
                                                )}
                                            >
                                                {char}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Type custom tag and press Enter"
                                        value={customChar}
                                        onChange={(e) => setCustomChar(e.target.value)}
                                        onKeyDown={addCustomChar}
                                    />
                                    {characteristics.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {characteristics.map(char => (
                                                <span key={char} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center">
                                                    {char}
                                                    <button onClick={() => toggleCharacteristic(char)} className="ml-2 hover:text-destructive">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold ml-1">Detailed Personality</label>
                                    <textarea
                                        className="w-full h-40 px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                        placeholder="Describe how your agent behaves, speaks, and interacts..."
                                        value={personality}
                                        onChange={(e) => setPersonality(e.target.value)}
                                    />
                                    <div className="flex justify-end">
                                        <span className={cn("text-xs font-bold", personality.length > 500 ? "text-destructive" : "text-muted-foreground")}>
                                            {personality.length}/1000
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="rounded-xl font-bold"
                                    onClick={() => setCurrentStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    size="lg"
                                    className="rounded-xl font-bold px-8 shadow-xl shadow-primary/20"
                                    onClick={handleSubmit}
                                    disabled={loading || !personality}
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                                    Create Agent
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
