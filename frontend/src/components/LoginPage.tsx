import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowRight, Activity, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { UserProfile } from '../types/dashboard';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string, redirectTo: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail / Email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && data.user) {
        onLoginSuccess(data.user, data.token, data.redirectTo || '/dashboard');
      } else {
        setErrorMessage(data.message || 'Access denied. Your email is not authorized to access this dashboard.');
      }
    } catch (err: any) {
      setErrorMessage('Network error: Unable to connect to backend server. Please make sure backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background visual accents */}
      <div className="login-bg-glow-1" />
      <div className="login-bg-glow-2" />

      <div className="login-card-wrapper">
        {/* Branding Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="login-title">OI Intelligence Dashboard</h1>
          <h2 className="login-welcome-text" style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2d9f3', marginTop: '0.25rem' }}>
            Welcome back
          </h2>
          <p className="login-subtitle">
            Enter your registered Gmail address to access real-time derivatives analytics
          </p>
        </div>

        {/* Status feature list */}
        <div className="login-feature-strip">
          <div className="feature-pill">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Dynamic ATM ±4 OTM</span>
          </div>
          <div className="feature-pill">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prev Close Baseline Δ</span>
          </div>
          <div className="feature-pill">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>NIFTY • BANK NIFTY • SENSEX</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <label htmlFor="email" className="login-input-label">
              Enter your registered Gmail address
            </label>
            <div className="login-input-wrapper">
              <input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="yourname@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input-field"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="login-error-alert" role="alert">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-rose-200">
                {errorMessage}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="login-submit-btn"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying Access...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="login-footer-note">
          <p>
            Role-Based Authorization enforced by Billion IT Wealth backend services.
          </p>
        </div>
      </div>
    </div>
  );
};
