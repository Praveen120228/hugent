"use strict";
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
exports.LLMService = void 0;
var LLMService = /** @class */ (function () {
    function LLMService() {
    }
    LLMService.prototype.call = function (request, apiKey, provider) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = provider;
                        switch (_a) {
                            case 'openai': return [3 /*break*/, 1];
                            case 'anthropic': return [3 /*break*/, 3];
                            case 'google': return [3 /*break*/, 5];
                            case 'gemini': return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 7];
                    case 1: return [4 /*yield*/, this.callOpenAI(request, apiKey)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, this.callAnthropic(request, apiKey)];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: return [4 /*yield*/, this.callGemini(request, apiKey)];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7: throw new Error("Unsupported provider: ".concat(provider));
                }
            });
        });
    };
    LLMService.prototype.callOpenAI = function (request, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, data;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0: return [4 /*yield*/, fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(apiKey),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: request.model || 'gpt-4o',
                                messages: request.messages,
                                temperature: (_a = request.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                max_tokens: (_b = request.max_tokens) !== null && _b !== void 0 ? _b : 2000,
                                response_format: { type: "json_object" }
                            })
                        })];
                    case 1:
                        response = _f.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        error = _f.sent();
                        throw new Error("OpenAI API error: ".concat(JSON.stringify(error)));
                    case 3: return [4 /*yield*/, response.json()];
                    case 4:
                        data = _f.sent();
                        return [2 /*return*/, {
                                content: ((_e = (_d = (_c = data.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) || '',
                                usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                            }];
                }
            });
        });
    };
    LLMService.prototype.callAnthropic = function (request, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error, data;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0: return [4 /*yield*/, fetch('https://api.anthropic.com/v1/messages', {
                            method: 'POST',
                            headers: {
                                'x-api-key': apiKey,
                                'anthropic-version': '2023-06-01',
                                'content-type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: request.model || 'claude-3-5-sonnet-20241022',
                                max_tokens: (_a = request.max_tokens) !== null && _a !== void 0 ? _a : 2000,
                                system: (_b = request.messages.find(function (m) { return m.role === 'system'; })) === null || _b === void 0 ? void 0 : _b.content,
                                messages: request.messages.filter(function (m) { return m.role !== 'system'; }),
                                temperature: (_c = request.temperature) !== null && _c !== void 0 ? _c : 0.7
                            })
                        })];
                    case 1:
                        response = _k.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        error = _k.sent();
                        throw new Error("Anthropic API error: ".concat(JSON.stringify(error)));
                    case 3: return [4 /*yield*/, response.json()];
                    case 4:
                        data = _k.sent();
                        return [2 /*return*/, {
                                content: ((_e = (_d = data.content) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || '',
                                usage: {
                                    prompt_tokens: ((_f = data.usage) === null || _f === void 0 ? void 0 : _f.input_tokens) || 0,
                                    completion_tokens: ((_g = data.usage) === null || _g === void 0 ? void 0 : _g.output_tokens) || 0,
                                    total_tokens: (((_h = data.usage) === null || _h === void 0 ? void 0 : _h.input_tokens) || 0) + (((_j = data.usage) === null || _j === void 0 ? void 0 : _j.output_tokens) || 0)
                                }
                            }];
                }
            });
        });
    };
    LLMService.prototype.callGemini = function (request, apiKey) {
        return __awaiter(this, void 0, void 0, function () {
            var model, response, error, data, content;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        model = request.model || 'gemini-1.5-flash';
                        return [4 /*yield*/, fetch("https://generativelanguage.googleapis.com/v1beta/models/".concat(model, ":generateContent?key=").concat(apiKey), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    contents: request.messages.map(function (m) { return ({
                                        role: m.role === 'assistant' ? 'model' : 'user',
                                        parts: [{ text: m.content }]
                                    }); }),
                                    generationConfig: {
                                        temperature: (_a = request.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                        maxOutputTokens: (_b = request.max_tokens) !== null && _b !== void 0 ? _b : 2000,
                                        responseMimeType: "application/json"
                                    }
                                })
                            })];
                    case 1:
                        response = _o.sent();
                        if (!!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        error = _o.sent();
                        throw new Error("Gemini API error: ".concat(JSON.stringify(error)));
                    case 3: return [4 /*yield*/, response.json()];
                    case 4:
                        data = _o.sent();
                        content = ((_g = (_f = (_e = (_d = (_c = data.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.parts) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.text) || '';
                        if (!content && ((_j = (_h = data.candidates) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.finishReason) === 'SAFETY') {
                            console.warn('Gemini blocked content due to safety filters.');
                        }
                        return [2 /*return*/, {
                                content: content,
                                usage: {
                                    prompt_tokens: ((_k = data.usageMetadata) === null || _k === void 0 ? void 0 : _k.promptTokenCount) || 0,
                                    completion_tokens: ((_l = data.usageMetadata) === null || _l === void 0 ? void 0 : _l.candidatesTokenCount) || 0,
                                    total_tokens: ((_m = data.usageMetadata) === null || _m === void 0 ? void 0 : _m.totalTokenCount) || 0
                                }
                            }];
                }
            });
        });
    };
    return LLMService;
}());
exports.LLMService = LLMService;
