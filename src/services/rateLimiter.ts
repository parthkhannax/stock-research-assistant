/**
 * Rate Limiter for Alpha Vantage API (Free Tier)
 *
 * Constraints:
 * - 5 API calls per minute
 * - 500 API calls per day
 *
 * Strategy:
 * - Priority-based request queue (high priority = quotes, low = financials)
 * - Minimum 12.5s spacing between requests for safety buffer
 * - Daily count persisted in localStorage, resets at midnight
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number; // Higher = more important
  timestamp: number;
}

class RateLimiter {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private requestHistory: number[] = []; // Timestamps of last 5 requests

  // Rate limit constants
  private readonly MAX_REQUESTS_PER_MINUTE = 5;
  private readonly INTERVAL_MS = 60 * 1000; // 1 minute
  private readonly MIN_REQUEST_SPACING_MS = 12500; // 12.5s between calls (safety buffer)

  // Daily limit tracking
  private dailyCount: number = 0;
  private dailyResetTime: number = this.getNextDayTimestamp();
  private readonly MAX_DAILY_REQUESTS = 500;

  constructor() {
    this.loadDailyCount();
    // Check for daily reset every minute
    setInterval(() => this.checkDailyReset(), 60000);
  }

  /**
   * Get timestamp for next midnight (when daily count resets)
   */
  private getNextDayTimestamp(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Load daily count from localStorage
   */
  private loadDailyCount() {
    const stored = localStorage.getItem('av_daily_count');
    const storedDate = localStorage.getItem('av_daily_date');
    const today = new Date().toDateString();

    if (stored && storedDate === today) {
      this.dailyCount = parseInt(stored, 10);
    } else {
      // New day, reset count
      this.dailyCount = 0;
      localStorage.setItem('av_daily_count', '0');
      localStorage.setItem('av_daily_date', today);
    }
  }

  /**
   * Check if we need to reset daily count (midnight has passed)
   */
  private checkDailyReset() {
    const now = Date.now();
    if (now >= this.dailyResetTime) {
      console.log('🔄 Daily API quota reset');
      this.dailyCount = 0;
      this.dailyResetTime = this.getNextDayTimestamp();
      localStorage.setItem('av_daily_count', '0');
      localStorage.setItem('av_daily_date', new Date().toDateString());
    }
  }

  /**
   * Check if we can make a request right now
   */
  private canMakeRequest(): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // Check daily limit
    if (this.dailyCount >= this.MAX_DAILY_REQUESTS) {
      return {
        allowed: false,
        reason: 'Daily API limit reached (500 calls). Resets at midnight.'
      };
    }

    // Remove requests older than 1 minute from history
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < this.INTERVAL_MS
    );

    // Check if we're under the per-minute limit
    if (this.requestHistory.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        reason: 'Per-minute rate limit reached (5 calls/min)'
      };
    }

    // Check minimum spacing between requests
    const lastRequest = this.requestHistory[this.requestHistory.length - 1];
    if (lastRequest && now - lastRequest < this.MIN_REQUEST_SPACING_MS) {
      return {
        allowed: false,
        reason: `Waiting ${Math.ceil((this.MIN_REQUEST_SPACING_MS - (now - lastRequest)) / 1000)}s before next call`
      };
    }

    return { allowed: true };
  }

  /**
   * Wait until we can make a request
   */
  private async waitUntilCanRequest(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 120; // Wait up to 2 minutes max

    while (attempts < maxAttempts) {
      const status = this.canMakeRequest();

      if (status.allowed) {
        return;
      }

      // If daily limit reached, throw error immediately
      if (this.dailyCount >= this.MAX_DAILY_REQUESTS) {
        throw new Error(status.reason);
      }

      const now = Date.now();
      const lastRequest = this.requestHistory[this.requestHistory.length - 1];
      const waitTime = lastRequest
        ? Math.max(this.MIN_REQUEST_SPACING_MS - (now - lastRequest), 1000)
        : 1000;

      console.log(`⏳ Rate limit: ${status.reason}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempts++;
    }

    throw new Error('Rate limiter timeout: Unable to process request after 2 minutes');
  }

  /**
   * Add a request to the queue
   * @param execute - Function that makes the API call
   * @param priority - Request priority (higher = processed first)
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${Date.now()}_${Math.random()}`,
        execute,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Insert based on priority (higher priority goes first)
      const insertIndex = this.queue.findIndex(q => q.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      console.log(`📝 Queued request (priority: ${priority}, queue length: ${this.queue.length})`);

      // Start processing queue
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;

      try {
        // Wait until rate limit allows request
        await this.waitUntilCanRequest();

        // Record request timing
        const now = Date.now();
        this.requestHistory.push(now);
        this.dailyCount++;
        localStorage.setItem('av_daily_count', this.dailyCount.toString());

        console.log(`🚀 Executing API call (daily: ${this.dailyCount}/500, queue: ${this.queue.length})`);

        // Execute the actual API call
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        console.error('❌ API call failed:', error);
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Get current queue and rate limit status
   */
  getQueueStatus() {
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < this.INTERVAL_MS
    );

    return {
      queueLength: this.queue.length,
      dailyUsed: this.dailyCount,
      dailyRemaining: this.MAX_DAILY_REQUESTS - this.dailyCount,
      recentRequests: this.requestHistory.length,
      canMakeRequest: this.canMakeRequest().allowed,
      nextResetTime: this.dailyResetTime,
    };
  }

  /**
   * Clear the queue (emergency use only)
   */
  clearQueue() {
    console.warn('⚠️ Clearing API request queue');
    this.queue = [];
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
