"use strict";
// @ts-nocheck
/// <reference lib="deno.window" />
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_2_38_4_1 = require("https://esm.sh/@supabase/supabase-js@2.38.4");
var crypto = require("node:crypto");
var node_buffer_1 = require("node:buffer");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, url, agentId, _a, agent, agentError, _b, apiKeyRecord, keyError, decryptionKey_1, decrypt, decryptedKey, models, resp, data, resp, data, error_1;
    var _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                // Handle CORS
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _g.label = 1;
            case 1:
                _g.trys.push([1, 11, , 12]);
                supabaseClient = (0, supabase_js_2_38_4_1.createClient)((_c = Deno.env.get('SUPABASE_URL')) !== null && _c !== void 0 ? _c : '', (_d = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _d !== void 0 ? _d : '');
                url = new URL(req.url);
                agentId = url.searchParams.get('agentId');
                if (!agentId) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Agent ID is required' }), {
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 400,
                        })];
                }
                return [4 /*yield*/, supabaseClient
                        .from('agents')
                        .select('api_key_id')
                        .eq('id', agentId)
                        .single()];
            case 2:
                _a = _g.sent(), agent = _a.data, agentError = _a.error;
                if (agentError || !(agent === null || agent === void 0 ? void 0 : agent.api_key_id))
                    throw new Error('Agent or API Key not found');
                return [4 /*yield*/, supabaseClient
                        .from('api_keys')
                        .select('*')
                        .eq('id', agent.api_key_id)
                        .single()];
            case 3:
                _b = _g.sent(), apiKeyRecord = _b.data, keyError = _b.error;
                if (keyError || !apiKeyRecord)
                    throw new Error('API Key record not found');
                decryptionKey_1 = Deno.env.get('ENCRYPTION_KEY');
                if (!decryptionKey_1)
                    throw new Error('Server encryption key missing');
                decrypt = function (encryptedData) {
                    var combined = node_buffer_1.Buffer.from(encryptedData, 'base64');
                    var salt = combined.subarray(0, 64);
                    var iv = combined.subarray(64, 64 + 16);
                    var tag = combined.subarray(64 + 16, 64 + 16 + 16);
                    var encrypted = combined.subarray(64 + 16 + 16);
                    var masterKey = node_buffer_1.Buffer.from(decryptionKey_1, 'base64');
                    var derivedKey = crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
                    var decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
                    decipher.setAuthTag(tag);
                    var decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
                    decrypted += decipher.final('utf8');
                    return decrypted;
                };
                decryptedKey = void 0;
                try {
                    decryptedKey = decrypt(apiKeyRecord.encrypted_key);
                }
                catch (e) {
                    console.error('Decryption failed:', e);
                    throw new Error('Failed to decrypt API key');
                }
                models = [];
                if (!(apiKeyRecord.provider === 'google' || apiKeyRecord.provider === 'gemini')) return [3 /*break*/, 6];
                return [4 /*yield*/, fetch("https://generativelanguage.googleapis.com/v1beta/models?key=".concat(decryptedKey))];
            case 4:
                resp = _g.sent();
                return [4 /*yield*/, resp.json()];
            case 5:
                data = (_g.sent());
                if (data.error)
                    throw new Error(data.error.message);
                // Filter and map Gemini models
                models = ((_e = data.models) === null || _e === void 0 ? void 0 : _e.filter(function (m) { return m.name.includes('gemini'); }).map(function (m) { return ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName,
                    description: m.description
                }); })) || [];
                return [3 /*break*/, 10];
            case 6:
                if (!(apiKeyRecord.provider === 'openai')) return [3 /*break*/, 9];
                return [4 /*yield*/, fetch('https://api.openai.com/v1/models', {
                        headers: { Authorization: "Bearer ".concat(decryptedKey) }
                    })];
            case 7:
                resp = _g.sent();
                return [4 /*yield*/, resp.json()];
            case 8:
                data = (_g.sent());
                if (data.error)
                    throw new Error(data.error.message);
                // Filter and map GPT models
                models = ((_f = data.data) === null || _f === void 0 ? void 0 : _f.filter(function (m) { return m.id.includes('gpt'); }).map(function (m) { return ({
                    id: m.id,
                    name: m.id,
                    description: 'OpenAI GPT Model'
                }); })) || [];
                return [3 /*break*/, 10];
            case 9:
                if (apiKeyRecord.provider === 'anthropic') {
                    // Anthropic doesn't have a public list models endpoint yet, return hardcoded list
                    models = [
                        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most intelligent model' },
                        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Powerful model for complex tasks' },
                        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast and compact model' }
                    ];
                }
                _g.label = 10;
            case 10: return [2 /*return*/, new Response(JSON.stringify({ models: models }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                })];
            case 11:
                error_1 = _g.sent();
                return [2 /*return*/, new Response(JSON.stringify({ error: error_1.message }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 500,
                    })];
            case 12: return [2 /*return*/];
        }
    });
}); });
