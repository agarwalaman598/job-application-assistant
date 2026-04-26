import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function GoogleSignInButton({ onSuccess, onError }) {
  const [busy, setBusy] = useState(false);
  const { loginWithGoogle } = useAuth();
  const isConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse) => {
    try {
      setBusy(true);
      const credential = credentialResponse?.access_token;
      if (!credential) {
        throw new Error('Google credential missing. Please try again.');
      }
      await loginWithGoogle(credential);
      onSuccess?.();
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Google sign-in failed. Please try again.';
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleSuccess,
    onError: () => onError?.(null),
    flow: 'implicit'
  });

  const triggerGoogleLogin = () => {
    if (!isConfigured) {
      onError?.('Google Sign-In is not configured yet. Add VITE_GOOGLE_CLIENT_ID in frontend .env.');
      return;
    }
    login();
  };

  const buttonStyle = {
    width: 'fit-content', // Only take up as much space as the text/icon
    margin: '0 auto',     // Center it horizontally
    padding: '0.625rem 1.5rem', // Nice comfortable padding
    borderRadius: '1rem', // Match "Sign in" rounded border
    border: '1px solid #2a2a2a',
    background: 'transparent', // Make it transparent like the inputs
    color: '#f3f3f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1.5, // Match standard line height
    opacity: busy ? 0.65 : 1,
    transition: 'background 0.15s',
    boxSizing: 'border-box',
  };

  // Sleek Monochrome Google G icon
  const MonochromeGoogleG = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  return (
    <button
      type="button"
      onClick={triggerGoogleLogin}
      style={buttonStyle}
      onMouseOver={(e) => {
        if (!busy) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseOut={(e) => {
        if (!busy) e.currentTarget.style.background = 'transparent';
      }}
    >
      {MonochromeGoogleG}
      <span>{busy ? 'Signing in…' : 'Continue with Google'}</span>
    </button>
  );
}
