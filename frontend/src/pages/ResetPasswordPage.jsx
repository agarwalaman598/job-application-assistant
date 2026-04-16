import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { KeyRound, Loader2, CheckCircle, Eye } from 'lucide-react';

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '24px' }}>
      <Helmet><title>Reset Password | JobAssist AI</title></Helmet>
      <div className="card p-8 animate-enter" style={{ maxWidth: '400px', width: '100%' }}>
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Password Reset!</h2>
            <p style={{ color: '#8b8b92', fontSize: '0.85rem', marginBottom: '20px' }}>You can now log in with your new password.</p>
            <button onClick={() => navigate('/login')} className="btn-primary" style={{ width: '100%' }}>Log In</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <KeyRound size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Set New Password</h2>
            </div>
            <p style={{ color: '#8b8b92', fontSize: '0.8rem', marginBottom: '20px' }}>Must be at least 8 characters.</p>

            {!token && (
              <p style={{ color: '#d94f4f', fontSize: '0.8rem', marginBottom: '12px' }}>
                Invalid link — no reset token found. Please use the link from your email.
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b8b92', marginBottom: '4px' }}>New Password</label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field" placeholder="New password" required style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }} />
                <button type="button"
                  aria-label="Hold to show password"
                  title="Hold to show password"
                  className="icon-btn"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5a5a63', padding: 0, display: 'flex', alignItems: 'center' }}
                  {...holdShowHandlers(setShowPassword)}>
                  <Eye size={14} />
                </button>
              </div>

              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b8b92', marginBottom: '4px' }}>Confirm Password</label>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="input-field" placeholder="Confirm new password" required style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px' }} />
                <button type="button"
                  aria-label="Hold to show confirm password"
                  title="Hold to show confirm password"
                  className="icon-btn"
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5a5a63', padding: 0, display: 'flex', alignItems: 'center' }}
                  {...holdShowHandlers(setShowConfirmPassword)}>
                  <Eye size={14} />
                </button>
              </div>

              {error && <p style={{ color: '#d94f4f', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</p>}

              <button type="submit" disabled={loading || !token} className="btn-primary flex items-center gap-2" style={{ width: '100%' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
