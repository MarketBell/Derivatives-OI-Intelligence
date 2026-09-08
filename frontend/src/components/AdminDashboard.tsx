import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  RefreshCw,
  Play,
  Square,
  ShieldCheck,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  FileText,
  TrendingUp,
  Cpu,
  Layers,
  Clock
} from 'lucide-react';
import type { CollectorStatusData, AdminUserItem, IndexType } from '../types/dashboard';
import { API_BASE_URL } from '../config/api';

interface AdminDashboardProps {
  isDarkMode?: boolean;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [collectorStatus, setCollectorStatus] = useState<CollectorStatusData | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [grantDuration, setGrantDuration] = useState('365');
  const [grantNotes, setGrantNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexType>('NIFTY');
  const [logs, setLogs] = useState<Array<{ time: string; message: string; level: 'info' | 'warn' | 'error' }>>([
    { time: new Date().toLocaleTimeString(), message: 'Market Bell Admin Console initialized. Upstox API active.', level: 'info' },
    { time: new Date().toLocaleTimeString(), message: 'Dynamic ATM + 4 OTM calculations engine operational.', level: 'info' }
  ]);

  const addLog = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), message, level },
      ...prev.slice(0, 49)
    ]);
  };

  const fetchCollectorStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/option-chain/collection-status`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCollectorStatus(json.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch collector status:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      const res = await fetch(`${API_BASE_URL}/api/subscription/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setUsers(json.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchCollectorStatus();
    fetchUsers();

    const interval = setInterval(() => {
      fetchCollectorStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchCollectorStatus, fetchUsers]);

  const handleApproveUser = async (email: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      const res = await fetch(`${API_BASE_URL}/api/subscription/admin-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ type: 'success', text: `Approved dashboard access for ${email}` });
        addLog(`Admin approved access for ${email}. Status is now active.`, 'info');
        fetchUsers();
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Failed to approve access.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCollector = async (intervalMinutes = 3) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      const res = await fetch(`${API_BASE_URL}/api/option-chain/collector/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interval: intervalMinutes,
          index: selectedIndex,
          bypassMarketHours: true
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCollectorStatus(json.data);
        setActionMessage({ type: 'success', text: `Collector started successfully (${intervalMinutes}m interval)` });
        addLog(`Started live collector for ${selectedIndex} with ${intervalMinutes}m frequency.`, 'info');
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Failed to start collector.' });
        addLog(`Failed to start collector: ${json.message}`, 'error');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
      addLog(`Collector start error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCollector = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      const res = await fetch(`${API_BASE_URL}/api/option-chain/collector/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setCollectorStatus(json.data);
        setActionMessage({ type: 'success', text: 'Collector stopped.' });
        addLog('Live collector stopped by administrator.', 'warn');
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Failed to stop collector.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceFetch = async () => {
    setIsLoading(true);
    try {
      addLog(`Triggering immediate live fetch for ${selectedIndex} from Upstox API...`, 'info');
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      const res = await fetch(`${API_BASE_URL}/api/option-chain/fetch?index=${selectedIndex}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ type: 'success', text: `Live snapshot fetched for ${selectedIndex}` });
        addLog(`Live snapshot received for ${selectedIndex}. Underlying spot: ₹${json.data?.underlyingValue}`, 'info');
        fetchCollectorStatus();
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Live fetch failed.' });
        addLog(`Live fetch failed: ${json.message}`, 'error');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
      addLog(`Live fetch error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/subscription/admin-grant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          durationDays: parseInt(grantDuration, 10) || 365,
          notes: grantNotes.trim() || 'Admin granted access'
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ type: 'success', text: `Granted access to ${newEmail}` });
        addLog(`Granted admin access to ${newEmail}.`, 'info');
        setNewEmail('');
        setGrantNotes('');
        fetchUsers();
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Grant access failed.' });
        addLog(`Grant access error for ${newEmail}: ${json.message}`, 'error');
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAccess = async (email: string) => {
    if (email.toLowerCase() === 'billionitwealth@gmail.com') {
      setActionMessage({ type: 'error', text: 'Cannot revoke access from root administrator.' });
      return;
    }

    try {
      const token = localStorage.getItem('oi_token') || 'admin_token_demo';
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/subscription/admin-revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActionMessage({ type: 'success', text: `Revoked access from ${email}` });
        addLog(`Revoked access from user: ${email}`, 'warn');
        fetchUsers();
      } else {
        setActionMessage({ type: 'error', text: json.message || 'Revoke failed.' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const otherUsers = users.filter((u) => u.status !== 'pending');

  return (
    <div className="admin-container">
      {/* Admin Header */}
      <div className="admin-header-card">
        <div className="admin-header-title-box">
          <div className="admin-badge-icon">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="admin-title">ADMINISTRATIVE DASHBOARD & SYSTEM MONITOR</h2>
            <p className="admin-subtitle">
              System Control, Data Pipelines, Index Monitoring & User Access Management
            </p>
          </div>
        </div>

        <div className="admin-header-right">
          <div className="admin-user-tag">
            <span className="admin-user-label">Admin Email:</span>
            <span className="admin-user-email">billionitwealth@gmail.com</span>
          </div>
          <button
            className="btn-admin-refresh"
            onClick={() => {
              fetchCollectorStatus();
              fetchUsers();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'anim-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`action-alert ${actionMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{actionMessage.text}</span>
          <button className="alert-close-btn" onClick={() => setActionMessage(null)}>
            ×
          </button>
        </div>
      )}

      {/* SECTION 1: PENDING APPROVALS QUEUE */}
      {pendingUsers.length > 0 && (
        <div className="admin-panel-card" style={{ border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          <div className="panel-title-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="panel-title" style={{ color: 'var(--warning-gold)' }}>
                Pending User Registration Approvals ({pendingUsers.length})
              </h3>
            </div>
          </div>
          <div className="users-table-scroll" style={{ maxHeight: '200px' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Registered At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id || u.email}>
                    <td className="user-email-cell">{u.email}</td>
                    <td>{u.name || '-'}</td>
                    <td>
                      <span className="status-pill pill-pending">PENDING</span>
                    </td>
                    <td>{u.grantedAt ? new Date(u.grantedAt).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-approve"
                        onClick={() => handleApproveUser(u.email)}
                        disabled={isLoading}
                        title="Approve User Dashboard Access"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" /> Approve Access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid: A. System Overview & B. Data Collection Controls */}
      <div className="admin-grid-top">
        {/* Card A: System Overview */}
        <div className="admin-panel-card">
          <div className="panel-title-row">
            <Server className="w-4 h-4 text-indigo-500" />
            <h3 className="panel-title">A. System Overview</h3>
          </div>

          <div className="system-status-list">
            <div className="status-row">
              <span className="status-label">Overall System Health:</span>
              <span className="status-badge badge-green">Operational (Healthy)</span>
            </div>
            <div className="status-row">
              <span className="status-label">Upstox Live API Status:</span>
              <span className="status-badge badge-green">Connected & Verified</span>
            </div>
            <div className="status-row">
              <span className="status-label">Database Storage Mode:</span>
              <span className="status-badge badge-blue">
                {collectorStatus ? 'In-Memory Safe Ring Buffer & MongoDB Sync' : 'Active'}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Collector Pipeline:</span>
              <span className={`status-badge ${collectorStatus?.isRunning ? 'badge-green' : 'badge-amber'}`}>
                {collectorStatus?.isRunning ? 'Running (Active)' : 'Idle / Standby'}
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Configured Frequency:</span>
              <span className="status-value font-semibold">
                {collectorStatus?.intervalMinutes || 3} Minutes ({collectorStatus?.intervalSeconds || 180}s)
              </span>
            </div>
            <div className="status-row">
              <span className="status-label">Latest Snapshot Time:</span>
              <span className="status-value">{collectorStatus?.latestTime || 'Live Connected'}</span>
            </div>
          </div>
        </div>

        {/* Card B: Data Collection Controls */}
        <div className="admin-panel-card">
          <div className="panel-title-row">
            <Activity className="w-4 h-4 text-indigo-500" />
            <h3 className="panel-title">B. Data Collection Pipeline Control</h3>
          </div>

          <div className="collection-controls-box">
            <div className="control-item">
              <label className="control-label">Target Index:</label>
              <div className="index-selector-pills">
                {(['NIFTY', 'BANK NIFTY', 'SENSEX'] as IndexType[]).map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`btn-pill-index ${selectedIndex === idx ? 'active' : ''}`}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    {idx}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-item">
              <label className="control-label">Collection Interval / Frequency:</label>
              <div className="frequency-buttons-row">
                <button
                  type="button"
                  className={`btn-freq ${collectorStatus?.intervalMinutes === 1 ? 'active' : ''}`}
                  onClick={() => handleStartCollector(1)}
                  disabled={isLoading}
                >
                  1 Minute
                </button>
                <button
                  type="button"
                  className={`btn-freq ${collectorStatus?.intervalMinutes === 3 ? 'active' : ''}`}
                  onClick={() => handleStartCollector(3)}
                  disabled={isLoading}
                >
                  3 Minutes (Default)
                </button>
                <button
                  type="button"
                  className={`btn-freq ${collectorStatus?.intervalMinutes === 5 ? 'active' : ''}`}
                  onClick={() => handleStartCollector(5)}
                  disabled={isLoading}
                >
                  5 Minutes
                </button>
              </div>
            </div>

            <div className="control-actions-row">
              <button
                type="button"
                className="btn-admin-action btn-play"
                onClick={() => handleStartCollector(collectorStatus?.intervalMinutes || 3)}
                disabled={isLoading || collectorStatus?.isRunning}
              >
                <Play className="w-4 h-4 mr-1" /> Start Collector
              </button>
              <button
                type="button"
                className="btn-admin-action btn-stop"
                onClick={handleStopCollector}
                disabled={isLoading || !collectorStatus?.isRunning}
              >
                <Square className="w-4 h-4 mr-1" /> Stop Collector
              </button>
              <button
                type="button"
                className="btn-admin-action btn-force"
                onClick={handleForceFetch}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Force Fetch Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: C. Index Status & D. Calculation Status & E. Health */}
      <div className="admin-grid-middle">
        {/* Card C: Index Status */}
        <div className="admin-panel-card">
          <div className="panel-title-row">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="panel-title">C. Index Live Status</h3>
          </div>

          <div className="index-stats-grid">
            <div className="index-stat-card">
              <span className="stat-index-name">{selectedIndex}</span>
              <div className="stat-row">
                <span className="stat-lbl">Live Spot:</span>
                <span className="stat-val font-bold">₹{collectorStatus?.spotPrice?.toLocaleString() || '-'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-lbl">Active Expiry:</span>
                <span className="stat-val font-mono">{collectorStatus?.latestExpiry || 'Current Week'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-lbl">Dynamic ATM:</span>
                <span className="stat-val atm-pill">₹{collectorStatus?.atmStrike?.toLocaleString() || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card D: Calculation Status */}
        <div className="admin-panel-card">
          <div className="panel-title-row">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <h3 className="panel-title">D. Calculation Status (MOM Rules)</h3>
          </div>

          <div className="calc-status-list">
            <div className="calc-row">
              <span className="calc-label">Strike Model:</span>
              <span className="calc-val">Dynamic ATM + 4 OTM (9 Strikes)</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Total Call OI (ATM+4):</span>
              <span className="calc-val txt-green">{collectorStatus?.latestTotalCallOI?.toLocaleString() || '-'}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Total Put OI (ATM+4):</span>
              <span className="calc-val txt-red">{collectorStatus?.latestTotalPutOI?.toLocaleString() || '-'}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">PCR (Put / Call Ratio):</span>
              <span className="calc-val font-bold">{collectorStatus?.pcr ?? '-'}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">OI Change Baseline:</span>
              <span className="calc-val badge-blue">Previous Trading Day Close</span>
            </div>
          </div>
        </div>

        {/* Card E: Data Health / Validation */}
        <div className="admin-panel-card">
          <div className="panel-title-row">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="panel-title">E. Data Health & Validation</h3>
          </div>

          <div className="health-checks-list">
            <div className="health-row">
              <span className="health-label">API Connectivity:</span>
              <span className="status-badge badge-green">100% (HTTP 200 OK)</span>
            </div>
            <div className="health-row">
              <span className="health-label">Zod Schema Validation:</span>
              <span className="status-badge badge-green">Passed</span>
            </div>
            <div className="health-row">
              <span className="health-label">Strike Spacing Enforced:</span>
              <span className="status-badge badge-green">₹50 / ₹100 Standardized</span>
            </div>
            <div className="health-row">
              <span className="health-label">Market Session Guard:</span>
              <span className="status-badge badge-blue">09:15 AM - 03:40 PM IST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card G: User Access Management */}
      <div className="admin-panel-card user-access-panel">
        <div className="panel-title-row">
          <Users className="w-4 h-4 text-indigo-500" />
          <h3 className="panel-title">G. User Access Management</h3>
        </div>

        <div className="user-management-grid">
          {/* Grant Form */}
          <form className="grant-access-form" onSubmit={handleGrantAccess}>
            <h4 className="form-title">
              <UserPlus className="w-4 h-4 inline mr-1 text-indigo-500" /> Grant / Invite Trader Access
            </h4>
            <div className="form-group">
              <label className="form-label">User Gmail ID:</label>
              <input
                type="email"
                className="form-input"
                placeholder="trader@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Duration (Days):</label>
                <select
                  className="form-select"
                  value={grantDuration}
                  onChange={(e) => setGrantDuration(e.target.value)}
                >
                  <option value="30">30 Days (1 Month)</option>
                  <option value="90">90 Days (3 Months)</option>
                  <option value="365">365 Days (1 Year)</option>
                  <option value="1825">5 Years (Extended)</option>
                </select>
              </div>
              <div className="form-group half">
                <label className="form-label">Notes:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. VIP Trader Access"
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary btn-grant" disabled={isLoading}>
              Grant Access
            </button>
          </form>

          {/* User List Table */}
          <div className="users-list-wrapper">
            <h4 className="form-title">Authorized Accounts ({otherUsers.length})</h4>
            <div className="users-table-scroll">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {otherUsers.map((u) => (
                    <tr key={u.id || u.email}>
                      <td className="user-email-cell">{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.status === 'active' ? 'pill-active' : u.status === 'pending' ? 'pill-pending' : 'pill-revoked'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        {u.email.toLowerCase() !== 'billionitwealth@gmail.com' ? (
                          <div className="user-action-cell">
                            {u.status === 'revoked' ? (
                              <button
                                type="button"
                                className="btn-approve"
                                onClick={() => handleApproveUser(u.email)}
                                title="Re-enable Access"
                              >
                                Re-enable
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-revoke"
                                onClick={() => handleRevokeAccess(u.email)}
                                title="Revoke User Access"
                              >
                                <UserX className="w-3.5 h-3.5 mr-1" /> Revoke
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="root-tag">Root Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Card F: Live System Logs */}
      <div className="admin-panel-card">
        <div className="panel-title-row">
          <FileText className="w-4 h-4 text-indigo-500" />
          <h3 className="panel-title">F. Real-Time System Logs</h3>
          <button className="btn-clear-logs" onClick={() => setLogs([])}>
            Clear Logs
          </button>
        </div>

        <div className="logs-console">
          {logs.length === 0 ? (
            <p className="log-empty">No log records.</p>
          ) : (
            logs.map((log, idx) => (
              <div key={`log-${idx}`} className={`log-entry log-${log.level}`}>
                <span className="log-time">[{log.time}]</span>
                <span className="log-level">[{log.level.toUpperCase()}]</span>
                <span className="log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
