import React from 'react';
import { LayoutDashboard, TrendingUp, History, Settings, Sun, Moon, Shield } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'oi-analysis', label: 'OI Analysis', icon: TrendingUp },
    { id: 'historical', label: 'Historical Data', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-logo">
          <div className="logo-icon">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div className="brand-text">
            <span className="brand-title">BILLIONIT</span>
            <span className="brand-subtitle">WEALTH</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button className="dark-mode-toggle" onClick={onToggleDarkMode}>
          <div className="dark-mode-label">
            {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <div className={`switch ${isDarkMode ? 'checked' : ''}`}>
            <span className="slider" />
          </div>
        </button>
      </div>
    </aside>
  );
};
