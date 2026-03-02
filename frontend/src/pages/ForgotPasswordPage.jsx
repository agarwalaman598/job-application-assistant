import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

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
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (res.data.dev_link) setDevLink(res.data.dev_link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '24px' }}>
      <Helmet><title>Forgot Password | JobAssist AI</title></Helmet>
      <div className="card p-8 animate-enter" style={{ maxWidth: '400px', width: '100%' }}>
        <button onClick={() => navigate('/login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a5a63', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', marginBottom: '20px', padding: 0 }}>
          <ArrowLeft size={14} /> Back to Login
        </button>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={44} style={{ color: devLink ? '#d4942e' : '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              {devLink ? '⚠️ Dev Mode — Email not sent' : 'Check your inbox'}
            </h2>
            {devLink ? (
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: '#8b8b92', fontSize: '0.82rem', marginBottom: '12px', lineHeight: '1.5' }}>
                  Resend sandbox can only deliver to your Resend account email.<br/>
                  Use this link directly to test the reset flow:
                </p>
                <a href={devLink} style={{
                  display: 'block', background: 'rgba(212,148,46,0.08)', border: '1px solid rgba(212,148,46,0.2)',
                  borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#d4942e',
                  wordBreak: 'break-all', textDecoration: 'none',
                }}>
                  {devLink}
                </a>
                <p style={{ color: '#5a5a63', fontSize: '0.72rem', marginTop: '10px' }}>
                  To fix this: verify a domain at resend.com/domains and update RESEND_FROM_EMAIL in .env
                </p>
              </div>
            ) : (
              <>
                <p style={{ color: '#8b8b92', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '16px' }}>
                  If <strong style={{ color: '#ececed' }}>{email}</strong> is registered, you'll receive a reset link within a few minutes.
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
            <p style={{ color: '#8b8b92', fontSize: '0.8rem', marginBottom: '20px' }}>
              Enter your account email and we'll send a reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b8b92', marginBottom: '4px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required style={{ marginBottom: '12px' }} />
              {error && <p style={{ color: '#d94f4f', fontSize: '0.78rem', marginBottom: '10px' }}>{error}</p>}
              <button type="submit" disabled={loading || !email.trim()} className="btn-primary flex items-center gap-2" style={{ width: '100%' }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
