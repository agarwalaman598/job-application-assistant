import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Zap } from 'lucide-react';
import api from '../api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const unverifiedError = error.toLowerCase().includes('verify');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError('Enter your email above, then click resend verification.');
      return;
    }

    setResending(true);
    try {
      const res = await api.post('/auth/send-verification', { email });
      setMessage(res.data?.detail || 'Verification email sent. Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111113',
      padding: '1.5rem',
    }}>
      <div className="animate-enter" style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Zap size={28} style={{ color: '#d4942e', marginBottom: '0.75rem' }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ececed', letterSpacing: '-0.02em' }}>
            Sign in to JobAssist
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#5a5a63', marginTop: '0.35rem' }}>
            Your AI-powered application assistant
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', marginBottom: '1rem', borderRadius: '8px', fontSize: '0.8rem',
            background: 'rgba(217, 79, 79, 0.08)', border: '1px solid rgba(217, 79, 79, 0.2)', color: '#d94f4f',
          }}>
            {error}
            {unverifiedError && (
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    color: '#d4942e',
                    fontSize: '0.78rem',
                    cursor: resending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resending ? 'Sending verification email...' : 'Resend verification email →'}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div style={{
            padding: '10px 14px', marginBottom: '1rem', borderRadius: '8px', fontSize: '0.8rem',
            background: 'rgba(55, 154, 108, 0.12)', border: '1px solid rgba(55, 154, 108, 0.28)', color: '#7fd4ae',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#8b8b92', marginBottom: '6px' }}>
              Email
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#8b8b92' }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#5a5a63', textDecoration: 'none' }}
                onMouseOver={e => e.target.style.color='#d4942e'} onMouseOut={e => e.target.style.color='#5a5a63'}>
                Forgot password?
              </Link>
            </div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#5a5a63' }}>
          No account?{' '}
          <Link to="/register" style={{ color: '#d4942e', textDecoration: 'none', fontWeight: 500 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
