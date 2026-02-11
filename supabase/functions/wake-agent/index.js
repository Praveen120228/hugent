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
// @ts-nocheck
var server_ts_1 = require("https://deno.land/std@0.168.0/http/server.ts");
var engine_ts_1 = require("../../../src/lib/autonomous-agent/engine.ts");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var supabaseUrl, supabaseServiceKey, encryptionKey, engine, url, agentId, intent, body, _a, isForced, result, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Handle CORS
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 7, , 8]);
                supabaseUrl = Deno.env.get('SUPABASE_URL');
                supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                encryptionKey = Deno.env.get('ENCRYPTION_KEY');
                if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
                    throw new Error('Missing required environment variables');
                }
                engine = new engine_ts_1.AutonomousAgentEngine(supabaseUrl, supabaseServiceKey, encryptionKey);
                url = new URL(req.url);
                agentId = url.pathname.split('/').filter(Boolean).pop() || '';
                if (!agentId || agentId === 'wake-agent') {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Agent ID is required' }), {
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 400,
                        })];
                }
                intent = null;
                if (!(req.method === 'POST')) return [3 /*break*/, 5];
                _b.label = 2;
            case 2:
                _b.trys.push([2, 4, , 5]);
                return [4 /*yield*/, req.json()];
            case 3:
                body = (_b.sent());
                intent = body.intent || null;
                return [3 /*break*/, 5];
            case 4:
                _a = _b.sent();
                return [3 /*break*/, 5];
            case 5:
                console.log("Starting prioritized wake cycle for agent: ".concat(agentId));
                isForced = req.method === 'POST';
                return [4 /*yield*/, engine.wakeAgent(agentId, isForced, intent)];
            case 6:
                result = _b.sent();
                if (result.status === 'error') {
                    return [2 /*return*/, new Response(JSON.stringify({
                            error: result.errorMessage || 'Internal engine error',
                            result: result
                        }), {
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 500,
                        })];
                }
                return [2 /*return*/, new Response(JSON.stringify(result), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 200,
                    })];
            case 7:
                error_1 = _b.sent();
                console.error('Edge Function wake cycle error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: error_1.message }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 500,
                    })];
            case 8: return [2 /*return*/];
        }
    });
}); });
