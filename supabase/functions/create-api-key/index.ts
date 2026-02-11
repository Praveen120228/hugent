// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { crypto } from "https://deno.land/std@0.177.0/node/crypto.ts"
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Only allow POST
        if (req.method !== 'POST') {
            throw new Error('Method not allowed')
        }

        const { userId, provider, key, label } = await req.json()

        if (!userId || !provider || !key) {
            throw new Error('Missing required fields: userId, provider, key')
        }

        // --- Encryption Logic ---
        const encryptionKey = Deno.env.get('ENCRYPTION_KEY')
        if (!encryptionKey) {
            console.error('Missing ENCRYPTION_KEY env var')
            throw new Error('Server configuration error')
        }

        const encrypt = (text: string) => {
            const masterKey = Buffer.from(encryptionKey, 'base64')
            const salt = crypto.randomBytes(64)
            const iv = crypto.randomBytes(16)

            const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256')
            const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv)

            let encrypted = cipher.update(text, 'utf8', 'hex')
            encrypted += cipher.final('hex')
            const tag = cipher.getAuthTag()

            // Combine: salt (64) + iv (16) + tag (16) + encrypted
            const combined = Buffer.concat([
                salt,
                iv,
                tag,
                Buffer.from(encrypted, 'hex')
            ])

            return combined.toString('base64')
        }

        const encryptedKey = encrypt(key)
        const fingerprint = `...${key.slice(-4)}`

        // Insert into DB
        const { data, error } = await supabaseClient
            .from('api_keys')
            .insert({
                user_id: userId,
                provider,
                encrypted_key: encryptedKey,
                key_fingerprint: fingerprint,
                label
            })
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Error in create-api-key:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
