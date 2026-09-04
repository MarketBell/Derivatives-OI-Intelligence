import React from 'react';
import {
  LayoutDashboard,
  Settings,
  Shield,
  User,
  LogOut,
} from 'lucide-react';
import type { UserProfile } from '../types/dashboard';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser?: UserProfile | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const menuItems = [
    { id: 'dashboard', label: 'User Dashboard', icon: LayoutDashboard },
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
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div className="brand-text">
              <span className="brand-title">BILLIONIT</span>
              <span className="brand-subtitle">WEALTH ANALYTICS</span>
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
        {/* User Profile Card */}
        <div className="user-profile-card">
          <div className="user-avatar-box">
            <User className="w-4 h-4 text-purple-700" />
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'Authorized User'}</span>
            <span className="user-email">{currentUser?.email || 'user@gmail.com'}</span>
          </div>
          {isAdmin && (
            <span className="admin-pill-badge" title="Root Administrator">
              Admin
            </span>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout} title="Sign Out of OI Intelligence">
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

