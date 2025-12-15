import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import { alphaVantageService } from '../../services/alphaVantageService';
import type { StockQuote } from '../../types/stock';

// Demo watchlist - in production this would come from InstantDB
const DEMO_WATCHLIST = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];

const DashboardGrid: React.FC = () => {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loading, setLoading] = useState(true);
  const [searchSymbol, setSearchSymbol] = useState('');

  // Fetch quotes on mount
  React.useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const batchQuotes = await alphaVantageService.batchGetQuotes(DEMO_WATCHLIST);
        setQuotes(batchQuotes);
      } catch (error) {
        console.error('Error fetching watchlist quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();

    // Auto-refresh every 1 minute (cache will prevent duplicate API calls)
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchSymbol.trim()) {
      window.location.href = `/stock/${searchSymbol.toUpperCase()}`;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-secondary font-mono text-sm">
            Track your favorite stocks with real-time data and AI insights
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Search for a stock symbol (e.g., AAPL, TSLA)..."
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-4 text-white placeholder-secondary focus:outline-none focus:border-white/50 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Watchlist */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">My Watchlist</h2>
              <p className="text-sm text-secondary font-mono mt-1">
                {loading ? 'Loading quotes...' : `${Object.keys(quotes).length} stocks tracked`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {DEMO_WATCHLIST.map((symbol) => (
                <div
                  key={symbol}
                  className="bg-background border border-border rounded-xl p-4 animate-pulse"
                >
                  <div className="h-6 bg-border rounded w-24 mb-2"></div>
                  <div className="h-4 bg-border rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {DEMO_WATCHLIST.map((symbol) => {
                const quote = quotes[symbol];

                if (!quote) {
                  return (
                    <div
                      key={symbol}
                      className="bg-background border border-border rounded-xl p-4 text-secondary"
                    >
                      <p className="font-mono">{symbol} - Quote unavailable</p>
                    </div>
                  );
                }

                const isPositive = quote.change >= 0;

                return (
                  <Link
                    key={symbol}
                    to={`/stock/${symbol}`}
                    className="bg-background border border-border rounded-xl p-4 flex justify-between items-center hover:border-white/20 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1">
                      <h3 className="text-white font-mono font-bold text-lg group-hover:text-white/80 transition-colors">
                        {symbol}
                      </h3>
                      <p className="text-sm text-secondary font-mono mt-1">
                        ${quote.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Change */}
                      <div className="text-right">
                        <div className={`flex items-center gap-1 ${
                          isPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-mono font-bold">
                            {quote.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <p className={`text-xs font-mono ${
                          isPositive ? 'text-green-400/60' : 'text-red-400/60'
                        }`}>
                          {isPositive ? '+' : ''}{quote.change.toFixed(2)}
                        </p>
                      </div>

                      {/* Volume */}
                      <div className="text-right">
                        <p className="text-xs text-secondary font-mono uppercase">Volume</p>
                        <p className="text-sm text-white font-mono">
                          {(quote.volume / 1e6).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-surface/50 border border-border rounded-xl p-4">
          <p className="text-xs text-secondary font-mono">
            💡 <span className="text-white">Tip:</span> Click on any stock to see detailed analysis with AI-powered insights
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardGrid;
