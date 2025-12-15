import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { alphaVantageService } from '../../services/alphaVantageService';
import type { StockPrice } from '../../types/stock';

interface PriceChartProps {
  symbol: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ symbol }) => {
  const [data, setData] = useState<StockPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const timeSeries = await alphaVantageService.getDailyTimeSeries(symbol, 'compact');
        // Take last 90 days and reverse (oldest first)
        const chartData = timeSeries.slice(0, 90).reverse();
        setData(chartData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Price Chart</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-secondary font-mono animate-pulse">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Price Chart</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-secondary font-mono">No chart data available</p>
        </div>
      </div>
    );
  }

  // Calculate price change for the period
  const firstPrice = data[0].close;
  const lastPrice = data[data.length - 1].close;
  const priceChange = lastPrice - firstPrice;
  const percentChange = (priceChange / firstPrice) * 100;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-secondary text-xs font-mono uppercase tracking-widest mb-2">90-Day Performance</h3>
          <p className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
            <span className="text-sm font-normal text-secondary ml-2">
              ({isPositive ? '+' : ''}${priceChange.toFixed(2)})
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-secondary font-mono">PRICE RANGE</p>
          <p className="text-sm text-white font-mono">
            ${Math.min(...data.map(d => d.low)).toFixed(2)} - ${Math.max(...data.map(d => d.high)).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#888"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
              interval={Math.floor(data.length / 6)}
            />
            <YAxis
              stroke="#888"
              tick={{ fill: '#888', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              domain={['dataMin - 5', 'dataMax + 5']}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#000',
                border: '1px solid #333',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono',
              }}
              itemStyle={{ color: '#fff', fontSize: 12 }}
              labelStyle={{ color: '#888', fontSize: 11 }}
              formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Price']}
              labelFormatter={(date) => {
                const d = new Date(date);
                return d.toLocaleDateString();
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#fff"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;
