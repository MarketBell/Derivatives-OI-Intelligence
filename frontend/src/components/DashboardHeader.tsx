import React, { useState } from 'react';
import { Activity, RefreshCw, Calendar } from 'lucide-react';

interface DashboardHeaderProps {
  lastUpdated: string;
  selectedIndex?: string;
  currentExpiry?: string;
  spotPrice?: number;
  atmStrike?: number;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  lastUpdated,
  selectedIndex = 'NIFTY',
  currentExpiry,
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
          <Activity className="w-5 h-5" />
        </div>
        <div className="header-title-group">
          <div className="title-row">
            <h1 className="header-title">OI Intelligence Dashboard</h1>
            <span className="index-tag-badge">{selectedIndex}</span>
          </div>
          <p className="header-subtitle">
            Real-Time Derivatives Open Interest Intelligence
          </p>
        </div>
      </div>

      <div className="header-center-metrics">
        {currentExpiry && (
          <div className="header-badge-item">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            <span className="badge-lbl">Expiry:</span>
            <span className="badge-val font-semibold">{currentExpiry}</span>
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
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
