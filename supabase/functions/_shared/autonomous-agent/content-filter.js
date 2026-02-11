"use strict";
/**
 * Content filter for autonomous agent posts and replies
 * Blocks spam, inappropriate content, and malformed messages
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
exports.contentFilter = exports.ContentFilter = void 0;
var ContentFilter = /** @class */ (function () {
    function ContentFilter() {
        // Initialize blocklist with common inappropriate words/patterns
        this.blocklist = new Set([
            // Add appropriate content filters here
            'spam',
            'scam',
        ]);
    }
    /**
     * Check if content is safe to post
     */
    ContentFilter.prototype.check = function (content) {
        return __awaiter(this, void 0, void 0, function () {
            var capsRatio, specialCharRatio, lowerContent, _i, _a, word, urlCount;
            return __generator(this, function (_b) {
                // 1. Check for empty content
                if (!content || content.trim().length === 0) {
                    return [2 /*return*/, { safe: false, reason: 'Empty content' }];
                }
                // 2. Check content length
                if (content.length > 500) {
                    return [2 /*return*/, { safe: false, reason: 'Content too long (max 500 characters)' }];
                }
                if (content.length < 3) {
                    return [2 /*return*/, { safe: false, reason: 'Content too short (min 3 characters)' }];
                }
                capsRatio = this.calculateCapsRatio(content);
                if (capsRatio > 0.7 && content.length > 10) {
                    return [2 /*return*/, { safe: false, reason: 'Excessive caps lock' }];
                }
                specialCharRatio = this.calculateSpecialCharRatio(content);
                if (specialCharRatio > 0.5) {
                    return [2 /*return*/, { safe: false, reason: 'Excessive special characters' }];
                }
                lowerContent = content.toLowerCase();
                for (_i = 0, _a = this.blocklist; _i < _a.length; _i++) {
                    word = _a[_i];
                    if (lowerContent.includes(word)) {
                        return [2 /*return*/, { safe: false, reason: 'Contains inappropriate content' }];
                    }
                }
                // 6. Check for spam patterns (repeated characters)
                if (/(.)\1{5,}/.test(content)) {
                    return [2 /*return*/, { safe: false, reason: 'Spam pattern detected (repeated characters)' }];
                }
                urlCount = (content.match(/https?:\/\//g) || []).length;
                if (urlCount > 2) {
                    return [2 /*return*/, { safe: false, reason: 'Too many URLs' }];
                }
                return [2 /*return*/, { safe: true }];
            });
        });
    };
    /**
     * Calculate ratio of uppercase letters
     */
    ContentFilter.prototype.calculateCapsRatio = function (text) {
        var letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length === 0)
            return 0;
        var caps = text.replace(/[^A-Z]/g, '');
        return caps.length / letters.length;
    };
    /**
     * Calculate ratio of special characters
     */
    ContentFilter.prototype.calculateSpecialCharRatio = function (text) {
        var specialChars = text.replace(/[a-zA-Z0-9\s]/g, '');
        return specialChars.length / text.length;
    };
    /**
     * Add word to blocklist
     */
    ContentFilter.prototype.addToBlocklist = function (word) {
        this.blocklist.add(word.toLowerCase());
    };
    /**
     * Remove word from blocklist
     */
    ContentFilter.prototype.removeFromBlocklist = function (word) {
        this.blocklist.delete(word.toLowerCase());
    };
    return ContentFilter;
}());
exports.ContentFilter = ContentFilter;
// Export singleton instance
exports.contentFilter = new ContentFilter();
