import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
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

  const handleGoogleSuccess = () => {
    const next = getSafeNextPath(searchParams.get('next'));
    navigate(next, { replace: true });
  };

  const handleGoogleError = (msg) => {
    if (!msg) return; // null = user cancelled the popup — don't show an error
    setError(msg);
    setMessage('');
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

  const focus = (e) => {
    e.target.style.borderColor = 'var(--primary)';
  };

  const blur = (e) => {
    e.target.style.borderColor = 'var(--border)';
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 16px',
    background: 'var(--input)',
    border: '1px solid var(--border)',
    borderRadius: '9999px',
    color: 'var(--foreground)',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--foreground)',
    marginBottom: '0.5rem',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(900px 420px at -20% -10%, rgba(99,102,241,0.16), transparent), radial-gradient(800px 340px at 120% 110%, rgba(99,102,241,0.12), transparent), var(--background)',
        padding: '1.5rem',
      }}
    >
      <Helmet><title>Login | JobAssist AI</title></Helmet>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{ textAlign: 'center', marginBottom: '1.2rem' }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          JobAssist AI
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
          Track your job applications effortlessly
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              gap: '0.5rem',
              padding: '4px',
              background: 'var(--muted)',
              borderRadius: '9999px',
            }}
          >
            <button
              type="button"
              style={{
                padding: '8px 24px',
                background: '#202020',
                color: 'var(--foreground)',
                border: '1px solid #2e2e2e',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'default',
                fontFamily: 'inherit',
              }}
            >
              Sign in
            </button>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 24px',
                background: 'transparent',
                color: 'var(--muted-foreground)',
                border: '1px solid transparent',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
              className="hover-link"
            >
              Sign up
            </Link>
          </div>
        </div>

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
            <label style={labelStyle}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="rahul.sharma@example.in" required autoFocus
              style={inputStyle}
              onFocus={focus}
              onBlur={blur}
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
                style={{ ...inputStyle, paddingRight: '42px' }}
                onFocus={focus}
                onBlur={blur}
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

        <div style={{ marginTop: '1.1rem', marginBottom: '0.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.9rem', letterSpacing: '0.06em', color: '#b7b7b7' }}>OR</span>
            <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        </div>

      </motion.div>
    </motion.div>
  );
}

