import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '24px' }}>
      <Helmet><title>Verify Email | JobAssist AI</title></Helmet>
      <div className="card p-10 animate-enter" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)', margin: '0 auto 16px' }} />
            <p style={{ color: '#8b8b92' }}>Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={44} style={{ color: '#3eb370', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Email Verified!</h2>
            <p style={{ color: '#8b8b92', marginBottom: '24px' }}>{message}</p>
            <button onClick={() => navigate('/login')} className="btn-primary" style={{ width: '100%' }}>
              Log In
            </button>
          </>
        )}
        {(status === 'error' || status === 'missing') && (
          <>
            <XCircle size={44} style={{ color: '#d94f4f', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Verification Failed</h2>
            <p style={{ color: '#8b8b92', marginBottom: '24px' }}>
              {status === 'missing' ? 'No verification token found in the link.' : message}
            </p>
            <button onClick={() => navigate('/login')} className="btn-secondary" style={{ width: '100%' }}>
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
