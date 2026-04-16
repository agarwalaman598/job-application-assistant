import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { KeyRound, Loader2, CheckCircle, Eye } from 'lucide-react';
import { motion } from 'motion/react';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const token = params.get('token') || '';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    const startedAt = Date.now();
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 40px 10px 16px',
    background: 'var(--input)',
    border: '1px solid var(--border)',
    borderRadius: '9999px',
    color: 'var(--foreground)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(900px 420px at -20% -10%, rgba(99,102,241,0.16), transparent), radial-gradient(800px 340px at 120% 110%, rgba(99,102,241,0.12), transparent), var(--background)',
        padding: '24px',
      }}
    >
      <Helmet><title>Reset Password | JobAssist AI</title></Helmet>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          maxWidth: '420px',
          width: '100%',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.8rem',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Password Reset!</h2>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', marginBottom: '20px' }}>You can now log in with your new password.</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-lift"
              style={{
                width: '100%',
                padding: '11px',
                background: '#1f1f1f',
                color: 'var(--foreground)',
                border: '1px solid #2e2e2e',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Log In
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <KeyRound size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Set New Password</h2>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '20px' }}>Must be at least 8 characters.</p>

            {!token && (
              <p style={{ color: '#d94f4f', fontSize: '0.8rem', marginBottom: '12px' }}>
                Invalid link — no reset token found. Please use the link from your email.
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground)', marginBottom: '8px', fontWeight: 600 }}>New Password</label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="New password" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <button type="button"
                  aria-label="Hold to show password"
                  title="Hold to show password"
                  className="icon-btn"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0, display: 'flex', alignItems: 'center' }}
                  {...holdShowHandlers(setShowPassword)}>
                  <Eye size={14} />
                </button>
              </div>

              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground)', marginBottom: '8px', fontWeight: 600 }}>Confirm Password</label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                <button type="button"
                  aria-label="Hold to show confirm password"
                  title="Hold to show confirm password"
                  className="icon-btn"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0, display: 'flex', alignItems: 'center' }}
                  {...holdShowHandlers(setShowConfirmPassword)}>
                  <Eye size={14} />
                </button>
              </div>

              {error && <p style={{ color: '#d94f4f', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading || !token}
                className="btn-lift"
                style={{
                  width: '100%',
                  padding: '11px',
                  background: loading ? 'var(--muted)' : '#1f1f1f',
                  color: 'var(--foreground)',
                  border: '1px solid #2e2e2e',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading || !token ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
