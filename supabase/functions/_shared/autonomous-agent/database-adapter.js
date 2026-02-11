"use strict";
/**
 * Supabase database adapter for autonomous agent operations
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseAdapter = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var DatabaseAdapter = /** @class */ (function () {
    function DatabaseAdapter(supabaseUrl, supabaseKey) {
        var _a, _b, _c, _d;
        // Use provided credentials or environment variables
        // @ts-ignore
        var url = supabaseUrl || ((_a = import.meta.env) === null || _a === void 0 ? void 0 : _a.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? (_b = process.env) === null || _b === void 0 ? void 0 : _b.NEXT_PUBLIC_SUPABASE_URL : '');
        // @ts-ignore
        var key = supabaseKey || ((_c = import.meta.env) === null || _c === void 0 ? void 0 : _c.SUPABASE_SERVICE_ROLE_KEY) || (typeof process !== 'undefined' ? (_d = process.env) === null || _d === void 0 ? void 0 : _d.SUPABASE_SERVICE_ROLE_KEY : '');
        if (!url || !key) {
            console.warn('DatabaseAdapter initialized with missing credentials');
        }
        this.supabase = (0, supabase_js_1.createClient)(url || '', key || '');
    }
    // ============================================================================
    // AGENTS
    // ============================================================================
    DatabaseAdapter.prototype.findAgentById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agents')
                            .select('*')
                            .eq('id', id)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            if (error.code === 'PGRST116')
                                return [2 /*return*/, null]; // Not found
                            throw error;
                        }
                        return [2 /*return*/, this.transformAgent(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.findEligibleAgentsForWake = function (autonomyModes) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agents')
                            .select('*')
                            .eq('is_active', true)
                            .in('autonomy_mode', autonomyModes)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (a) { return _this.transformAgent(a); })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.updateAgent = function (id, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agents')
                            .update(this.transformAgentForDB(updates))
                            .eq('id', id)];
                    case 1:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getAgentApiKey = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var agent, apiKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agents')
                            .select('api_key_id')
                            .eq('id', agentId)
                            .single()];
                    case 1:
                        agent = (_a.sent()).data;
                        if (!(agent === null || agent === void 0 ? void 0 : agent.api_key_id))
                            return [2 /*return*/, null];
                        return [4 /*yield*/, this.supabase
                                .from('api_keys')
                                .select('encrypted_key, provider')
                                .eq('id', agent.api_key_id)
                                .single()];
                    case 2:
                        apiKey = (_a.sent()).data;
                        if (!apiKey)
                            return [2 /*return*/, null];
                        return [2 /*return*/, {
                                encryptedKey: apiKey.encrypted_key,
                                provider: apiKey.provider
                            }];
                }
            });
        });
    };
    // ============================================================================
    // POSTS
    // ============================================================================
    DatabaseAdapter.prototype.getRecentPosts = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = this.supabase
                            .from('posts')
                            .select('*, agent:agents(id, name, username), profile:profiles(id, username)')
                            .order('created_at', { ascending: false })
                            .limit(options.limit);
                        if (options.since) {
                            query = query.gte('created_at', options.since.toISOString());
                        }
                        if (options.excludeAgentId) {
                            query = query.neq('agent_id', options.excludeAgentId);
                        }
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (p) {
                                var _a;
                                return ({
                                    id: p.id,
                                    username: ((_a = p.agent) === null || _a === void 0 ? void 0 : _a.username) || 'unknown',
                                    content: p.content,
                                    upvotes: p.upvotes || 0,
                                    downvotes: p.downvotes || 0,
                                    replyCount: p.reply_count || 0,
                                    createdAt: new Date(p.created_at),
                                });
                            })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getMentionsAndReplies = function (agentId, options) {
        return __awaiter(this, void 0, void 0, function () {
            var agentPosts, postIds, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('posts')
                            .select('id')
                            .eq('agent_id', agentId)];
                    case 1:
                        agentPosts = (_b.sent()).data;
                        postIds = (agentPosts === null || agentPosts === void 0 ? void 0 : agentPosts.map(function (p) { return p.id; })) || [];
                        if (postIds.length === 0)
                            return [2 /*return*/, []];
                        return [4 /*yield*/, this.supabase
                                .from('posts')
                                .select('*, agent:agents(id, name, username)')
                                .in('parent_post_id', postIds)
                                .order('created_at', { ascending: false })
                                .limit(options.limit)];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (p) {
                                var _a, _b;
                                return ({
                                    id: p.id,
                                    username: ((_a = p.agent) === null || _a === void 0 ? void 0 : _a.username) || ((_b = p.profile) === null || _b === void 0 ? void 0 : _b.username) || 'unknown',
                                    content: p.content,
                                    upvotes: p.upvotes || 0,
                                    downvotes: p.downvotes || 0,
                                    replyCount: p.reply_count || 0,
                                    createdAt: new Date(p.created_at),
                                });
                            })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getRecentCommunityPosts = function (communityIds, options) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (communityIds.length === 0)
                            return [2 /*return*/, []];
                        query = this.supabase
                            .from('posts')
                            .select('*, agent:agents(id, name, username), profile:profiles(id, username), community:communities(id, name)')
                            .in('community_id', communityIds)
                            .order('created_at', { ascending: false })
                            .limit(options.limit);
                        if (options.since) {
                            query = query.gte('created_at', options.since.toISOString());
                        }
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (p) {
                                var _a, _b;
                                return ({
                                    id: p.id,
                                    communityId: p.community.id,
                                    communityName: p.community.name,
                                    username: ((_a = p.agent) === null || _a === void 0 ? void 0 : _a.username) || ((_b = p.profile) === null || _b === void 0 ? void 0 : _b.username) || 'unknown',
                                    content: p.content,
                                    upvotes: p.upvotes || 0,
                                    downvotes: p.downvotes || 0,
                                    replyCount: p.reply_count || 0,
                                    createdAt: new Date(p.created_at),
                                });
                            })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.findPostById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('posts')
                            .select('*')
                            .eq('id', id)
                            .maybeSingle()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        if (!data)
                            return [2 /*return*/, null];
                        return [2 /*return*/, this.transformPost(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getLastPostByAgent = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('posts')
                            .select('*')
                            .eq('agent_id', agentId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        if (!data)
                            return [2 /*return*/, null];
                        return [2 /*return*/, this.transformPost(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.findPostsToReview = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var thirtyDaysAgo, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, this.supabase
                                .from('posts')
                                .select("\n                id,\n                agent_post_checks(last_checked_at)\n            ")
                                .eq('agent_id', agentId)
                                .gte('created_at', thirtyDaysAgo.toISOString())
                                .order('created_at', { ascending: false })];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (p) {
                                var _a, _b, _c, _d;
                                return ({
                                    id: p.id,
                                    lastCheckedAt: ((_b = (_a = p.agent_post_checks) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.last_checked_at)
                                        ? new Date((_d = (_c = p.agent_post_checks) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.last_checked_at)
                                        : null
                                });
                            })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getNewRepliesForPost = function (postId, since) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = this.supabase
                            .from('posts')
                            .select('*, agent:agents(id, name, username)')
                            .eq('parent_post_id', postId)
                            .order('created_at', { ascending: true });
                        if (since) {
                            query = query.gt('created_at', since.toISOString());
                        }
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (p) {
                                var _a;
                                return ({
                                    id: p.id,
                                    username: ((_a = p.agent) === null || _a === void 0 ? void 0 : _a.username) || 'unknown',
                                    content: p.content,
                                    upvotes: p.upvotes || 0,
                                    downvotes: p.downvotes || 0,
                                    replyCount: p.reply_count || 0,
                                    createdAt: new Date(p.created_at),
                                });
                            })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.markPostsAsChecked = function (agentId, postIds) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (postIds.length === 0)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.supabase
                                .from('agent_post_checks')
                                .upsert(postIds.map(function (id) { return ({
                                agent_id: agentId,
                                post_id: id,
                                last_checked_at: new Date().toISOString()
                            }); }), { onConflict: 'agent_id,post_id' })];
                    case 1:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getDailyNewPostCount = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var twentyFourHoursAgo, _a, count, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                        return [4 /*yield*/, this.supabase
                                .from('posts')
                                .select('*', { count: 'exact', head: true })
                                .eq('agent_id', agentId)
                                .is('parent_post_id', null)
                                .gte('created_at', twentyFourHoursAgo.toISOString())];
                    case 1:
                        _a = _b.sent(), count = _a.count, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, count || 0];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getAgentFollowedCommunities = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agent_community_memberships')
                            .select('community:communities(id, name)')
                            .eq('agent_id', agentId)
                            .eq('status', 'approved')];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, (data || []).map(function (d) { return ({
                                id: d.community.id,
                                name: d.community.name
                            }); })];
                }
            });
        });
    };
    DatabaseAdapter.prototype.createPost = function (post) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('posts')
                            .insert({
                            agent_id: post.agent_id,
                            content: post.content,
                            parent_post_id: post.parent_post_id || null,
                            community_id: post.community_id || null,
                            cost: post.cost || 0,
                        })
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, this.transformPost(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getCommunityPrivacy = function (communityId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('communities')
                            .select('privacy')
                            .eq('id', communityId)
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            return [2 /*return*/, null];
                        return [2 /*return*/, (data === null || data === void 0 ? void 0 : data.privacy) || 'public'];
                }
            });
        });
    };
    DatabaseAdapter.prototype.joinCommunity = function (agentId, communityId, status) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('agent_community_memberships')
                            .upsert({
                            agent_id: agentId,
                            community_id: communityId,
                            status: status,
                            role: 'member'
                        }, { onConflict: 'agent_id,community_id' })];
                    case 1:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseAdapter.prototype.incrementReplyCount = function (postId) {
        return __awaiter(this, void 0, void 0, function () {
            var error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.supabase.rpc('increment_reply_count', { post_id: postId })];
                    case 1:
                        error = (_a.sent()).error;
                        if (error)
                            throw error;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseAdapter.prototype.countPostsByAgentInLastHour = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            var oneHourAgo, _a, count, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                        return [4 /*yield*/, this.supabase
                                .from('posts')
                                .select('*', { count: 'exact', head: true })
                                .eq('agent_id', agentId)
                                .gte('created_at', oneHourAgo.toISOString())];
                    case 1:
                        _a = _b.sent(), count = _a.count, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, count || 0];
                }
            });
        });
    };
    // ============================================================================
    // VOTES
    // ============================================================================
    DatabaseAdapter.prototype.findVoteByAgentAndPost = function (agentId, postId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('votes')
                            .select('*')
                            .eq('agent_id', agentId)
                            .eq('post_id', postId)
                            .maybeSingle()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        if (!data)
                            return [2 /*return*/, null];
                        return [2 /*return*/, this.transformVote(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.createVote = function (vote) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('votes')
                            .insert({
                            agent_id: vote.agent_id,
                            post_id: vote.post_id,
                            vote_type: vote.vote_type,
                        })
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, this.transformVote(data)];
                }
            });
        });
    };
    DatabaseAdapter.prototype.getVotesByAgent = function (agentId, options) {
        return __awaiter(this, void 0, void 0, function () {
            var query, _a, data, error;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        query = this.supabase
                            .from('votes')
                            .select('*')
                            .eq('agent_id', agentId)
                            .order('created_at', { ascending: false });
                        if (options.since) {
                            query = query.gte('created_at', options.since.toISOString());
                        }
                        return [4 /*yield*/, query];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, data.map(function (v) { return _this.transformVote(v); })];
                }
            });
        });
    };
    // ============================================================================
    // WAKE LOGS
    // ============================================================================
    DatabaseAdapter.prototype.createWakeLog = function (log) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.supabase
                            .from('wake_logs')
                            .insert({
                            agent_id: log.agent_id,
                            wake_time: log.wake_time,
                            actions_performed: log.actions_performed,
                            action_types: log.action_types,
                            total_cost: log.total_cost,
                            tokens_used: log.tokens_used,
                            forced: log.forced,
                            status: log.status,
                            error_message: log.error_message,
                        })
                            .select()
                            .single()];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw error;
                        return [2 /*return*/, this.transformWakeLog(data)];
                }
            });
        });
    };
    // ============================================================================
    // ANALYTICS
    // ============================================================================
    DatabaseAdapter.prototype.getTrendingTopics = function (_options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // TODO: Implement trending topics based on hashtags or keywords
                // For now, return empty array
                return [2 /*return*/, []];
            });
        });
    };
    // ============================================================================
    // TRANSFORMERS
    // ============================================================================
    DatabaseAdapter.prototype.transformAgent = function (data) {
        return {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            username: data.username,
            personality: data.personality,
            interests: data.interests || [],
            traits: data.traits || [],
            model: data.model,
            provider: data.provider,
            autonomy_mode: data.autonomy_mode || 'manual',
            max_posts_per_hour: data.max_posts_per_hour || 10,
            daily_budget: parseFloat(data.daily_budget || 5),
            daily_spent: parseFloat(data.daily_spent || 0),
            total_spent: parseFloat(data.total_spent || 0),
            active_hours_start: data.active_hours_start || '09:00:00',
            active_hours_end: data.active_hours_end || '23:00:00',
            is_active: data.is_active !== false,
            last_wake_time: data.last_wake_time ? new Date(data.last_wake_time) : null,
        };
    };
    DatabaseAdapter.prototype.transformAgentForDB = function (agent) {
        var updates = {};
        if (agent.last_wake_time)
            updates.last_wake_time = agent.last_wake_time.toISOString();
        if (agent.daily_spent !== undefined)
            updates.daily_spent = agent.daily_spent;
        if (agent.total_spent !== undefined)
            updates.total_spent = agent.total_spent;
        if (agent.autonomy_mode)
            updates.autonomy_mode = agent.autonomy_mode;
        if (agent.is_active !== undefined)
            updates.is_active = agent.is_active;
        return updates;
    };
    DatabaseAdapter.prototype.transformPost = function (data) {
        return {
            id: data.id,
            agent_id: data.agent_id,
            content: data.content,
            created_at: new Date(data.created_at),
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            reply_count: data.reply_count || 0,
            parent_post_id: data.parent_post_id,
            cost: parseFloat(data.cost || 0),
        };
    };
    DatabaseAdapter.prototype.transformVote = function (data) {
        return {
            id: data.id,
            agent_id: data.agent_id,
            post_id: data.post_id,
            vote_type: data.vote_type,
            created_at: new Date(data.created_at),
        };
    };
    DatabaseAdapter.prototype.transformWakeLog = function (data) {
        return {
            id: data.id,
            agent_id: data.agent_id,
            wake_time: new Date(data.wake_time),
            actions_performed: data.actions_performed,
            action_types: data.action_types || [],
            total_cost: parseFloat(data.total_cost || 0),
            tokens_used: data.tokens_used || 0,
            forced: data.forced || false,
            status: data.status,
            error_message: data.error_message,
            created_at: new Date(data.created_at),
        };
    };
    return DatabaseAdapter;
}());
exports.DatabaseAdapter = DatabaseAdapter;
