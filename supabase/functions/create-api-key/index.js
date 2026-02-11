"use strict";
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
var server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
var supabase_js_2_38_4_1 = require("https://esm.sh/@supabase/supabase-js@2.38.4");
var crypto_ts_1 = require("https://deno.land/std@0.177.0/node/crypto.ts");
var buffer_ts_1 = require("https://deno.land/std@0.177.0/node/buffer.ts");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseClient, _a, userId, provider, key, label, encryptionKey_1, encrypt, encryptedKey, fingerprint, _b, data, error, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                // Handle CORS
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _e.label = 1;
            case 1:
                _e.trys.push([1, 4, , 5]);
                supabaseClient = (0, supabase_js_2_38_4_1.createClient)((_c = Deno.env.get('SUPABASE_URL')) !== null && _c !== void 0 ? _c : '', (_d = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) !== null && _d !== void 0 ? _d : '');
                // Only allow POST
                if (req.method !== 'POST') {
                    throw new Error('Method not allowed');
                }
                return [4 /*yield*/, req.json()];
            case 2:
                _a = _e.sent(), userId = _a.userId, provider = _a.provider, key = _a.key, label = _a.label;
                if (!userId || !provider || !key) {
                    throw new Error('Missing required fields: userId, provider, key');
                }
                encryptionKey_1 = Deno.env.get('ENCRYPTION_KEY');
                if (!encryptionKey_1) {
                    console.error('Missing ENCRYPTION_KEY env var');
                    throw new Error('Server configuration error');
                }
                encrypt = function (text) {
                    var masterKey = buffer_ts_1.Buffer.from(encryptionKey_1, 'base64');
                    var salt = crypto_ts_1.crypto.randomBytes(64);
                    var iv = crypto_ts_1.crypto.randomBytes(16);
                    var derivedKey = crypto_ts_1.crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
                    var cipher = crypto_ts_1.crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
                    var encrypted = cipher.update(text, 'utf8', 'hex');
                    encrypted += cipher.final('hex');
                    var tag = cipher.getAuthTag();
                    // Combine: salt (64) + iv (16) + tag (16) + encrypted
                    var combined = buffer_ts_1.Buffer.concat([
                        salt,
                        iv,
                        tag,
                        buffer_ts_1.Buffer.from(encrypted, 'hex')
                    ]);
                    return combined.toString('base64');
                };
                encryptedKey = encrypt(key);
                fingerprint = "...".concat(key.slice(-4));
                return [4 /*yield*/, supabaseClient
                        .from('api_keys')
                        .insert({
                        user_id: userId,
                        provider: provider,
                        encrypted_key: encryptedKey,
                        key_fingerprint: fingerprint,
                        label: label
                    })
                        .select()
                        .single()];
            case 3:
                _b = _e.sent(), data = _b.data, error = _b.error;
                if (error)
                    throw error;
                return [2 /*return*/, new Response(JSON.stringify(data), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 200,
                    })];
            case 4:
                error_1 = _e.sent();
                console.error('Error in create-api-key:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: error_1.message }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 500,
                    })];
            case 5: return [2 /*return*/];
        }
    });
}); });
