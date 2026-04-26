import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Mail, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import GoogleSignInButton from '../components/GoogleSignInButton';

const INPUT_STYLE = {
  width: '100%', padding: '10px 16px',
  background: 'var(--input)', border: '1px solid var(--border)',
  borderRadius: '9999px', color: 'var(--foreground)',
  fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const LABEL_STYLE = {
  display: 'block', fontSize: '0.875rem', fontWeight: 600,
  color: 'var(--foreground)', marginBottom: '0.5rem',
};

export default function RegisterPage() {
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [registered, setRegistered]   = useState(false);
  const [devLink, setDevLink]         = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirmPwd) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    const startedAt = Date.now();
    try {
      const data = await register(email, password, fullName);
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setRegistered(true);
      if (data?.dev_link) setDevLink(data.dev_link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const focus = (e) => { e.target.style.borderColor = 'var(--primary)'; };
  const blur  = (e) => { e.target.style.borderColor = 'var(--border)'; };

  const holdShowHandlers = (setter) => ({
    onPointerDown: () => setter(true),
    onPointerUp: () => setter(false),
    onPointerLeave: () => setter(false),
    onPointerCancel: () => setter(false),
    onBlur: () => setter(false),
    onKeyDown: (e) => {
      if (e.key === ' ' || e.key === 'Enter') setter(true);
    },
    onKeyUp: (e) => {
      if (e.key === ' ' || e.key === 'Enter') setter(false);
    },
  });

  const handleGoogleSuccess = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleGoogleError = (msg) => {
    if (!msg) return; // null = user cancelled the popup — don't show an error
    setError(msg);
  };

  // ── Post-registration screen ──────────────────────────────────────────────
  if (registered) {
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
        <Helmet><title>Register | JobAssist AI</title></Helmet>
        <div style={{ width: '100%', maxWidth: '420px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
          {devLink ? (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Dev mode — email not sent</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem', marginBottom: '14px', lineHeight: '1.6', textAlign: 'left' }}>
                Account created. Use the link below to verify:
              </p>
              <a href={devLink} className="hover-link-primary" style={{
                display: 'block', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--primary)',
                wordBreak: 'break-all', textDecoration: 'none', textAlign: 'left', marginBottom: '16px',
              }}>
                {devLink}
              </a>
              <Link to="/login" className="hover-link" style={{ fontSize: '0.85rem' }}>Go to login →</Link>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.12)', marginBottom: 16 }}>
                <Mail size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Check your email</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '16px' }}>
                We sent a verification link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>.<br />
                Click it to activate your account, then sign in.
              </p>
              {/* Spam notice */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(212,148,46,0.07)', border: '1px solid rgba(212,148,46,0.2)',
                borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', textAlign: 'left',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>📬</span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#a07830', lineHeight: '1.55' }}>
                  <strong style={{ color: '#d4942e' }}>Can't find the email?</strong> Check your{' '}
                  <strong style={{ color: '#d4942e' }}>spam or junk folder</strong> — transactional
                  emails sometimes land there. Mark it as "Not spam" to receive future emails in your inbox.
                </p>
              </div>
              <Link to="/login" className="btn-lift" style={{
                display: 'inline-block', padding: '10px 28px',
                background: '#1f1f1f', color: 'var(--foreground)', border: '1px solid #2e2e2e',
                borderRadius: '9999px', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none',
              }}>
                Go to login
              </Link>
            </>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
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
      <Helmet><title>Register | JobAssist AI</title></Helmet>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        style={{ textAlign: 'center', marginBottom: '1rem' }}
      >
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Join JobAssist AI
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
          Create your account to start tracking
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        style={{ width: '100%', maxWidth: '420px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.35rem' }}
      >
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              gap: '0.5rem',
              padding: '4px',
              background: 'var(--muted)',
              borderRadius: '9999px',
            }}
          >
            <Link
              to="/login"
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
              Sign in
            </Link>
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
              Sign up
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Rahul Sharma" required style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="rahul.sharma@example.in" required style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={8}
                style={{ ...INPUT_STYLE, paddingRight: '42px' }} onFocus={focus} onBlur={blur} />
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
                {...holdShowHandlers(setShowPassword)}
              >
                <Eye size={15} />
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.35rem', paddingLeft: '6px' }}>
              Must be at least 8 characters
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={LABEL_STYLE}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="••••••••" required
                style={{ ...INPUT_STYLE, paddingRight: '42px' }} onFocus={focus} onBlur={blur} />
              <button
                type="button"
                aria-label="Hold to show confirm password"
                title="Hold to show confirm password"
                className="icon-btn"
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                  padding: 0, display: 'flex', alignItems: 'center',
                }}
                {...holdShowHandlers(setShowConfirmPassword)}
              >
                <Eye size={15} />
              </button>
            </div>
          </div>

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
                Creating account…
              </>
            ) : 'Create account'}
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
