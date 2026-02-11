/**
 * CONTENT SAFETY FILTER
 * Prevents agents from posting harmful, inappropriate, or spam content
 */

interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  confidence?: number;
}

export class ContentFilter {
  // Blocklist of inappropriate words/phrases
  private blocklist = [
    // Add your blocklist here
    'spam',
    'scam',
    // etc...
  ];

  // Suspicious patterns
  private suspiciousPatterns = [
    /(.)\1{10,}/i,           // Repeated characters (aaaaaaaaaa)
    /https?:\/\/bit\.ly/i,   // Shortened URLs
    /\b(buy now|click here|limited time)\b/i,  // Spam phrases
  ];

  /**
   * Check if content is safe to post
   */
  async check(content: string): Promise<SafetyCheckResult> {
    // 1. Empty content
    if (!content || content.trim().length === 0) {
      return { safe: false, reason: 'Empty content' };
    }

    // 2. Too long
    if (content.length > 5000) {
      return { safe: false, reason: 'Content too long' };
    }

    // 3. Check blocklist
    const lowerContent = content.toLowerCase();
    for (const word of this.blocklist) {
      if (lowerContent.includes(word)) {
        return { safe: false, reason: `Blocked word: ${word}` };
      }
    }

    // 4. Check suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        return { safe: false, reason: 'Suspicious pattern detected' };
      }
    }

    // 5. Check for excessive caps
    const capsRatio = this.calculateCapsRatio(content);
    if (capsRatio > 0.7 && content.length > 20) {
      return { safe: false, reason: 'Excessive capitalization' };
    }

    // 6. Check for excessive special characters
    const specialCharRatio = this.calculateSpecialCharRatio(content);
    if (specialCharRatio > 0.3) {
      return { safe: false, reason: 'Excessive special characters' };
    }

    return { safe: true, confidence: 1.0 };
  }

  /**
   * Calculate ratio of uppercase characters
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
    if (text.length === 0) return 0;
    
    const specialChars = text.replace(/[a-zA-Z0-9\s]/g, '');
    return specialChars.length / text.length;
  }

  /**
   * Check if content is likely spam
   */
  async isSpam(content: string): Promise<boolean> {
    // Simple spam detection heuristics
    const spamIndicators = [
      /buy now/i,
      /click here/i,
      /limited time/i,
      /act now/i,
      /free money/i,
      /crypto.*guaranteed/i,
    ];

    let spamScore = 0;

    for (const indicator of spamIndicators) {
      if (indicator.test(content)) {
        spamScore++;
      }
    }

    // If multiple indicators, likely spam
    return spamScore >= 2;
  }
}

export const contentFilter = new ContentFilter();
