import { cn } from '../lib/utils';

const STATUS_MAP = {
  applied:    { label: 'Applied',    dot: '#818cf8', bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  interview:  { label: 'Interview',  dot: '#fbbf24', bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  offer:      { label: 'Offer',      dot: '#34d399', bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  rejected:   { label: 'Rejected',   dot: '#f87171', bg: 'rgba(239,68,68,0.10)',  text: '#f87171' },
  draft:      { label: 'Draft',      dot: '#71717a', bg: 'rgba(113,113,122,0.12)',text: '#a1a1aa' },
  pending:    { label: 'Pending',    dot: '#818cf8', bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  accepted:   { label: 'Accepted',   dot: '#34d399', bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  withdrawn:  { label: 'Withdrawn',  dot: '#71717a', bg: 'rgba(113,113,122,0.12)',text: '#a1a1aa' },
};

export function StatusBadge({ status, className }) {
  const key = (status || 'draft').toLowerCase();
  const c = STATUS_MAP[key] ?? { label: status, dot: '#71717a', bg: 'rgba(113,113,122,0.12)', text: '#a1a1aa' };

  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 11px', borderRadius: 9999,
        background: c.bg, whiteSpace: 'nowrap',
        fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.2,
        color: c.text,
      }}
    >
      <span style={{ height: 6, width: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}
