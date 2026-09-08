import React from 'react';
import {
  LayoutDashboard,
  Settings,
  Shield,
  User,
  LogOut,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import type { UserProfile } from '../types/dashboard';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: UserProfile | null;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isDarkMode = false,
  onToggleTheme,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'OI Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Portal', icon: Shield }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="logo-icon">
              <Activity className="w-5 h-5" />
            </div>
            <div className="brand-text">
              <span className="brand-title">MARKET<span>BELL</span></span>
              <span className="brand-subtitle">OI INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
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
      </div>

      {/* Footer Area with Profile and Logout */}
      <div className="sidebar-footer-group">
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${isDarkMode ? 'Day' : 'Night'} Mode`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{isDarkMode ? 'Night Mode' : 'Day Mode'}</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Toggle</span>
          </button>
        )}

        {/* User Profile Card */}
        <div className="user-profile-card">
          <div className="user-avatar-box">
            <User className="w-4 h-4" />
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'Authorized Trader'}</span>
            <span className="user-email">{currentUser?.email || 'trader@gmail.com'}</span>
          </div>
          {isAdmin && (
            <span className="admin-pill-badge" title="Root Administrator">
              Admin
            </span>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout} title="Sign Out of Terminal">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
