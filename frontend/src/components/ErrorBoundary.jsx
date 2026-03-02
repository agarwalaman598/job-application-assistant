import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--background)', padding: '2rem',
      }}>
        <div style={{
          width: '100%', maxWidth: '460px',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center',
        }}>
          {/* Error icon */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(239,68,68,0.1)', marginBottom: '1.5rem',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#f87171" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h1 style={{
            fontSize: '1.35rem', fontWeight: 700, color: 'var(--foreground)',
            marginBottom: '0.6rem', letterSpacing: '-0.02em',
          }}>
            Something went wrong
          </h1>
          <p style={{
            fontSize: '0.85rem', color: 'var(--muted-foreground)',
            lineHeight: '1.65', marginBottom: '2rem',
          }}>
            An unexpected error occurred. Try refreshing the page — if the problem
            persists, please contact support.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: '9999px', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                color: 'var(--foreground)', background: '#1f1f1f', border: '1px solid #2e2e2e',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.opacity = '0.75'}
              onMouseOut={e => e.currentTarget.style.opacity = '1'}
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/dashboard';
              }}
              style={{
                padding: '10px 24px', borderRadius: '9999px', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                color: 'var(--muted-foreground)', background: 'transparent',
                border: '1px solid var(--border)', transition: 'color 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--foreground)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--muted-foreground)'}
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
          JobAssist AI
        </p>
      </div>
    );
  }
}
