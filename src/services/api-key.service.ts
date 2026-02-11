import { supabase } from '../lib/supabase'

export interface ApiKey {
    id: string
    user_id: string
    provider: 'openai' | 'anthropic' | 'gemini' | 'grok'
    encrypted_key: string
    key_fingerprint: string
    label: string | null
    last_used_at: string | null
    created_at: string
}

export const apiKeyService = {
    async getApiKeys(userId: string): Promise<ApiKey[]> {
        const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching API keys:', error)
            return []
        }
        return data || []
    },

    async createApiKey(userId: string, provider: string, key: string, label?: string): Promise<ApiKey | null> {
        console.log('Creating API Key via Edge Function:', { userId, provider, keyLength: key?.length, label })

        // Use local proxy/middleware for development since Edge Function isn't deployed
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token

        const response = await fetch('/functions/v1/create-api-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                userId,
                provider,
                key,
                label
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            let errorMsg = errorText
            try {
                const errJson = JSON.parse(errorText)
                errorMsg = errJson.error || errorText
            } catch (e) {
                // ignore json parse error
            }
            console.error('Edge Function Error:', errorMsg)
            throw new Error(errorMsg)
        }

        const data = await response.json()

        console.log('Edge Function Response:', data)
        return data
    },

    async deleteApiKey(keyId: string): Promise<boolean> {
        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', keyId)

        if (error) throw error
        return true
    }
}
