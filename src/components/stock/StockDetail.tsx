import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Loader } from 'lucide-react';
import { alphaVantageService } from '../../services/alphaVantageService';
import { explainFundamentals, generateInvestmentThesis } from '../../services/geminiService';
import PriceChart from './PriceChart';
import type { CompanyOverview, StockQuote } from '../../types/stock';

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiThesis, setAiThesis] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!symbol) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [overviewData, quoteData] = await Promise.all([
          alphaVantageService.getCompanyOverview(symbol),
          alphaVantageService.getQuote(symbol),
        ]);
        setOverview(overviewData);
        setQuote(quoteData);
      } catch (error: any) {
        console.error('Error fetching stock data:', error);
        setError(error.message || 'Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // Generate AI insights after data loads
  useEffect(() => {
    if (!overview || !symbol) return;

    const generateAIInsights = async () => {
      setLoadingAI(true);
      try {
        const [analysis, thesis] = await Promise.all([
          explainFundamentals(symbol, overview),
          generateInvestmentThesis(symbol, overview, quote || undefined),
        ]);
        setAiAnalysis(analysis);
        setAiThesis(thesis);
      } catch (error) {
        console.error('Error generating AI insights:', error);
      } finally {
        setLoadingAI(false);
      }
    };

    generateAIInsights();
  }, [overview, symbol, quote]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white font-mono">Loading stock data...</p>
        </div>
      </div>
    );
  }

  if (error || !overview || !symbol) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-secondary hover:text-white transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-surface border border-red-400/50 rounded-2xl p-8 text-center">
            <p className="text-red-400 text-lg mb-2">⚠️ Error Loading Stock</p>
            <p className="text-secondary">{error || 'Stock not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPositive = quote && quote.change >= 0;
  const marketCap = parseFloat(overview.MarketCapitalization) / 1e9;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-secondary hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{overview.Name}</h1>
              <div className="flex items-center gap-4">
                <span className="text-2xl text-secondary font-mono">{symbol}</span>
                <span className="px-3 py-1 bg-surface border border-border rounded-full text-xs text-secondary font-mono">
                  {overview.Sector}
                </span>
                <span className="px-3 py-1 bg-surface border border-border rounded-full text-xs text-secondary font-mono">
                  {overview.Industry}
                </span>
              </div>
            </div>
          </div>

          {quote && (
            <div className="flex items-end gap-6">
              <div>
                <p className="text-sm text-secondary font-mono mb-1">Current Price</p>
                <p className="text-5xl font-bold text-white font-mono">${quote.price.toFixed(2)}</p>
              </div>
              <div className="pb-2">
                <div className={`flex items-center gap-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  <span className="text-2xl font-bold font-mono">
                    {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <p className="text-xs text-secondary font-mono mt-1">
                  As of {quote.tradingDay}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chart + Fundamentals */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <PriceChart symbol={symbol} />

            {/* Fundamentals Panel */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Key Fundamentals</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">Market Cap</p>
                  <p className="text-lg font-bold text-white font-mono">${marketCap.toFixed(2)}B</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">P/E Ratio</p>
                  <p className="text-lg font-bold text-white font-mono">{overview.PERatio || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">EPS</p>
                  <p className="text-lg font-bold text-white font-mono">${overview.EPS}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">Dividend Yield</p>
                  <p className="text-lg font-bold text-white font-mono">{overview.DividendYield || '0'}%</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">Beta</p>
                  <p className="text-lg font-bold text-white font-mono">{overview.Beta || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-mono uppercase mb-1">52W High</p>
                  <p className="text-lg font-bold text-white font-mono">${parseFloat(overview['52WeekHigh']).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Insights */}
          <div className="space-y-6">
            {/* Fundamentals Analysis */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-xl">🤖</span>
                AI Analysis
              </h3>
              {loadingAI ? (
                <div className="space-y-2">
                  <div className="h-4 bg-border rounded animate-pulse"></div>
                  <div className="h-4 bg-border rounded animate-pulse w-5/6"></div>
                  <div className="h-4 bg-border rounded animate-pulse w-4/6"></div>
                </div>
              ) : (
                <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                  {aiAnalysis}
                </p>
              )}
            </div>

            {/* Investment Thesis */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-xl">📊</span>
                Investment Thesis
              </h3>
              {loadingAI ? (
                <div className="space-y-2">
                  <div className="h-4 bg-border rounded animate-pulse"></div>
                  <div className="h-4 bg-border rounded animate-pulse w-5/6"></div>
                  <div className="h-4 bg-border rounded animate-pulse w-4/6"></div>
                </div>
              ) : (
                <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                  {aiThesis}
                </p>
              )}
            </div>

            {/* Company Description */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">About</h3>
              <p className="text-sm text-secondary leading-relaxed">
                {overview.Description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
