import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

const CHECK_INTERVAL_MS = 5000;
const BACKGROUND_CHECK_INTERVAL_MS = 15000;
const CHECK_TIMEOUT_MS = 4000;
const NETWORK_ERROR_EVENT = 'app:network-error';

export default function NetworkStatusModal() {
  const [open, setOpen] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [checking, setChecking] = useState(false);
  const checkInFlightRef = useRef(false);

  const probeUrl = useMemo(() => {
    const raw = import.meta.env.VITE_API_URL || '/api';
    return raw.replace(/\/+$/, '') || '/api';
  }, []);

  const checkConnectivity = useCallback(async () => {
    if (checkInFlightRef.current) return;
    checkInFlightRef.current = true;
    setChecking(true);

    if (!navigator.onLine) {
      setOpen(true);
      setChecking(false);
      checkInFlightRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      // Any HTTP response (including 401/404) means network + server path is reachable.
      await fetch(`${probeUrl}?_net=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        signal: controller.signal,
      });
      setOpen(false);
    } catch {
      setOpen(true);
    } finally {
      clearTimeout(timer);
      setChecking(false);
      checkInFlightRef.current = false;
    }
  }, [probeUrl]);

  useEffect(() => {
    const onOffline = () => setOpen(true);
    const onOnline = () => { void checkConnectivity(); };
    const onNetworkError = () => setOpen(true);

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener(NETWORK_ERROR_EVENT, onNetworkError);

    if (!navigator.onLine) {
      setOpen(true);
    } else {
      void checkConnectivity();
    }

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(NETWORK_ERROR_EVENT, onNetworkError);
    };
  }, [checkConnectivity]);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      if (navigator.onLine) {
        void checkConnectivity();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [open, checkConnectivity]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!open && navigator.onLine) {
        void checkConnectivity();
      }
    }, BACKGROUND_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [open, checkConnectivity]);

  if (!open) return null;

  return (
    <div
      className="animate-modal-bg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="animate-modal"
        style={{
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          padding: '22px 22px 18px',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            marginBottom: 14,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WifiOff size={20} style={{ color: '#f87171' }} />
        </div>

        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
          Cannot Connect To The Internet
        </p>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted-foreground)', lineHeight: 1.55 }}>
          Please check your connection. We will automatically reconnect when your internet is back.
        </p>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            {navigator.onLine ? 'Trying to reconnect...' : 'You are offline'}
          </span>
          <button
            onClick={() => { void checkConnectivity(); }}
            disabled={checking}
            className="btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Retrying...' : 'Retry Now'}
          </button>
        </div>
      </div>
    </div>
  );
}