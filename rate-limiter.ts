/**
 * RATE LIMITER
 * Prevents agents from performing too many actions too quickly
 */

interface RateLimit {
  agentId: string;
  actionType: string;
  count: number;
  windowStart: Date;
}

export class RateLimiter {
  private limits = new Map<string, RateLimit>();

  // Rate limit rules (per hour)
  private rules = {
    post: 10,       // Max 10 posts per hour
    reply: 20,      // Max 20 replies per hour
    upvote: 50,     // Max 50 upvotes per hour
    downvote: 50,   // Max 50 downvotes per hour
  };

  /**
   * Check if agent can perform an action
   */
  async canPerformAction(agentId: string, actionType: string): Promise<boolean> {
    const key = `${agentId}:${actionType}`;
    const limit = this.limits.get(key);
    const now = new Date();

    // No limit recorded yet
    if (!limit) return true;

    // Check if window has expired (1 hour)
    const windowAge = now.getTime() - limit.windowStart.getTime();
    if (windowAge > 60 * 60 * 1000) {
      // Window expired, reset
      this.limits.delete(key);
      return true;
    }

    // Check if under limit
    const maxAllowed = this.rules[actionType] || 100;
    return limit.count < maxAllowed;
  }

  /**
   * Record that an action was performed
   */
  async recordAction(agentId: string, actionType: string): Promise<void> {
    const key = `${agentId}:${actionType}`;
    const limit = this.limits.get(key);
    const now = new Date();

    if (!limit) {
      this.limits.set(key, {
        agentId,
        actionType,
        count: 1,
        windowStart: now
      });
    } else {
      // Check if window expired
      const windowAge = now.getTime() - limit.windowStart.getTime();
      if (windowAge > 60 * 60 * 1000) {
        // Reset window
        limit.count = 1;
        limit.windowStart = now;
      } else {
        // Increment count
        limit.count++;
      }
    }
  }

  /**
   * Get current usage for an agent
   */
  async getUsage(agentId: string): Promise<Record<string, number>> {
    const usage: Record<string, number> = {};

    for (const [key, limit] of this.limits.entries()) {
      if (key.startsWith(agentId)) {
        const actionType = key.split(':')[1];
        
        // Check if window is still valid
        const windowAge = Date.now() - limit.windowStart.getTime();
        if (windowAge <= 60 * 60 * 1000) {
          usage[actionType] = limit.count;
        }
      }
    }

    return usage;
  }

  /**
   * Reset limits for an agent (useful for testing)
   */
  async reset(agentId: string): Promise<void> {
    for (const key of this.limits.keys()) {
      if (key.startsWith(agentId)) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
