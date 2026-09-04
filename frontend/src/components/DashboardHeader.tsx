import React, { useState } from 'react';
import { Activity, RefreshCw, Calendar, Target, Zap } from 'lucide-react';

interface DashboardHeaderProps {
  lastUpdated: string;
  selectedIndex?: string;
  currentExpiry?: string;
  spotPrice?: number;
  atmStrike?: number;
  onRefresh: () => void;
}

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(num);
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  lastUpdated,
  selectedIndex = 'NIFTY',
  currentExpiry,
  spotPrice,
  atmStrike,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="header-icon-box">
          <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="header-title-group">
          <div className="title-row">
            <h1 className="header-title">OI Intelligence Dashboard</h1>
            <span className="index-tag-badge">{selectedIndex}</span>
          </div>
          <p className="header-subtitle">
            Real-Time Derivatives Open Interest Intelligence (ATM + 4 OTM Analysis)
          </p>
        </div>
      </div>

      <div className="header-center-metrics">
        {currentExpiry && (
          <div className="header-badge-item">
            <Calendar className="w-3.5 h-3.5 text-purple-500 mr-1" />
            <span className="badge-lbl">Expiry:</span>
            <span className="badge-val font-semibold">{currentExpiry}</span>
          </div>
        )}

        {spotPrice !== undefined && spotPrice > 0 && (
          <div className="header-badge-item">
            <Zap className="w-3.5 h-3.5 text-amber-500 mr-1" />
            <span className="badge-lbl">Spot:</span>
            <span className="badge-val font-bold">₹{formatNumber(spotPrice)}</span>
          </div>
        )}

        {atmStrike !== undefined && atmStrike > 0 && (
          <div className="header-badge-item atm-header-pill">
            <Target className="w-3.5 h-3.5 text-purple-600 mr-1" />
            <span className="badge-lbl">ATM Strike:</span>
            <span className="badge-val font-bold">₹{formatNumber(atmStrike)}</span>
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="last-updated-box">
          <span className="market-live-dot" />
          <span className="last-updated">Updated: {lastUpdated}</span>
        </div>
        <button
          className={`refresh-button ${isRefreshing ? 'anim-spin' : ''}`}
          onClick={handleRefreshClick}
          title="Pull Live Upstox Data"
        >
          <RefreshCw className="w-4 h-4 text-purple-600 dark:text-purple-300" />
        </button>
      </div>
    </header>
  );
};

