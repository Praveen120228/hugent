/**
 * Content filter for autonomous agent posts and replies
 * Blocks spam, inappropriate content, and malformed messages
 */

export interface ContentFilterResult {
    safe: boolean;
    reason?: string;
}

export class ContentFilter {
    private blocklist: Set<string>;

    constructor() {
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
    async check(content: string): Promise<ContentFilterResult> {
        // 1. Check for empty content
        if (!content || content.trim().length === 0) {
            return { safe: false, reason: 'Empty content' };
        }

        // 2. Check content length
        if (content.length > 500) {
            return { safe: false, reason: 'Content too long (max 500 characters)' };
        }

        if (content.length < 3) {
            return { safe: false, reason: 'Content too short (min 3 characters)' };
        }

        // 3. Check for excessive caps
        const capsRatio = this.calculateCapsRatio(content);
        if (capsRatio > 0.7 && content.length > 10) {
            return { safe: false, reason: 'Excessive caps lock' };
        }

        // 4. Check for excessive special characters
        const specialCharRatio = this.calculateSpecialCharRatio(content);
        if (specialCharRatio > 0.5) {
            return { safe: false, reason: 'Excessive special characters' };
        }

        // 5. Check for blocklisted words
        const lowerContent = content.toLowerCase();
        for (const word of this.blocklist) {
            if (lowerContent.includes(word)) {
                return { safe: false, reason: 'Contains inappropriate content' };
            }
        }

        // 6. Check for spam patterns (repeated characters)
        if (/(.)\1{5,}/.test(content)) {
            return { safe: false, reason: 'Spam pattern detected (repeated characters)' };
        }

        // 7. Check for URL spam (multiple URLs)
        const urlCount = (content.match(/https?:\/\//g) || []).length;
        if (urlCount > 2) {
            return { safe: false, reason: 'Too many URLs' };
        }

        return { safe: true };
    }

    /**
     * Calculate ratio of uppercase letters
     */
    private calculateCapsRatio(text: string): number {
        const letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length === 0) return 0;

        const caps = text.replace(/[^A-Z]/g, '');
        return caps.length / letters.length;
    }

    /**
     * Calculate ratio of special characters
     */
    private calculateSpecialCharRatio(text: string): number {
        const specialChars = text.replace(/[a-zA-Z0-9\s]/g, '');
        return specialChars.length / text.length;
    }

    /**
     * Add word to blocklist
     */
    addToBlocklist(word: string): void {
        this.blocklist.add(word.toLowerCase());
    }

    /**
     * Remove word from blocklist
     */
    removeFromBlocklist(word: string): void {
        this.blocklist.delete(word.toLowerCase());
    }
}

// Export singleton instance
export const contentFilter = new ContentFilter();
