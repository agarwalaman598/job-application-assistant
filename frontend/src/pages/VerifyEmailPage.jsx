import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'missing'); // loading | success | error | missing
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    api.get(`/auth/verify-email?token=${token}`)
      .then(res => {
        setStatus('success');
        setMessage(res.data.detail);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.');
      });
  }, [token]);

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
      <Helmet><title>Verify Email | JobAssist AI</title></Helmet>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '2rem',
        }}
      >
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--muted-foreground)' }}>Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={44} style={{ color: '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Email Verified!</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>{message}</p>
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
          </>
        )}
        {(status === 'error' || status === 'missing') && (
          <>
            <XCircle size={44} style={{ color: '#d94f4f', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Verification Failed</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '24px' }}>
              {status === 'missing' ? 'No verification token found in the link.' : message}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-lift"
              style={{
                width: '100%',
                padding: '11px',
                background: 'transparent',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
