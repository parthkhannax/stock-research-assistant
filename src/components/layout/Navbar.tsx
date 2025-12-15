import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { rateLimiter } from '../../services/rateLimiter';

const Navbar: React.FC = () => {
  const [quota, setQuota] = React.useState(rateLimiter.getQueueStatus());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setQuota(rateLimiter.getQueueStatus());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="bg-surface border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2 bg-white rounded-lg">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Stock Research Assistant</h1>
            <p className="text-xs text-secondary font-mono">AI-Powered Analysis</p>
          </div>
        </Link>

        {/* API Quota Indicator */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-secondary font-mono uppercase tracking-wider">API Quota</div>
            <div className="flex items-center gap-2 mt-1">
              <BarChart3 className="w-4 h-4 text-secondary" />
              <span className={`text-sm font-mono font-bold ${
                quota.dailyRemaining < 50 ? 'text-red-400' :
                quota.dailyRemaining < 100 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {quota.dailyRemaining}/500
              </span>
              {quota.queueLength > 0 && (
                <span className="text-xs text-secondary">
                  ({quota.queueLength} queued)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
