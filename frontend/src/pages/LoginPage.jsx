import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function getSafeNextPath(rawNext) {
  if (!rawNext) return '/dashboard';
  if (!rawNext.startsWith('/')) return '/dashboard';
  if (rawNext.startsWith('//')) return '/dashboard';
  if (rawNext.startsWith('/login')) return '/dashboard';
  if (rawNext.startsWith('/register')) return '/dashboard';
  return rawNext;
}

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (sessionStorage.getItem('sessionExpired')) {
      sessionStorage.removeItem('sessionExpired');
      setError('Your session has expired. Please sign in again.');
    }
  }, []);

  const unverifiedError = error.toLowerCase().includes('verify');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(''); setMessage(''); setLoading(true);
    const startedAt = Date.now();
    try {
      await login(email, password);
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      const next = getSafeNextPath(searchParams.get('next'));
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || (err.response ? 'Invalid credentials' : 'Network error — please check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setError('Enter your email above first.'); return; }
    setError(''); setMessage(''); setResending(true);
    try {
      const res = await api.post('/auth/send-verification', { email });
      setMessage(res.data?.detail || 'Verification email sent. Check your inbox.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not resend. Please try again.');
    } finally { setResending(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: '1.5rem',
    }}>
      <Helmet><title>Login | JobAssist AI</title></Helmet>
      {/* Title above card */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          JobAssist AI
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
          Track your job applications effortlessly
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '2rem',
      }}>
        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
          }}>
            {error}
            {unverifiedError && (
              <button type="button" onClick={handleResend} disabled={resending} className="text-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', background: 'none', border: 'none', padding: 0,
                  color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', opacity: resending ? 0.5 : 1 }}>
                {resending && <Loader2 size={12} className="animate-spin" />}
                {resending ? 'Sending…' : 'Resend verification email →'}
              </button>
            )}
          </div>
        )}

        {/* Success */}
        {message && (
          <div style={{
            marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus
              style={{
                width: '100%', padding: '10px 16px',
                background: 'var(--input)', border: '1px solid var(--border)',
                borderRadius: '9999px', color: 'var(--foreground)',
                fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Password
              </label>
              <Link to="/forgot-password" className="hover-link" style={{ fontSize: '0.78rem', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: '100%', padding: '10px 42px 10px 16px',
                  background: 'var(--input)', border: '1px solid var(--border)',
                  borderRadius: '9999px', color: 'var(--foreground)',
                  fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                aria-label="Hold to show password"
                title="Hold to show password"
                className="icon-btn"
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                  padding: 0, display: 'flex', alignItems: 'center',
                }}
                onPointerDown={() => setShowPassword(true)}
                onPointerUp={() => setShowPassword(false)}
                onPointerLeave={() => setShowPassword(false)}
                onPointerCancel={() => setShowPassword(false)}
                onBlur={() => setShowPassword(false)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') setShowPassword(true);
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') setShowPassword(false);
                }}
              >
                <Eye size={15} />
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="btn-lift" style={{
            width: '100%', padding: '11px',
            background: loading ? 'var(--muted)' : '#1f1f1f',
            color: 'var(--foreground)', border: '1px solid #2e2e2e',
            borderRadius: '9999px', fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Signing in…
              </>
            ) : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="hover-link" style={{ textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

