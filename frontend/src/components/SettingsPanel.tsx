import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Activity,
  Loader2
} from 'lucide-react';
import type { UserProfile } from '../types/dashboard';
import { API_BASE_URL } from '../config/api';

interface SettingsPanelProps {
  currentUser?: UserProfile | null;
  authToken?: string | null;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  authToken,
  onUpdateUser
}) => {
  const [name, setName] = useState(currentUser?.name || 'Authorized Trader');
  const [email, setEmail] = useState(currentUser?.email || 'trader@gmail.com');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  const [defaultIndex, setDefaultIndex] = useState('NIFTY');
  const [defaultFreq, setDefaultFreq] = useState('3min');

  const [oiAlerts, setOiAlerts] = useState(true);
  const [divergenceAlerts, setDivergenceAlerts] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName(currentUser.name);
      if (currentUser.email) setEmail(currentUser.email);
      setPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (authToken) {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ name, phone })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to update preferences on server.');
        }

        const updatedProfile: UserProfile = data.user || {
          ...(currentUser || { id: 'usr', email, role: 'user', accessType: 'none' }),
          name,
          phone
        };

        if (onUpdateUser) {
          onUpdateUser(updatedProfile);
        }
      } else if (currentUser && onUpdateUser) {
        onUpdateUser({ ...currentUser, name, phone });
      }

      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Settings Header */}
      <div className="settings-header">
        <div className="settings-header-left">
          <div className="settings-icon-box">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="settings-title">Settings & Preferences</h1>
            <p className="settings-sub">
              Manage your trader profile, default indices, and threshold alerts
            </p>
          </div>
        </div>

        {isSaved && (
          <div className="settings-toast">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preferences saved successfully!</span>
          </div>
        )}

        {errorMessage && (
          <div className="settings-toast" style={{ background: 'var(--loss-soft)', color: 'var(--loss)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="settings-grid">
        {/* Card 1: User Profile */}
        <div className="settings-card">
          <div className="card-header-row">
            <User className="w-5 h-5" />
            <h2 className="card-section-title">Trader Profile</h2>
          </div>
          <div className="card-body-stack">
            <div className="settings-user-preview">
              <div className="avatar-circle">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="preview-name">{name}</span>
                <span className="preview-email">{email}</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Gmail Address (Verified)</label>
              <input
                type="email"
                className="form-input"
                disabled
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter contact phone number"
                value={phone}
                disabled={isSaving}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Trading Defaults */}
        <div className="settings-card">
          <div className="card-header-row">
            <Activity className="w-5 h-5" />
            <h2 className="card-section-title">Trading Defaults</h2>
          </div>
          <div className="card-body-stack">
            <div className="form-field">
              <label className="form-label">Default Target Index</label>
              <select
                className="form-select"
                value={defaultIndex}
                onChange={(e) => setDefaultIndex(e.target.value)}
              >
                <option value="NIFTY">NIFTY 50 (₹50 step)</option>
                <option value="BANK NIFTY">BANK NIFTY (₹100 step)</option>
                <option value="SENSEX">SENSEX (₹100 step)</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Default Sampling Cadence</label>
              <select
                className="form-select"
                value={defaultFreq}
                onChange={(e) => setDefaultFreq(e.target.value)}
              >
                <option value="1min">1 Minute</option>
                <option value="3min">3 Minutes (Default)</option>
                <option value="5min">5 Minutes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Alert & Signal Notifications */}
        <div className="settings-card">
          <div className="card-header-row">
            <Bell className="w-5 h-5" />
            <h2 className="card-section-title">Signal Alerts</h2>
          </div>
          <div className="card-body-stack">
            <div className="toggle-row">
              <div>
                <span className="toggle-label">OI Surge Triggers</span>
                <span className="toggle-sub">Notify when Call/Put OI shifts &gt; 5%</span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={oiAlerts}
                onChange={(e) => setOiAlerts(e.target.checked)}
              />
            </div>

            <div className="toggle-row">
              <div>
                <span className="toggle-label">Price-OI Divergence</span>
                <span className="toggle-sub">Alert on Unwinding vs Building patterns</span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={divergenceAlerts}
                onChange={(e) => setDivergenceAlerts(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="settings-actions-bar">
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={isSaving}
            onClick={() => {
              setName(currentUser?.name || 'Authorized Trader');
              setEmail(currentUser?.email || 'trader@gmail.com');
              setPhone(currentUser?.phone || '');
              setDefaultIndex('NIFTY');
              setDefaultFreq('3min');
            }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </form>
    </div>
  );
};
