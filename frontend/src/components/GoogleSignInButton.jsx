import { GoogleLogin } from '@react-oauth/google';
import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function GoogleSignInButton({ onSuccess, onError }) {
  const [busy, setBusy] = useState(false);
  const googleButtonHostRef = useRef(null);
  const { loginWithGoogle } = useAuth();
  const isConfigured = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse) => {
    try {
      setBusy(true);
      const credential = credentialResponse?.credential;
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

  const triggerGoogleLogin = () => {
    const button = googleButtonHostRef.current?.querySelector('button, div[role="button"]');
    if (!button) {
      onError?.('Google Sign-In is still loading. Please try again.');
      return;
    }
    button.click();
  };

  const buttonStyle = {
    width: 'fit-content',
    margin: '0 auto',
    padding: '9px 20px',
    borderRadius: '9999px',
    border: '1px solid #2a2a2a',
    background: '#101114',
    color: '#f3f3f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    fontSize: '0.875rem',
    letterSpacing: '0.01em',
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1,
    opacity: busy ? 0.65 : 1,
    transition: 'opacity 0.15s, background 0.15s',
    boxSizing: 'border-box',
  };

  // Official Google G four-colour SVG logo
  const GoogleG = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );

  return (
    <div style={{ width: '100%', pointerEvents: busy ? 'none' : 'auto' }}>
      {isConfigured ? (
        <>
          {/* Hidden real Google button — needed to trigger the actual OAuth popup */}
          <div
            ref={googleButtonHostRef}
            style={{ position: 'absolute', left: '-99999px', top: 0, width: 0, height: 0, overflow: 'hidden' }}
          >
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => {
                // @react-oauth/google fires onError both for genuine failures AND silent
                // popup-closed-by-user events. Pass null so parents can ignore cancels.
                onError?.(null);
              }}
              useOneTap={false}
              text="signin_with"
              shape="pill"
              theme="filled_black"
              size="large"
            />
          </div>

          <button type="button" onClick={triggerGoogleLogin} style={buttonStyle}>
            {GoogleG}
            <span>{busy ? 'Signing in…' : 'Continue with Google'}</span>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onError?.('Google Sign-In is not configured yet. Add VITE_GOOGLE_CLIENT_ID in frontend .env.')}
          style={buttonStyle}
        >
          {GoogleG}
          <span>Continue with Google</span>
        </button>
      )}
    </div>
  );
}
