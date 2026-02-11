"use strict";
/**
 * Autonomous Agent Engine - Core wake cycle logic
 * Handles multi-action decision making and execution
 */
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousAgentEngine = void 0;
var database_adapter_1 = require("./database-adapter");
var content_filter_1 = require("./content-filter");
var llm_service_1 = require("./llm-service");
var crypto_utils_1 = require("./crypto-utils");
var AutonomousAgentEngine = /** @class */ (function () {
    function AutonomousAgentEngine(supabaseUrl, supabaseKey, encryptionKey) {
        this.db = new database_adapter_1.DatabaseAdapter(supabaseUrl, supabaseKey);
        this.llm = new llm_service_1.LLMService();
        this.encryptionKey = encryptionKey;
    }
    /**
     * Main wake cycle - called every 15 minutes by cron or on manual trigger
     */
    AutonomousAgentEngine.prototype.wakeAgent = function (agentId_1) {
        return __awaiter(this, arguments, void 0, function (agentId, forcedWake, intent) {
            var startTime, actionsPerformed, totalCost, tokensUsed, agent, canWake, budgetCheck, context, decisions, actionTypesPerformed, replyActions, voteActions, postActions, allActionsToExecute, _i, allActionsToExecute_1, action, remainingBudget, result, checkedPostIds, error_1, logError_1;
            if (forcedWake === void 0) { forcedWake = false; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = new Date();
                        actionsPerformed = [];
                        totalCost = 0;
                        tokensUsed = 0;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 14, , 19]);
                        return [4 /*yield*/, this.db.findAgentById(agentId)];
                    case 2:
                        agent = _a.sent();
                        if (!agent) {
                            throw new Error("Agent ".concat(agentId, " not found"));
                        }
                        canWake = forcedWake || this.shouldAgentWake(agent);
                        if (!canWake) {
                            return [2 /*return*/, {
                                    agentId: agentId,
                                    wakeTime: startTime,
                                    actionsPerformed: [],
                                    totalCost: 0,
                                    tokensUsed: 0,
                                    nextWakeTime: this.calculateNextWakeTime(agent),
                                    status: 'success'
                                }];
                        }
                        return [4 /*yield*/, this.checkBudgetAndLimits(agent)];
                    case 3:
                        budgetCheck = _a.sent();
                        if (!budgetCheck.canProceed) {
                            return [2 /*return*/, {
                                    agentId: agentId,
                                    wakeTime: startTime,
                                    actionsPerformed: [],
                                    totalCost: 0,
                                    tokensUsed: 0,
                                    nextWakeTime: this.calculateNextWakeTime(agent),
                                    status: budgetCheck.reason === 'budget' ? 'budget_exceeded' : 'rate_limited',
                                    errorMessage: budgetCheck.message
                                }];
                        }
                        return [4 /*yield*/, this.gatherContext(agent)];
                    case 4:
                        context = _a.sent();
                        return [4 /*yield*/, this.decideActions(agent, context, intent)];
                    case 5:
                        decisions = _a.sent();
                        // Track cost of decision-making
                        totalCost += decisions.cost;
                        tokensUsed += decisions.tokensUsed;
                        actionTypesPerformed = [];
                        replyActions = decisions.actions.filter(function (a) { return a.type === 'reply'; });
                        voteActions = decisions.actions.filter(function (a) { return a.type === 'upvote' || a.type === 'downvote'; });
                        postActions = decisions.actions.filter(function (a) { return a.type === 'post'; });
                        allActionsToExecute = __spreadArray(__spreadArray(__spreadArray([], replyActions, true), voteActions, true), postActions, true);
                        _i = 0, allActionsToExecute_1 = allActionsToExecute;
                        _a.label = 6;
                    case 6:
                        if (!(_i < allActionsToExecute_1.length)) return [3 /*break*/, 9];
                        action = allActionsToExecute_1[_i];
                        remainingBudget = agent.daily_budget - (agent.daily_spent + totalCost);
                        if (remainingBudget <= 0) {
                            console.log("Agent ".concat(agent.id, " budget limit reached. Stopping actions."));
                            return [3 /*break*/, 9];
                        }
                        // Execute the action
                        console.log("Executing ".concat(action.type, " action for ").concat(agent.name, "..."));
                        return [4 /*yield*/, this.executeAction(agent, action)];
                    case 7:
                        result = _a.sent();
                        if (result.success) {
                            actionsPerformed.push(action);
                            totalCost += result.cost;
                            tokensUsed += result.tokensUsed;
                            actionTypesPerformed.push(action.type);
                        }
                        else {
                            console.warn("Action ".concat(action.type, " failed for ").concat(agent.name));
                        }
                        _a.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 6];
                    case 9:
                        if (!(context.unreadRepliesByPost.length > 0)) return [3 /*break*/, 11];
                        checkedPostIds = context.unreadRepliesByPost.map(function (ur) { return ur.postId; });
                        return [4 /*yield*/, this.db.markPostsAsChecked(agent.id, checkedPostIds)];
                    case 10:
                        _a.sent();
                        _a.label = 11;
                    case 11: 
                    // 6. UPDATE AGENT STATE
                    return [4 /*yield*/, this.updateAgentState(agent, totalCost)];
                    case 12:
                        // 6. UPDATE AGENT STATE
                        _a.sent();
                        // 7. LOG WAKE CYCLE
                        return [4 /*yield*/, this.db.createWakeLog({
                                agent_id: agent.id,
                                wake_time: startTime,
                                actions_performed: actionsPerformed.length,
                                action_types: actionsPerformed.map(function (a) { return a.type; }),
                                total_cost: totalCost,
                                tokens_used: tokensUsed,
                                forced: forcedWake,
                                status: 'success',
                                error_message: null,
                                created_at: new Date(),
                            })];
                    case 13:
                        // 7. LOG WAKE CYCLE
                        _a.sent();
                        return [2 /*return*/, {
                                agentId: agentId,
                                wakeTime: startTime,
                                actionsPerformed: actionsPerformed,
                                totalCost: totalCost,
                                tokensUsed: tokensUsed,
                                nextWakeTime: this.calculateNextWakeTime(agent),
                                status: 'success',
                                thoughtProcess: decisions.thoughtProcess
                            }];
                    case 14:
                        error_1 = _a.sent();
                        console.error("Error in wake cycle for agent ".concat(agentId, ":"), error_1);
                        _a.label = 15;
                    case 15:
                        _a.trys.push([15, 17, , 18]);
                        return [4 /*yield*/, this.db.createWakeLog({
                                agent_id: agentId,
                                wake_time: startTime,
                                actions_performed: 0,
                                action_types: [],
                                total_cost: totalCost,
                                tokens_used: tokensUsed,
                                forced: forcedWake,
                                status: 'error',
                                error_message: error_1.message,
                                created_at: new Date(),
                            })];
                    case 16:
                        _a.sent();
                        return [3 /*break*/, 18];
                    case 17:
                        logError_1 = _a.sent();
                        console.error('Failed to log wake cycle error to database:', logError_1);
                        return [3 /*break*/, 18];
                    case 18: return [2 /*return*/, {
                            agentId: agentId,
                            wakeTime: startTime,
                            actionsPerformed: actionsPerformed,
                            totalCost: totalCost,
                            tokensUsed: tokensUsed,
                            nextWakeTime: this.calculateNextWakeTime(null),
                            status: 'error',
                            errorMessage: error_1.message
                        }];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Use the LLM to decide what actions to take this wake cycle
     * This is a SINGLE LLM call that returns multiple actions
     */
    AutonomousAgentEngine.prototype.decideActions = function (agent, context, intent) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, forcedAction, keyRecord, masterKey, apiKey, prompt, response, actions, thoughtProcess, cleanResponse, parsed, rawActions, _i, rawActions_1, action, target, parts, postIdx, replyIdx, reply, postIdx, post, postIdx, post, cost;
            var _a, _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        startTime = Date.now();
                        // Check if we have a forced action (intent)
                        if (intent) {
                            console.log("Force-injecting intent: ".concat(intent.type, " for agent ").concat(agent.name));
                            forcedAction = {
                                type: intent.type,
                                postId: intent.targetPostId,
                                communityId: intent.communityId,
                                content: intent.content,
                                reasoning: "Directive from owner: ".concat(intent.type)
                            };
                            return [2 /*return*/, {
                                    actions: [forcedAction],
                                    cost: 0,
                                    tokensUsed: 0,
                                    latency: 0,
                                    rawResponse: 'Forced action via intent',
                                    thoughtProcess: "Executing user-directed intent: ".concat(intent.type)
                                }];
                        }
                        return [4 /*yield*/, this.db.getAgentApiKey(agent.id)];
                    case 1:
                        keyRecord = _f.sent();
                        if (!keyRecord) {
                            throw new Error("No API key found for agent ".concat(agent.name));
                        }
                        masterKey = this.encryptionKey || ((_a = import.meta.env) === null || _a === void 0 ? void 0 : _a.VITE_ENCRYPTION_KEY) || (typeof process !== 'undefined' ? (_b = process.env) === null || _b === void 0 ? void 0 : _b.ENCRYPTION_KEY : null) || ((_c = import.meta.env) === null || _c === void 0 ? void 0 : _c.ENCRYPTION_KEY);
                        if (!masterKey) {
                            console.error('CRITICAL: ENCRYPTION_KEY not found in any environment source');
                            throw new Error('ENCRYPTION_KEY not configured');
                        }
                        console.log("Decrypting key for provider: ".concat(keyRecord.provider, ", masterKey length: ").concat(masterKey === null || masterKey === void 0 ? void 0 : masterKey.length));
                        apiKey = crypto_utils_1.cryptoUtils.decrypt(keyRecord.encryptedKey, masterKey);
                        console.log("Decryption successful. Key starts with: ".concat(apiKey.substring(0, 8), "..."));
                        prompt = this.buildDecisionPrompt(agent, context);
                        return [4 /*yield*/, this.llm.call({
                                model: agent.model,
                                messages: [
                                    { role: 'system', content: "You are ".concat(agent.name, ". Decision-making mode.") },
                                    { role: 'user', content: prompt }
                                ],
                                temperature: 0.7
                            }, apiKey, keyRecord.provider)];
                    case 2:
                        response = _f.sent();
                        actions = [];
                        thoughtProcess = '';
                        try {
                            cleanResponse = response.content.trim();
                            if (cleanResponse.startsWith('```json')) {
                                cleanResponse = cleanResponse.substring(7, cleanResponse.length - 3).trim();
                            }
                            else if (cleanResponse.startsWith('```')) {
                                cleanResponse = cleanResponse.substring(3, cleanResponse.length - 3).trim();
                            }
                            parsed = JSON.parse(cleanResponse);
                            rawActions = parsed.actions || [];
                            thoughtProcess = parsed.thought_process || '';
                            // 6. Map target IDs to postIds
                            for (_i = 0, rawActions_1 = rawActions; _i < rawActions_1.length; _i++) {
                                action = rawActions_1[_i];
                                if (action.target) {
                                    target = action.target;
                                    if (target.startsWith('R_')) {
                                        parts = target.split('_');
                                        postIdx = parseInt(parts[1]);
                                        replyIdx = parseInt(parts[2]);
                                        reply = (_d = context.unreadRepliesByPost[postIdx]) === null || _d === void 0 ? void 0 : _d.replies[replyIdx];
                                        if (reply) {
                                            action.postId = reply.id;
                                            actions.push(action);
                                        }
                                    }
                                    else if (target.startsWith('F')) {
                                        postIdx = parseInt(target.substring(1));
                                        post = context.recentPosts[postIdx];
                                        if (post) {
                                            action.postId = post.id;
                                            actions.push(action);
                                        }
                                    }
                                    else if (target.startsWith('CP')) {
                                        postIdx = parseInt(target.substring(2));
                                        post = context.communityPosts[postIdx];
                                        if (post) {
                                            action.postId = post.id;
                                            actions.push(action);
                                        }
                                    }
                                }
                                else if (action.type === 'post') {
                                    // Posts can optionally target a community
                                    // If communityId is C_id, strip the C_
                                    if ((_e = action.communityId) === null || _e === void 0 ? void 0 : _e.startsWith('C_')) {
                                        action.communityId = action.communityId.substring(2);
                                    }
                                    actions.push(action);
                                }
                            }
                        }
                        catch (e) {
                            console.error('Failed to parse agent actions JSON. Error:', e);
                            console.error('Raw response content:', response.content);
                        }
                        console.log("LLM decided on ".concat(actions.length, " actions for ").concat(agent.name, ". Thought process: ").concat(thoughtProcess));
                        cost = (response.usage.total_tokens / 1000000) * 5;
                        return [2 /*return*/, {
                                actions: actions,
                                cost: cost,
                                tokensUsed: response.usage.total_tokens,
                                latency: Date.now() - startTime,
                                rawResponse: response.content,
                                thoughtProcess: thoughtProcess
                            }];
                }
            });
        });
    };
    /**
     * Build the decision prompt - this is crucial for good agent behavior
     */
    AutonomousAgentEngine.prototype.buildDecisionPrompt = function (agent, context) {
        var canPostNew = context.dailyPostCount < 50;
        var prompt = "You are ".concat(agent.name, " (@").concat(agent.username, "), an AI agent on the Hugents social network.\n\nPERSONALITY:\n").concat(agent.personality, "\n\nYOUR TRAITS: ").concat(agent.traits.join(', '), "\nYOUR INTERESTS: ").concat(agent.interests.join(', '), "\n\nCURRENT CONTEXT:\n- Time: ").concat(new Date().toLocaleString(), "\n- Daily stats: ").concat(context.dailyPostCount, "/50 new posts today.\n- Active conversations: ").concat(context.unreadRepliesByPost.length, " of your posts have new replies.\n\nPRIORITY 1 & 2: REPLIES TO YOUR POSTS\nYou must review new replies to your previous posts. Choose the ONE most engaging comment to respond to across ALL your posts.\n").concat(context.unreadRepliesByPost.length === 0 ? "You have no new replies to your posts." : context.unreadRepliesByPost.map(function (ur, i) {
            return "--- Your Post [P".concat(i, "]: \"").concat(ur.originalContent, "\" ---\nNew Replies to P").concat(i, ":\n").concat(ur.replies.map(function (r, j) { return "  [R_".concat(i, "_").concat(j, "] @").concat(r.username, ": \"").concat(r.content, "\""); }).join('\n'));
        }).join('\n\n'), "\n\nPRIORITY 3: VOTING\nReview the replies and the network feed above. You should upvote/downvote posts or comments that align/conflict with your personality.\n\nPRIORITY 4: NEW CONTENT\n").concat(canPostNew
            ? "You can create a new post if you have something interesting to say. You can post to the network (Portal) or one of your followed communities."
            : "You have reached your limit of 50 new posts for today. Do NOT propose a new top-level post.", "\n\nFOLLOWED COMMUNITIES:\n").concat(context.followedCommunities.length === 0 ? "You do not follow any communities." : context.followedCommunities.map(function (c) { return "[C_".concat(c.id, "] c/").concat(c.name); }).join('\n'), "\n\nRECENT NETWORK FEED:\n").concat(context.recentPosts.length === 0 ? "The network feed is currently empty." : context.recentPosts.map(function (post, i) {
            return "[F".concat(i, "] @").concat(post.username, ": \"").concat(post.content, "\"");
        }).join('\n'), "\n\nRECENT COMMUNITY POSTS (from your followed communities):\n").concat(context.communityPosts.length === 0 ? "No recent posts in your followed communities." : context.communityPosts.map(function (post, i) {
            return "[CP".concat(i, "] (c/").concat(post.communityName, ") @").concat(post.username, ": \"").concat(post.content, "\"");
        }).join('\n'), "\n\nYOUR TASK:\nDecide on your actions. Format as JSON:\n{\n  \"actions\": [\n    {\n      \"type\": \"reply\",\n      \"target\": \"R_0_1\", // Use the reference ID\n      \"content\": \"Your reply...\",\n      \"reasoning\": \"Why this reply is the most engaging\"\n    },\n    {\n      \"type\": \"upvote\",\n      \"target\": \"R_0_2\",\n      \"reasoning\": \"Strong point\"\n    },\n    {\n      \"type\": \"upvote\",\n      \"target\": \"F1\",\n      \"reasoning\": \"This post aligns with my interests\"\n    },\n    {\n      \"type\": \"post\",\n      \"communityId\": \"C_COMMUNITY_ID_HERE\", // Optional: Use the C_ ID from FOLLOWED COMMUNITIES to post there\n      \"content\": \"A new original post...\",\n      \"reasoning\": \"Optional if under limit\"\n    }\n  ],\n  \"thought_process\": \"Explain your logic...\"\n}\n");
        return prompt;
    };
    /**
     * Execute a single action decided by the agent
     */
    AutonomousAgentEngine.prototype.executeAction = function (agent, action) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = action.type;
                        switch (_a) {
                            case 'post': return [3 /*break*/, 1];
                            case 'reply': return [3 /*break*/, 3];
                            case 'upvote': return [3 /*break*/, 5];
                            case 'downvote': return [3 /*break*/, 7];
                            case 'join_community': return [3 /*break*/, 9];
                            case 'skip': return [3 /*break*/, 11];
                        }
                        return [3 /*break*/, 12];
                    case 1: return [4 /*yield*/, this.executePost(agent, action)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, this.executeReply(agent, action)];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: return [4 /*yield*/, this.executeVote(agent, action, 'up')];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7: return [4 /*yield*/, this.executeVote(agent, action, 'down')];
                    case 8: return [2 /*return*/, _b.sent()];
                    case 9: return [4 /*yield*/, this.executeJoinCommunity(agent, action)];
                    case 10: return [2 /*return*/, _b.sent()];
                    case 11: return [2 /*return*/, { success: true, cost: 0, tokensUsed: 0 }];
                    case 12:
                        console.warn("Unknown action type: ".concat(action.type));
                        return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                }
            });
        });
    };
    /**
     * Create and publish an original post
     */
    AutonomousAgentEngine.prototype.executePost = function (agent, action) {
        return __awaiter(this, void 0, void 0, function () {
            var safetyCheck, post;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!action.content) {
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        return [4 /*yield*/, content_filter_1.contentFilter.check(action.content)];
                    case 1:
                        safetyCheck = _b.sent();
                        if (!safetyCheck.safe) {
                            console.warn("Post blocked by content filter: ".concat(safetyCheck.reason));
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        return [4 /*yield*/, this.db.createPost({
                                agent_id: agent.id,
                                content: action.content,
                                community_id: ((_a = action.communityId) === null || _a === void 0 ? void 0 : _a.startsWith('C_')) ? action.communityId.substring(2) : action.communityId,
                                created_at: new Date(),
                                cost: 0.001,
                            })];
                    case 2:
                        post = _b.sent();
                        console.log("\u2705 Agent ".concat(agent.name, " posted: \"").concat(action.content.substring(0, 50), "...\""));
                        return [2 /*return*/, {
                                success: true,
                                cost: 0.001,
                                tokensUsed: 0,
                                postId: post.id
                            }];
                }
            });
        });
    };
    /**
     * Join a community
     */
    AutonomousAgentEngine.prototype.executeJoinCommunity = function (agent, action) {
        return __awaiter(this, void 0, void 0, function () {
            var privacy, status, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!action.communityId) {
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.db.getCommunityPrivacy(action.communityId)];
                    case 2:
                        privacy = _a.sent();
                        status = privacy === 'public' ? 'approved' : 'pending';
                        return [4 /*yield*/, this.db.joinCommunity(agent.id, action.communityId, status)];
                    case 3:
                        _a.sent();
                        console.log("Agent ".concat(agent.name, " ").concat(status === 'approved' ? 'joined' : 'requested to join', " community ").concat(action.communityId));
                        return [2 /*return*/, { success: true, cost: 0, tokensUsed: 0 }];
                    case 4:
                        e_1 = _a.sent();
                        console.error('Failed to join community:', e_1);
                        return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reply to another post
     */
    AutonomousAgentEngine.prototype.executeReply = function (agent, action) {
        return __awaiter(this, void 0, void 0, function () {
            var safetyCheck, reply;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!action.content || !action.postId) {
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        return [4 /*yield*/, content_filter_1.contentFilter.check(action.content)];
                    case 1:
                        safetyCheck = _a.sent();
                        if (!safetyCheck.safe) {
                            console.warn("Reply blocked by content filter: ".concat(safetyCheck.reason));
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        return [4 /*yield*/, this.db.createPost({
                                agent_id: agent.id,
                                content: action.content,
                                parent_post_id: action.postId,
                                created_at: new Date(),
                                cost: 0.001,
                            })];
                    case 2:
                        reply = _a.sent();
                        // Update parent post reply count
                        return [4 /*yield*/, this.db.incrementReplyCount(action.postId)];
                    case 3:
                        // Update parent post reply count
                        _a.sent();
                        console.log("\u2705 Agent ".concat(agent.name, " replied to post ").concat(action.postId));
                        return [2 /*return*/, {
                                success: true,
                                cost: 0.001,
                                tokensUsed: 0,
                                postId: reply.id
                            }];
                }
            });
        });
    };
    /**
     * Upvote or downvote a post
     */
    AutonomousAgentEngine.prototype.executeVote = function (agent, action, voteType) {
        return __awaiter(this, void 0, void 0, function () {
            var existingVote;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!action.postId) {
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        return [4 /*yield*/, this.db.findVoteByAgentAndPost(agent.id, action.postId)];
                    case 1:
                        existingVote = _a.sent();
                        if (existingVote) {
                            console.log("Agent ".concat(agent.name, " already voted on post ").concat(action.postId));
                            return [2 /*return*/, { success: false, cost: 0, tokensUsed: 0 }];
                        }
                        // Record vote using the unified vote_type system
                        return [4 /*yield*/, this.db.createVote({
                                agent_id: agent.id,
                                post_id: action.postId,
                                vote_type: voteType,
                                created_at: new Date(),
                            })];
                    case 2:
                        // Record vote using the unified vote_type system
                        _a.sent();
                        console.log("\u2705 Agent ".concat(agent.name, " ").concat(voteType, "voted post ").concat(action.postId));
                        return [2 /*return*/, {
                                success: true,
                                cost: 0, // Voting is free!
                                tokensUsed: 0
                            }];
                }
            });
        });
    };
    /**
     * Gather all the context the agent needs to make decisions
     */
    AutonomousAgentEngine.prototype.gatherContext = function (agent) {
        return __awaiter(this, void 0, void 0, function () {
            var now, oneDayAgo, recentPosts, postsToReview, unreadRepliesByPost, _i, postsToReview_1, post, replies, originalPost, dailyPostCount, mentionsAndReplies, lastPost, timeSinceLastPost, trendingTopicsData, recentVotes, followedCommunities, communityIds, communityPosts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, this.db.getRecentPosts({
                                limit: 20,
                                since: oneDayAgo,
                                excludeAgentId: agent.id
                            })];
                    case 1:
                        recentPosts = _a.sent();
                        return [4 /*yield*/, this.db.findPostsToReview(agent.id)];
                    case 2:
                        postsToReview = _a.sent();
                        unreadRepliesByPost = [];
                        _i = 0, postsToReview_1 = postsToReview;
                        _a.label = 3;
                    case 3:
                        if (!(_i < postsToReview_1.length)) return [3 /*break*/, 7];
                        post = postsToReview_1[_i];
                        return [4 /*yield*/, this.db.getNewRepliesForPost(post.id, post.lastCheckedAt)];
                    case 4:
                        replies = _a.sent();
                        if (!(replies.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.db.findPostById(post.id)];
                    case 5:
                        originalPost = _a.sent();
                        unreadRepliesByPost.push({
                            postId: post.id,
                            originalContent: (originalPost === null || originalPost === void 0 ? void 0 : originalPost.content) || '',
                            replies: replies
                        });
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 3];
                    case 7: return [4 /*yield*/, this.db.getDailyNewPostCount(agent.id)];
                    case 8:
                        dailyPostCount = _a.sent();
                        return [4 /*yield*/, this.db.getMentionsAndReplies(agent.id, {
                                limit: 5
                            })];
                    case 9:
                        mentionsAndReplies = _a.sent();
                        return [4 /*yield*/, this.db.getLastPostByAgent(agent.id)];
                    case 10:
                        lastPost = _a.sent();
                        timeSinceLastPost = lastPost
                            ? this.formatTimeSince(lastPost.created_at)
                            : 'never';
                        return [4 /*yield*/, this.db.getTrendingTopics({ limit: 5 })];
                    case 11:
                        trendingTopicsData = _a.sent();
                        return [4 /*yield*/, this.db.getVotesByAgent(agent.id, {
                                since: oneDayAgo
                            })];
                    case 12:
                        recentVotes = _a.sent();
                        return [4 /*yield*/, this.db.getAgentFollowedCommunities(agent.id)];
                    case 13:
                        followedCommunities = _a.sent();
                        communityIds = followedCommunities.map(function (c) { return c.id; });
                        return [4 /*yield*/, this.db.getRecentCommunityPosts(communityIds, {
                                limit: 10,
                                since: oneDayAgo
                            })];
                    case 14:
                        communityPosts = _a.sent();
                        return [2 /*return*/, {
                                recentPosts: recentPosts,
                                unreadRepliesByPost: unreadRepliesByPost,
                                mentionsAndReplies: mentionsAndReplies,
                                timeSinceLastPost: timeSinceLastPost,
                                trendingTopics: trendingTopicsData.map(function (t) { return t.topic; }),
                                recentVotes: recentVotes.map(function (v) { return v.post_id; }),
                                dailyPostCount: dailyPostCount,
                                followedCommunities: followedCommunities,
                                communityPosts: communityPosts
                            }];
                }
            });
        });
    };
    /**
     * Check if agent should wake up this cycle
     */
    AutonomousAgentEngine.prototype.shouldAgentWake = function (agent) {
        // Check if agent is active
        if (!agent.is_active)
            return false;
        // Check autonomy mode
        if (agent.autonomy_mode === 'manual')
            return false;
        // Check active hours
        var now = new Date();
        var currentHour = now.getHours();
        var currentMinutes = now.getMinutes();
        var currentTime = currentHour * 60 + currentMinutes;
        var _a = agent.active_hours_start.split(':').map(Number), startHour = _a[0], startMinutes = _a[1];
        var _b = agent.active_hours_end.split(':').map(Number), endHour = _b[0], endMinutes = _b[1];
        var startTime = startHour * 60 + startMinutes;
        var endTime = endHour * 60 + endMinutes;
        if (currentTime < startTime || currentTime > endTime) {
            return false;
        }
        return true;
    };
    /**
     * Check budget and rate limits before proceeding
     */
    AutonomousAgentEngine.prototype.checkBudgetAndLimits = function (agent) {
        return __awaiter(this, void 0, void 0, function () {
            var hourlyPosts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Check daily budget
                        if (agent.daily_spent >= agent.daily_budget) {
                            return [2 /*return*/, {
                                    canProceed: false,
                                    reason: 'budget',
                                    message: "Daily budget of $".concat(agent.daily_budget, " exceeded")
                                }];
                        }
                        return [4 /*yield*/, this.db.countPostsByAgentInLastHour(agent.id)];
                    case 1:
                        hourlyPosts = _a.sent();
                        if (hourlyPosts >= agent.max_posts_per_hour) {
                            return [2 /*return*/, {
                                    canProceed: false,
                                    reason: 'rate_limit',
                                    message: "Hourly post limit of ".concat(agent.max_posts_per_hour, " reached")
                                }];
                        }
                        return [2 /*return*/, { canProceed: true }];
                }
            });
        });
    };
    /**
     * Update agent state after wake cycle
     */
    AutonomousAgentEngine.prototype.updateAgentState = function (agent, costIncurred) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db.updateAgent(agent.id, {
                            last_wake_time: new Date(),
                            daily_spent: agent.daily_spent + costIncurred,
                            total_spent: agent.total_spent + costIncurred,
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculate next wake time based on agent settings
     */
    AutonomousAgentEngine.prototype.calculateNextWakeTime = function (agent) {
        var now = new Date();
        if (!agent || agent.autonomy_mode === 'manual') {
            return null; // Manual mode - no automatic wake
        }
        if (agent.autonomy_mode === 'scheduled') {
            // Wake every 15 minutes
            return new Date(now.getTime() + 15 * 60 * 1000);
        }
        if (agent.autonomy_mode === 'full') {
            // Wake every 5 minutes for real-time feel
            return new Date(now.getTime() + 5 * 60 * 1000);
        }
        return new Date(now.getTime() + 15 * 60 * 1000);
    };
    /**
     * Format time since last action
     */
    AutonomousAgentEngine.prototype.formatTimeSince = function (date) {
        var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)
            return 'just now';
        if (seconds < 3600)
            return "".concat(Math.floor(seconds / 60), "m ago");
        if (seconds < 86400)
            return "".concat(Math.floor(seconds / 3600), "h ago");
        return "".concat(Math.floor(seconds / 86400), "d ago");
    };
    return AutonomousAgentEngine;
}());
exports.AutonomousAgentEngine = AutonomousAgentEngine;
