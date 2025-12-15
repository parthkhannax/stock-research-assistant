/**
 * Cache Service with two-layer caching:
 * 1. Memory cache (fast, session-only)
 * 2. LocalStorage (persistent across page reloads)
 *
 * Different TTLs for different data types:
 * - Quotes: 1 minute (real-time data)
 * - Daily prices: 1 hour (historical data)
 * - Overview: 24 hours (company fundamentals)
 * - Financials: 24 hours (financial statements)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export type CacheType = 'QUOTE' | 'DAILY_PRICES' | 'OVERVIEW' | 'FINANCIALS';

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>();

  // Cache durations (in milliseconds)
  private readonly CACHE_DURATIONS = {
    QUOTE: 60 * 1000,              // 1 minute for real-time quotes
    DAILY_PRICES: 60 * 60 * 1000,  // 1 hour for daily historical data
    OVERVIEW: 24 * 60 * 60 * 1000, // 24 hours for company fundamentals
    FINANCIALS: 24 * 60 * 60 * 1000, // 24 hours for financial statements
  };

  /**
   * Generate storage key for localStorage
   */
  private getStorageKey(key: string): string {
    return `av_cache_${key}`;
  }

  /**
   * Set data in cache with specific duration
   */
  set<T>(key: string, data: T, type: CacheType): void {
    const duration = this.CACHE_DURATIONS[type];
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };

    // Memory cache (fast access)
    this.memoryCache.set(key, entry);

    // LocalStorage cache (persistent)
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
      console.log(`💾 Cached: ${key} (expires in ${Math.round(duration / 1000)}s)`);
    } catch (e) {
      console.warn('⚠️ LocalStorage quota exceeded, using memory cache only');
      // If localStorage is full, clean up old entries
      this.cleanOldEntries();
    }
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    // Check memory cache first (fastest)
    let entry = this.memoryCache.get(key);

    // Fallback to localStorage
    if (!entry) {
      try {
        const stored = localStorage.getItem(this.getStorageKey(key));
        if (stored) {
          entry = JSON.parse(stored);
          // Restore to memory cache for faster subsequent access
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch (e) {
        console.warn('⚠️ Error reading from cache:', e);
        return null;
      }
    }

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      console.log(`⏰ Cache expired: ${key}`);
      this.delete(key);
      return null;
    }

    const age = Math.round((Date.now() - entry.timestamp) / 1000);
    console.log(`✅ Cache hit: ${key} (age: ${age}s)`);
    return entry.data as T;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.memoryCache.delete(key);
    localStorage.removeItem(this.getStorageKey(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    console.log('🗑️ Clearing all cache');
    this.memoryCache.clear();

    // Clear all localStorage keys starting with 'av_cache_'
    Object.keys(localStorage)
      .filter(key => key.startsWith('av_cache_'))
      .forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clean up expired entries from localStorage
   */
  private cleanOldEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    Object.keys(localStorage)
      .filter(key => key.startsWith('av_cache_'))
      .forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (entry && now > entry.expiresAt) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (e) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          cleaned++;
        }
      });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache duration for a specific type
   */
  getCacheDuration(type: CacheType): number {
    return this.CACHE_DURATIONS[type];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    const localStorageKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('av_cache_')
    );

    return {
      memoryEntries: memorySize,
      localStorageEntries: localStorageKeys.length,
      totalEntries: localStorageKeys.length,
    };
  }

  /**
   * Invalidate all cache entries for a specific symbol
   * Useful when you want to force fresh data for a stock
   */
  invalidateSymbol(symbol: string): void {
    const keysToDelete: string[] = [];

    // Check memory cache
    this.memoryCache.forEach((_, key) => {
      if (key.includes(symbol)) {
        keysToDelete.push(key);
      }
    });

    // Check localStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith('av_cache_') && key.includes(symbol))
      .forEach(key => {
        keysToDelete.push(key.replace('av_cache_', ''));
      });

    keysToDelete.forEach(key => this.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`🔄 Invalidated ${keysToDelete.length} cache entries for ${symbol}`);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
