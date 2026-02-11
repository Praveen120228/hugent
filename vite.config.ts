import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { AutonomousAgentEngine } from './src/lib/autonomous-agent/engine'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const supabase = createClient(
    env.VITE_SUPABASE_URL || '',
    env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key'
      ? env.SUPABASE_SERVICE_ROLE_KEY
      : env.VITE_SUPABASE_ANON_KEY || ''
  )

  const decryptApiKey = (encryptedData: string) => {
    const combined = Buffer.from(encryptedData, 'base64')
    const salt = combined.subarray(0, 64)
    const iv = combined.subarray(64, 64 + 16)
    const tag = combined.subarray(64 + 16, 64 + 16 + 16)
    const encrypted = combined.subarray(64 + 16 + 16)

    const masterKey = Buffer.from(env.ENCRYPTION_KEY || '', 'base64')
    const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256')

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/wake/')) {
              console.log('DEBUG: Received /api/wake request for URL:', req.url);
              const agentId = req.url.split('/').pop()
              if (!agentId) {
                console.error('DEBUG: Missing agent ID in URL');
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'Missing agent ID' }))
                return
              }

              let body = ''
              req.on('data', chunk => { body += chunk.toString() })
              req.on('end', async () => {
                try {
                  const payload = body ? JSON.parse(body) : {}
                  const intent = payload.intent

                  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key'
                    ? env.SUPABASE_SERVICE_ROLE_KEY
                    : env.VITE_SUPABASE_ANON_KEY || '';

                  const engine = new AutonomousAgentEngine(
                    env.VITE_SUPABASE_URL || '',
                    serviceKey,
                    env.ENCRYPTION_KEY
                  );
                  console.log(`Starting prioritized wake cycle for agent: ${agentId} with intent:`, intent);
                  const result = await engine.wakeAgent(agentId, true, intent);

                  if (result.status === 'error') {
                    res.writeHead(500, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: result.errorMessage || 'Internal engine error', result }))
                  } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify(result))
                  }
                } catch (e: any) {
                  console.error('Local wake cycle error:', e)
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: e.message }))
                }
              })
              return
            }

            if (req.url?.includes('list-models')) {
              const url = new URL(req.url, 'http://localhost')
              const agentId = url.searchParams.get('agentId')

              if (!agentId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Agent ID is required' }))
                return
              }

              try {
                const { data: agent, error: agentError } = await supabase
                  .from('agents')
                  .select('api_key_id')
                  .eq('id', agentId)
                  .single()

                if (agentError || !agent?.api_key_id) throw new Error('Agent or API Key not found')

                const { data: apiKeyRecord, error: keyError } = await supabase
                  .from('api_keys')
                  .select('*')
                  .eq('id', agent.api_key_id)
                  .single()

                if (keyError || !apiKeyRecord) throw new Error('API Key record not found')

                const apiKey = decryptApiKey(apiKeyRecord.encrypted_key)
                let models = []
                if (apiKeyRecord.provider === 'google' || apiKeyRecord.provider === 'gemini') {
                  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
                  const data = (await resp.json()) as any
                  if (data.error) throw new Error(data.error.message)
                  models = data.models?.filter((m: any) => m.name.includes('gemini')).map((m: any) => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName,
                    description: m.description
                  })) || []
                } else if (apiKeyRecord.provider === 'openai') {
                  const resp = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` }
                  })
                  const data = (await resp.json()) as any
                  if (data.error) throw new Error(data.error.message)
                  models = data.data?.filter((m: any) => m.id.includes('gpt')).map((m: any) => ({
                    id: m.id,
                    name: m.id,
                    description: 'OpenAI GPT Model'
                  })) || []
                } else if (apiKeyRecord.provider === 'anthropic') {
                  models = [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Powerful model for complex tasks' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and compact model' }
                  ]
                }
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ models }))
              } catch (error: any) {
                console.error('List Models Error:', error)
                res.statusCode = 500
                res.end(JSON.stringify({ error: error.message }))
              }
              return
            }

            if (req.url?.includes('create-api-key') || req.url?.endsWith('/functions/v1/create-api-key')) {
              if (req.method !== 'POST') {
                res.statusCode = 405
                res.end(JSON.stringify({ error: 'Method not allowed' }))
                return
              }

              let body = ''
              req.on('data', chunk => { body += chunk.toString() })
              req.on('end', async () => {
                try {
                  const { userId, provider, key, label } = JSON.parse(body)
                  if (!userId || !provider || !key) throw new Error('Missing required fields')

                  const masterKey = Buffer.from(env.ENCRYPTION_KEY || '', 'base64')
                  const salt = crypto.randomBytes(64)
                  const iv = crypto.randomBytes(16)
                  const derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256')
                  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv)
                  let encrypted = cipher.update(key, 'utf8', 'hex')
                  encrypted += cipher.final('hex')
                  const tag = cipher.getAuthTag()
                  const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')])
                  const encryptedKey = combined.toString('base64')

                  const authHeader = req.headers['authorization']
                  const reqSupabase = createClient(env.VITE_SUPABASE_URL || '', env.VITE_SUPABASE_ANON_KEY || '', {
                    global: { headers: { Authorization: authHeader || '' } }
                  })

                  const { data, error } = await reqSupabase
                    .from('api_keys')
                    .insert({ user_id: userId, provider, encrypted_key: encryptedKey, key_fingerprint: `...${key.slice(-4)}`, label })
                    .select().single()

                  if (error) throw error
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(data))
                } catch (error: any) {
                  res.statusCode = 500
                  res.end(JSON.stringify({ error: error.message }))
                }
              })
              return
            }
            next()
          })
        }
      }
    ],
  }
})
