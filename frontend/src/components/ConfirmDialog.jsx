import { useEffect, useState } from 'react';

/**
 * UnsavedChangesDialog — shown when the user tries to navigate away with unsaved profile changes.
 *
 * Props:
 *  open         – boolean
 *  onSave       – save & leave
 *  onDiscard    – discard & leave
 *  onStay       – stay on page
 */
export function UnsavedChangesDialog({ open, onSave, onDiscard, onStay }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => { if (open) setClosing(false); }, [open]);

  // Esc = stay
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setClosing(true); setTimeout(onStay, 185); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const dismiss = (fn) => { setClosing(true); setTimeout(fn, 185); };

  return (
    <div
      className={closing ? 'animate-modal-bg-out' : 'animate-modal-bg'}
      onClick={() => dismiss(onStay)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
      }}
    >
      <div
        className={closing ? 'animate-modal-out' : 'animate-modal'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#141414', border: '1px solid #2a2a2a', borderRadius: 16,
          padding: '28px 28px 24px', width: '100%', maxWidth: 400,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 16,
          background: 'rgba(234,179,8,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </div>

        {/* Title & message */}
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
          Unsaved changes
        </p>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted-foreground)', marginBottom: 24, lineHeight: 1.6 }}>
          You have unsaved changes in your profile. What would you like to do?
        </p>

        {/* Actions — stacked for clarity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => dismiss(onSave)}
            style={{
              width: '100%', padding: '9px 18px', borderRadius: 9, fontSize: '0.875rem', fontWeight: 600,
              background: '#202020', border: '1px solid #303030',
              color: '#ffffff', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2c2c2c'; e.currentTarget.style.borderColor = '#3a3a3a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#202020'; e.currentTarget.style.borderColor = '#303030'; }}
          >
            Save &amp; Continue
          </button>
          <button
            onClick={() => dismiss(onDiscard)}
            style={{
              width: '100%', padding: '9px 18px', borderRadius: 9, fontSize: '0.875rem', fontWeight: 600,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          >
            Discard Changes
          </button>
          <button
            onClick={() => dismiss(onStay)}
            style={{
              width: '100%', padding: '9px 18px', borderRadius: 9, fontSize: '0.875rem', fontWeight: 600,
              background: 'transparent', border: '1px solid #2f2f2f',
              color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
          >
            Return to Profile
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom confirm dialog matching the app's dark theme.
 *
 * Props:
 *  open       – boolean, controls visibility
 *  title      – heading text
 *  message    – body text
 *  confirmLabel – text for the confirm button (default "Delete")
 *  danger     – if true, confirm button is red-tinted
 *  onConfirm  – called when user clicks confirm
 *  onCancel   – called when user clicks cancel or backdrop
 */
export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = false,
  onConfirm,
  onCancel,
}) {
  const [closing, setClosing] = useState(false);

  function handleCancel() {
    setClosing(true);
    setTimeout(() => { onCancel(); }, 185);
  }

  function handleConfirm() {
    setClosing(true);
    setTimeout(() => { onConfirm(); }, 185);
  }

  // Reset closing state when opened again
  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  // Esc key to dismiss
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel ? handleCancel() : handleConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className={closing ? 'animate-modal-bg-out' : 'animate-modal-bg'}
      onClick={onCancel ? handleCancel : handleConfirm}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className={closing ? 'animate-modal-out' : 'animate-modal'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#141414',
          border: '1px solid #2a2a2a',
          borderRadius: 16,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, marginBottom: 16,
          background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {danger ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        {/* Title */}
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 6 }}>
          {title}
        </p>

        {/* Message */}
        {message && (
          <p style={{ fontSize: '0.84rem', color: 'var(--muted-foreground)', marginBottom: 24, lineHeight: 1.5 }}>
            {message}
          </p>
        )}
        {!message && <div style={{ marginBottom: 24 }} />}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              onClick={handleCancel}
              style={{
                padding: '8px 18px', borderRadius: 9, fontSize: '0.84rem', fontWeight: 600,
                background: 'transparent', border: '1px solid #2f2f2f',
                color: 'var(--muted-foreground)', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.color = 'var(--foreground)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted-foreground)'; }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 18px', borderRadius: 9, fontSize: '0.84rem', fontWeight: 600,
              background: danger ? 'rgba(239,68,68,0.15)' : 'var(--primary)',
              border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : 'transparent'}`,
              color: danger ? '#f87171' : '#fff',
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.15)' : 'var(--primary)'; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
