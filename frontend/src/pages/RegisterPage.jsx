import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail } from 'lucide-react';

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
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [registered, setRegistered]   = useState(false);
  const [devLink, setDevLink]         = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPwd) { setError('Passwords do not match.'); return; }
    setError(''); setLoading(true);
    try {
      const data = await register(email, password, fullName);
      setRegistered(true);
      if (data?.dev_link) setDevLink(data.dev_link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  const focus = (e) => { e.target.style.borderColor = 'var(--primary)'; };
  const blur  = (e) => { e.target.style.borderColor = 'var(--border)'; };

  // ── Post-registration screen ──────────────────────────────────────────────
  if (registered) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
          {devLink ? (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Dev mode — email not sent</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem', marginBottom: '14px', lineHeight: '1.6', textAlign: 'left' }}>
                Account created. Use the link below to verify:
              </p>
              <a href={devLink} style={{
                display: 'block', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: 'var(--primary)',
                wordBreak: 'break-all', textDecoration: 'none', textAlign: 'left', marginBottom: '16px',
              }}>
                {devLink}
              </a>
              <Link to="/login" style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem' }}>Go to login →</Link>
            </>
          ) : (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.12)', marginBottom: 16 }}>
                <Mail size={28} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Check your email</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
                We sent a verification link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>.<br />
                Click it to activate your account, then sign in.
              </p>
              <Link to="/login" style={{
                display: 'inline-block', padding: '10px 28px',
                background: '#1f1f1f', color: 'var(--foreground)', border: '1px solid #2e2e2e',
                borderRadius: '9999px', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none',
              }}>
                Go to login
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '1.5rem' }}>
      {/* Title above card */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Join JobAssist AI
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
          Create your account to start tracking
        </p>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="John Doe" required style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={8} style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.35rem', paddingLeft: '6px' }}>
              Must be at least 8 characters
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={LABEL_STYLE}>Confirm Password</label>
            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
              placeholder="••••••••" required style={INPUT_STYLE} onFocus={focus} onBlur={blur} />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px',
            background: loading ? 'var(--muted)' : '#1f1f1f',
            color: 'var(--foreground)', border: '1px solid #2e2e2e',
            borderRadius: '9999px', fontWeight: 700, fontSize: '0.95rem',
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}
            onMouseOver={e => e.target.style.color = 'var(--foreground)'}
            onMouseOut={e => e.target.style.color = 'var(--muted-foreground)'}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
