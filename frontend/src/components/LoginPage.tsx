import React, { useState } from 'react';
import { Shield, Lock, AlertCircle, ArrowRight, User, CheckCircle2, Clock, KeyRound } from 'lucide-react';
import type { UserProfile } from '../types/dashboard';
import { API_BASE_URL } from '../config/api';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, token: string, redirectTo: string) => void;
}

type AuthView = 'signin' | 'create_account' | 'pending' | 'legacy_setup' | 'forgot_password';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<AuthView>('signin');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');

  const resetMessages = () => {
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const clearFormInputs = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
  };

  const switchView = (newView: AuthView) => {
    clearFormInputs();
    resetMessages();
    setView(newView);
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail / Email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && data.user) {
        clearFormInputs();
        onLoginSuccess(data.user, data.token, data.redirectTo || '/dashboard');
      } else if (data.status === 'requires_password_setup') {
        setView('legacy_setup');
        setPassword('');
        setConfirmPassword('');
        setInfoMessage(
          data.verificationCode
            ? `Existing authorized account detected. Verification code: ${data.verificationCode}`
            : 'Existing account detected. Enter the verification code sent to your email to set your password.'
        );
      } else if (data.status === 'pending_approval') {
        clearFormInputs();
        setView('pending');
      } else {
        setPassword('');
        setErrorMessage(data.message || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setErrorMessage('Network error: Unable to connect to backend server. Please verify the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create Account Handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail / Email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: cleanEmail, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        clearFormInputs();
        setView('pending');
      } else {
        setErrorMessage(data.message || 'Registration failed.');
      }
    } catch {
      setErrorMessage('Network error: Unable to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Legacy Setup Handler
  const handleCompleteLegacySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/complete-legacy-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
          newPassword: password
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token && data.user) {
        onLoginSuccess(data.user, data.token, data.redirectTo || '/dashboard');
      } else {
        setErrorMessage(data.message || 'Account setup verification failed.');
      }
    } catch {
      setErrorMessage('Network error: Unable to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Step 1: Request Code
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail / Email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForgotStep('verify');
        setInfoMessage(
          data.verificationCode
            ? `Verification code generated: ${data.verificationCode}`
            : 'If an account exists, a 6-digit code has been dispatched. Enter it below.'
        );
      } else {
        setErrorMessage(data.message || 'Unable to process password reset request.');
      }
    } catch {
      setErrorMessage('Network error: Unable to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!verificationCode.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: verificationCode.trim(),
          newPassword: password
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setView('signin');
        setInfoMessage('Password reset successfully. Please sign in with your new password.');
        setPassword('');
        setConfirmPassword('');
        setVerificationCode('');
      } else {
        setErrorMessage(data.message || 'Password reset failed.');
      }
    } catch {
      setErrorMessage('Network error: Unable to connect to backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-bg-glow-1" />

      <div className="login-card-wrapper">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-badge">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="login-title">Billionit Wealth</h1>
          <p className="login-subtitle">
            Derivatives Open Interest Intelligence Terminal
          </p>
        </div>

        {/* View: Pending Approval Screen */}
        {view === 'pending' && (
          <div className="pending-box">
            <div className="pending-badge-icon">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="pending-title">Account Created</h2>
            <p className="pending-desc">
              Your account has been created successfully. Your dashboard access is currently <strong>pending administrator approval</strong>.
            </p>
            <div className="status-pill pill-pending" style={{ padding: '4px 12px', fontSize: '12px' }}>
              Status: PENDING APPROVAL
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
              Once approved by administrator (billionitwealth@gmail.com), you will be able to sign in immediately.
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => switchView('signin')}
            >
              Return to Sign In
            </button>
          </div>
        )}

        {/* View: Sign In */}
        {view === 'signin' && (
          <>
            <div className="auth-tabs-row">
              <button
                type="button"
                className="auth-tab-btn active"
                onClick={() => {
                  clearFormInputs();
                  resetMessages();
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className="auth-tab-btn"
                onClick={() => switchView('create_account')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSignIn} className="login-form" autoComplete="off">
              <div className="login-input-group">
                <label className="login-input-label">Email Address</label>
                <div className="login-input-wrapper">
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="trader@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <div className="login-input-label-row">
                  <label className="login-input-label">Password</label>
                  <span
                    className="forgot-password-link"
                    onClick={() => {
                      clearFormInputs();
                      resetMessages();
                      setForgotStep('request');
                      setView('forgot_password');
                    }}
                  >
                    Forgot password?
                  </span>
                </div>
                <div className="login-input-wrapper">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {infoMessage && (
                <div className="login-info-alert">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="login-error-alert" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="login-submit-btn">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full anim-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </>
        )}

        {/* View: Create Account */}
        {view === 'create_account' && (
          <>
            <div className="auth-tabs-row">
              <button
                type="button"
                className="auth-tab-btn"
                onClick={() => switchView('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="auth-tab-btn active"
                onClick={() => {
                  clearFormInputs();
                  resetMessages();
                }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="login-form" autoComplete="off">
              <div className="login-input-group">
                <label className="login-input-label">Full Name</label>
                <div className="login-input-wrapper">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-input-label">Email Address</label>
                <div className="login-input-wrapper">
                  <input
                    type="email"
                    required
                    placeholder="trader@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-input-label">Create Password (min 6 chars)</label>
                <div className="login-input-wrapper">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-input-label">Confirm Password</label>
                <div className="login-input-wrapper">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="login-error-alert" role="alert">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="login-submit-btn">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full anim-spin" />
                    <span>Creating Account...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </>
        )}

        {/* View: Legacy Account Password Setup */}
        {view === 'legacy_setup' && (
          <form onSubmit={handleCompleteLegacySetup} className="login-form">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div className="login-logo-badge" style={{ margin: '0 auto 8px' }}>
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Verify & Set Up Password
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Existing authorized account detected for <strong>{email}</strong>. Enter verification code to set your password.
              </p>
            </div>

            <div className="login-input-group">
              <label className="login-input-label">6-Digit Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="login-input-field"
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 700 }}
                disabled={isLoading}
              />
            </div>

            <div className="login-input-group">
              <label className="login-input-label">New Password (min 6 chars)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input-field"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="login-input-group">
              <label className="login-input-label">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="login-input-field"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            {infoMessage && (
              <div className="login-info-alert">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="login-error-alert" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="login-submit-btn">
              {isLoading ? 'Verifying...' : 'Set Password & Enter Dashboard'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={() => switchView('signin')}
            >
              Back to Sign In
            </button>
          </form>
        )}

        {/* View: Forgot Password */}
        {view === 'forgot_password' && (
          <div className="login-form">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div className="login-logo-badge" style={{ margin: '0 auto 8px' }}>
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Reset Password
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {forgotStep === 'request'
                  ? 'Enter your registered email to receive a single-use verification code.'
                  : `Enter the 6-digit code sent for ${email} and choose a new password.`}
              </p>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleForgotPasswordRequest} className="login-form">
                <div className="login-input-group">
                  <label className="login-input-label">Registered Email Address</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="trader@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                  />
                </div>

                {errorMessage && (
                  <div className="login-error-alert" role="alert">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="login-submit-btn">
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="login-form">
                <div className="login-input-group">
                  <label className="login-input-label">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="login-input-field"
                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 700 }}
                    disabled={isLoading}
                  />
                </div>

                <div className="login-input-group">
                  <label className="login-input-label">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="login-input-group">
                  <label className="login-input-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-input-field"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                {infoMessage && (
                  <div className="login-info-alert">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="login-error-alert" role="alert">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="login-submit-btn">
                  {isLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginTop: '4px' }}
              onClick={() => switchView('signin')}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Security & Access Notice */}
        <div className="login-footer-note">
          <p>
            Role-Based Access Control enforced by Billionit Wealth backend services.
          </p>
        </div>
      </div>
    </div>
  );
};
