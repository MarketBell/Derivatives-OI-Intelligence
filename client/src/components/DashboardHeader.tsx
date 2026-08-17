import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  lastUpdated: string;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ lastUpdated, onRefresh }) => {
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
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="header-title">OI Dashboard</h1>
      </div>

      <div className="header-right">
        <span className="last-updated">Last updated: {lastUpdated}</span>
        <button
          className={`refresh-button ${isRefreshing ? 'anim-spin' : ''}`}
          onClick={handleRefreshClick}
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
