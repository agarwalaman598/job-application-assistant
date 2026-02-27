import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Zap, Mail } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [devLink, setDevLink] = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(email, password, fullName);
      setRegistered(true);
      if (data?.dev_link) setDevLink(data.dev_link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Post-registration screen ──────────────────────────────────────────────
  if (registered) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111113', padding: '1.5rem' }}>
        <div className="card p-8 animate-enter" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          {devLink ? (
            <>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Dev Mode — Email not sent</h2>
              <p style={{ color: '#8b8b92', fontSize: '0.82rem', marginBottom: '14px', lineHeight: '1.5', textAlign: 'left' }}>
                Account created! Resend sandbox can't deliver to this email.<br />
                Click the link below to verify your account:
              </p>
              <a href={devLink} style={{
                display: 'block', background: 'rgba(212,148,46,0.08)', border: '1px solid rgba(212,148,46,0.2)',
                borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#d4942e',
                wordBreak: 'break-all', textDecoration: 'none', textAlign: 'left', marginBottom: '12px',
              }}>
                {devLink}
              </a>
              <p style={{ color: '#5a5a63', fontSize: '0.72rem', marginBottom: '16px' }}>
                To fix: verify a domain at resend.com/domains and update RESEND_FROM_EMAIL in .env
              </p>
              <Link to="/login" style={{ color: '#d4942e', fontSize: '0.85rem', fontWeight: 500 }}>Go to Login →</Link>
            </>
          ) : (
            <>
              <Mail size={44} style={{ color: '#d4942e', margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Verify your email</h2>
              <p style={{ color: '#8b8b92', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
                We sent a verification link to <strong style={{ color: '#ececed' }}>{email}</strong>.<br />
                Click it to activate your account, then log in.
              </p>
              <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 24px' }}>
                Go to Login
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111113', padding: '1.5rem' }}>
      <div className="animate-enter" style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Zap size={28} style={{ color: '#d4942e', marginBottom: '0.75rem' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ececed', letterSpacing: '-0.02em' }}>
            Create your account
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '0.35rem' }}>
            Start streamlining your job applications
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: '1rem', borderRadius: '8px', fontSize: '0.8rem',
            background: 'rgba(217, 79, 79, 0.08)', border: '1px solid rgba(217, 79, 79, 0.2)', color: '#d94f4f',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#8b8b92', marginBottom: '6px' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="input-field" placeholder="Jane Doe" required />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#8b8b92', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#8b8b92', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="••••••••" required minLength={8} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <UserPlus size={16} />
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#5a5a63' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: '#d4942e', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
