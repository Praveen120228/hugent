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
var supabase_js_2_38_4_1 = require("https://esm.sh/@supabase/supabase-js@2.38.4");
var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};
(0, server_ts_1.serve)(function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var cronSecret, requestSecret, supabaseUrl, supabaseServiceKey, supabase, _a, agents, fetchError, activeAgents, results, _i, activeAgents_1, agent, wakeUrl, response, result, err_1, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                // Handle CORS
                if (req.method === 'OPTIONS') {
                    return [2 /*return*/, new Response('ok', { headers: corsHeaders })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 10, , 11]);
                cronSecret = Deno.env.get('CRON_SECRET');
                requestSecret = req.headers.get('x-cron-secret');
                if (cronSecret && requestSecret !== cronSecret) {
                    return [2 /*return*/, new Response(JSON.stringify({ error: 'Unauthorized: Invalid cron secret' }), {
                            headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                            status: 401,
                        })];
                }
                supabaseUrl = Deno.env.get('SUPABASE_URL');
                supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                if (!supabaseUrl || !supabaseServiceKey) {
                    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
                }
                supabase = (0, supabase_js_2_38_4_1.createClient)(supabaseUrl, supabaseServiceKey);
                return [4 /*yield*/, supabase
                        .from('agents')
                        .select('id, name')
                        .eq('is_active', true)
                        .in('autonomy_mode', ['scheduled', 'full'])];
            case 2:
                _a = _b.sent(), agents = _a.data, fetchError = _a.error;
                if (fetchError)
                    throw fetchError;
                activeAgents = agents || [];
                console.log("Starting bulk wake cycle for ".concat(activeAgents.length, " agents"));
                results = [];
                _i = 0, activeAgents_1 = activeAgents;
                _b.label = 3;
            case 3:
                if (!(_i < activeAgents_1.length)) return [3 /*break*/, 9];
                agent = activeAgents_1[_i];
                _b.label = 4;
            case 4:
                _b.trys.push([4, 7, , 8]);
                console.log("Triggering wake for agent: ".concat(agent.name, " (").concat(agent.id, ")"));
                wakeUrl = "".concat(supabaseUrl, "/functions/v1/wake-agent/").concat(agent.id);
                return [4 /*yield*/, fetch(wakeUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': "Bearer ".concat(supabaseServiceKey),
                            'Content-Type': 'application/json'
                        }
                    })];
            case 5:
                response = _b.sent();
                return [4 /*yield*/, response.json()];
            case 6:
                result = _b.sent();
                results.push({
                    agentId: agent.id,
                    name: agent.name,
                    status: response.ok ? 'success' : 'error',
                    response: result
                });
                return [3 /*break*/, 8];
            case 7:
                err_1 = _b.sent();
                console.error("Failed to trigger wake for agent ".concat(agent.name, ":"), err_1);
                results.push({
                    agentId: agent.id,
                    name: agent.name,
                    status: 'error',
                    error: err_1.message
                });
                return [3 /*break*/, 8];
            case 8:
                _i++;
                return [3 /*break*/, 3];
            case 9: return [2 /*return*/, new Response(JSON.stringify({
                    message: "Bulk wake trigger complete for ".concat(results.length, " agents"),
                    results: results
                }), {
                    headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                    status: 200,
                })];
            case 10:
                error_1 = _b.sent();
                console.error('Edge Function bulk wake error:', error_1);
                return [2 /*return*/, new Response(JSON.stringify({ error: error_1.message }), {
                        headers: __assign(__assign({}, corsHeaders), { 'Content-Type': 'application/json' }),
                        status: 500,
                    })];
            case 11: return [2 /*return*/];
        }
    });
}); });
