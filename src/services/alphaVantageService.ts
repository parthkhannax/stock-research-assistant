/**
 * Alpha Vantage API Service
 *
 * Integrates with rate limiter and cache service to efficiently fetch stock data
 * while staying within free tier limits (5 calls/min, 500/day)
 */

import { rateLimiter } from './rateLimiter';
import { cacheService } from './cacheService';
import type {
  TimeSeriesData,
  CompanyOverview,
  GlobalQuote,
  IncomeStatementResponse,
  StockQuote,
  StockPrice,
} from '../types/stock';

class AlphaVantageService {
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://www.alphavantage.co/query';

  constructor() {
    // In production, this would come from environment variables
    // For now, we'll need to set it via import.meta.env
    this.API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '';

    if (!this.API_KEY) {
      console.error('⚠️ Alpha Vantage API key not configured');
    }
  }

  /**
   * Generic fetch method with rate limiting and caching
   */
  private async fetchWithRateLimit<T>(
    params: Record<string, string>,
    cacheKey: string,
    cacheType: 'QUOTE' | 'DAILY_PRICES' | 'OVERVIEW' | 'FINANCIALS',
    priority: number = 0
  ): Promise<T> {
    // Check cache first
    const cached = cacheService.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    console.log(`📡 Cache miss for ${cacheKey}, queuing API request...`);

    // Queue the API request with rate limiting
    const data = await rateLimiter.enqueue<T>(async () => {
      const url = new URL(this.BASE_URL);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
      url.searchParams.append('apikey', this.API_KEY);

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const json = await response.json();

      // Check for API error messages
      if (json['Error Message']) {
        throw new Error(`Invalid symbol or API error: ${json['Error Message']}`);
      }

      if (json['Note']) {
        throw new Error('API rate limit exceeded: ' + json['Note']);
      }

      if (json['Information']) {
        throw new Error('API limit reached: ' + json['Information']);
      }

      return json as T;
    }, priority);

    // Cache the result
    cacheService.set(cacheKey, data, cacheType);

    return data;
  }

  /**
   * Get real-time quote for a stock
   * Priority: HIGH (users want this immediately)
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote_${symbol.toUpperCase()}`;

    const response = await this.fetchWithRateLimit<any>(
      {
        function: 'GLOBAL_QUOTE',
        symbol: symbol.toUpperCase(),
      },
      cacheKey,
      'QUOTE',
      10 // High priority
    );

    const quote = response['Global Quote'];

    if (!quote || !quote['01. symbol']) {
      throw new Error(`No quote data available for ${symbol}`);
    }

    // Transform to easier-to-use format
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      open: parseFloat(quote['02. open']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      volume: parseInt(quote['06. volume'], 10),
      previousClose: parseFloat(quote['08. previous close']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      tradingDay: quote['07. latest trading day'],
    };
  }

  /**
   * Get daily time series (historical prices)
   * Priority: MEDIUM
   */
  async getDailyTimeSeries(
    symbol: string,
    outputsize: 'compact' | 'full' = 'compact'
  ): Promise<StockPrice[]> {
    const cacheKey = `daily_${symbol.toUpperCase()}_${outputsize}`;

    const response = await this.fetchWithRateLimit<any>(
      {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol.toUpperCase(),
        outputsize,
      },
      cacheKey,
      'DAILY_PRICES',
      5 // Medium priority
    );

    const timeSeries = response['Time Series (Daily)'] as TimeSeriesData;

    if (!timeSeries) {
      throw new Error(`No time series data available for ${symbol}`);
    }

    // Transform to array format for easier charting
    return Object.entries(timeSeries).map(([date, values]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10),
    }));
  }

  /**
   * Get company overview (fundamentals)
   * Priority: MEDIUM
   */
  async getCompanyOverview(symbol: string): Promise<CompanyOverview> {
    const cacheKey = `overview_${symbol.toUpperCase()}`;

    return await this.fetchWithRateLimit<CompanyOverview>(
      {
        function: 'OVERVIEW',
        symbol: symbol.toUpperCase(),
      },
      cacheKey,
      'OVERVIEW',
      5 // Medium priority
    );
  }

  /**
   * Get income statement
   * Priority: LOW (less frequently accessed)
   */
  async getIncomeStatement(symbol: string): Promise<IncomeStatementResponse> {
    const cacheKey = `income_${symbol.toUpperCase()}`;

    return await this.fetchWithRateLimit<IncomeStatementResponse>(
      {
        function: 'INCOME_STATEMENT',
        symbol: symbol.toUpperCase(),
      },
      cacheKey,
      'FINANCIALS',
      2 // Low priority
    );
  }

  /**
   * Batch fetch multiple quotes (efficient for watchlist)
   * Rate limiter will serialize these requests automatically
   */
  async batchGetQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};

    // Fetch in parallel - rate limiter will queue and serialize them
    await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          const quote = await this.getQuote(symbol);
          results[symbol.toUpperCase()] = quote;
        } catch (error) {
          console.error(`❌ Error fetching quote for ${symbol}:`, error);
          // Don't throw, just skip this symbol
        }
      })
    );

    return results;
  }

  /**
   * Search for symbols (uses SYMBOL_SEARCH endpoint)
   * Priority: LOW
   */
  async searchSymbols(keywords: string): Promise<any[]> {
    const cacheKey = `search_${keywords.toLowerCase()}`;

    const response = await this.fetchWithRateLimit<any>(
      {
        function: 'SYMBOL_SEARCH',
        keywords,
      },
      cacheKey,
      'OVERVIEW', // Use same cache duration as overview
      1 // Low priority
    );

    return response['bestMatches'] || [];
  }

  /**
   * Force refresh data for a symbol (invalidates cache)
   */
  refreshSymbol(symbol: string): void {
    cacheService.invalidateSymbol(symbol.toUpperCase());
    console.log(`🔄 Cache invalidated for ${symbol}`);
  }
}

// Export singleton instance
export const alphaVantageService = new AlphaVantageService();
