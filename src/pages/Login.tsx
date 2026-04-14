import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, TrendingUp, BarChart3, Shield } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name || 'Trader');
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      switch (firebaseErr.code) {
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid email or password');
          break;
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        default:
          setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-logo">
            <TrendingUp size={28} />
          </div>
          <h1>Trader's Journal</h1>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon">
              <BarChart3 size={20} />
            </div>
            <div>
              <strong>Track Every Trade</strong>
              <span>Record and analyze your trading performance with detailed analytics</span>
            </div>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">
              <TrendingUp size={20} />
            </div>
            <div>
              <strong>Grow Consistently</strong>
              <span>Identify edge setups and eliminate costly mistakes from your trading</span>
            </div>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon">
              <Shield size={20} />
            </div>
            <div>
              <strong>Secure & Private</strong>
              <span>Your trading data is encrypted and stored securely per account</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <p>{isRegister ? 'Start your trading journal today' : 'Log in to your trading journal'}</p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <div className="login-field">
                <label>Full Name</label>
                <div className="login-input-wrap">
                  <User size={16} className="login-input-icon" />
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="login-field">
              <label>Email</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="login-eye-btn" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="login-field">
                <label>Confirm Password</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <div className="login-switch">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button type="button" onClick={() => { setIsRegister(v => !v); setError(''); }}>
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
