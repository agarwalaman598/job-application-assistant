import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setError('');
    const startedAt = Date.now();
    try {
      const res = await api.post('/auth/forgot-password', { email });
      const elapsed = Date.now() - startedAt;
      const minVisibleMs = 800;
      if (elapsed < minVisibleMs) {
        await new Promise((resolve) => setTimeout(resolve, minVisibleMs - elapsed));
      }
      setSent(true);
      if (res.data.dev_link) setDevLink(res.data.dev_link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 16px',
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
      <Helmet><title>Forgot Password | JobAssist AI</title></Helmet>
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
        <button onClick={() => navigate('/login')} className="text-btn"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', marginBottom: '20px', padding: 0 }}>
          <ArrowLeft size={14} /> Back to Sign in
        </button>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: devLink ? '#d4942e' : '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              {devLink ? '⚠️ Dev Mode — Email not sent' : 'Check your inbox'}
            </h2>
            {devLink ? (
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Resend sandbox can only deliver to your Resend account email.<br/>
                  Use this link directly to test the reset flow:
                </p>
                <a href={devLink} className="hover-link-primary" style={{
                  display: 'block', background: 'rgba(212,148,46,0.08)', border: '1px solid rgba(212,148,46,0.2)',
                  borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#d4942e',
                  wordBreak: 'break-all', textDecoration: 'none',
                }}>
                  {devLink}
                </a>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.72rem', marginTop: '10px' }}>
                  To fix this: verify a domain at resend.com/domains and update RESEND_FROM_EMAIL in .env
                </p>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '16px' }}>
                  If <strong style={{ color: 'var(--foreground)' }}>{email}</strong> is registered, you'll receive a reset link within a few minutes.
                </p>
                {/* Spam notice */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: 'rgba(212,148,46,0.07)', border: '1px solid rgba(212,148,46,0.2)',
                  borderRadius: '10px', padding: '10px 14px', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>📬</span>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#a07830', lineHeight: '1.55' }}>
                    <strong style={{ color: '#d4942e' }}>Can't find the email?</strong> Check your{' '}
                    <strong style={{ color: '#d4942e' }}>spam or junk folder</strong> — it may have been filtered automatically.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Mail size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Forgot Password</h2>
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8rem', marginBottom: '20px' }}>
              Enter your account email and we'll send a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--foreground)', marginBottom: '8px', fontWeight: 600 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="rahul.sharma@example.in" required style={{ ...inputStyle, marginBottom: '12px' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              {error && <p style={{ color: '#d94f4f', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
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
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
