import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, Eye, EyeOff, LogOut, CheckCircle, Shield } from 'lucide-react';
import { registerUser, loginUser, logoutUser } from './api.js';

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess, onLogout, notify }) {
  const [mode, setMode] = useState('signin'); // 'signin', 'register', 'profile'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (user) {
        setMode('profile');
      } else {
        setMode('signin');
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSignIn(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({ email: email.trim(), password });
      onAuthSuccess(res.user, res.token);
      notify(`Welcome back, ${res.user.displayName || 'Foodie'}!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters long.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        bio: bio.trim()
      });
      onAuthSuccess(res.user, res.token);
      notify(`Welcome to TasteTrail, ${res.user.displayName}!`);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount() {
    setEmail('demo@tastetrail.com');
    setPassword('DemoPassword123!');
    setError('');
  }

  function handleSignOut() {
    logoutUser();
    onLogout();
    notify('You have been signed out.');
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-heading">
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        {user ? (
          <div className="profile-card">
            <div className="profile-header">
              <div className="avatar-circle">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <h2 id="auth-heading">{user.displayName}</h2>
              <span className="profile-role">
                {user.role === 'admin' ? (
                  <>
                    <Shield size={14} /> Administrator
                  </>
                ) : (
                  'Community Chef'
                )}
              </span>
            </div>

            <div className="profile-details">
              <div className="detail-item">
                <small>Email</small>
                <span>{user.email}</span>
              </div>
              {user.bio && (
                <div className="detail-item">
                  <small>Bio</small>
                  <p>{user.bio}</p>
                </div>
              )}
              {user.createdAt && (
                <div className="detail-item">
                  <small>Member Since</small>
                  <span>{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button className="outline-button full-button" onClick={handleSignOut}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="auth-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'signin'}
                className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
              >
                Sign In
              </button>
              <button
                role="tab"
                aria-selected={mode === 'register'}
                className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Create Account
              </button>
            </div>

            <h2 id="auth-heading" className="auth-title">
              {mode === 'signin' ? 'Welcome back to TasteTrail' : 'Join the TasteTrail Community'}
            </h2>
            <p className="auth-subtitle">
              {mode === 'signin'
                ? 'Sign in to access your custom recipes, favorites and meal plans.'
                : 'Create an account to save your recipes and build personalized plans.'}
            </p>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {mode === 'signin' ? (
              <form onSubmit={handleSignIn} className="auth-form">
                <label className="auth-field">
                  <span>Email address</span>
                  <div className="input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>Password</span>
                  <div className="input-wrap">
                    <Lock size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="primary-button full-button" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>

                <div className="auth-helper">
                  <span>Testing the app?</span>
                  <button type="button" className="text-link" onClick={fillDemoAccount}>
                    Use demo credentials
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="auth-form">
                <label className="auth-field">
                  <span>Your Name</span>
                  <div className="input-wrap">
                    <User size={16} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Chef Maria"
                      required
                      autoComplete="name"
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>Email address</span>
                  <div className="input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </label>

                <label className="auth-field">
                  <span>Password</span>
                  <div className="input-wrap">
                    <Lock size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      autoComplete="new-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="auth-field">
                  <span>Bio (optional)</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about what you love to cook..."
                    rows={2}
                  />
                </label>

                <button type="submit" className="primary-button full-button" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
