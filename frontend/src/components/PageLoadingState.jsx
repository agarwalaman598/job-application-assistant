import { Loader2 } from 'lucide-react';

export function PageLoadingState({ label = 'Loading...', rows = 3, className = '', framed = true }) {
  const Wrapper = framed ? 'div' : 'section';
  const wrapperClass = framed ? `card p-6 ${className}` : className;

  return (
    <Wrapper className={wrapperClass.trim()} style={{ textAlign: 'center' }}>
      <div className="flex items-center justify-center gap-2" style={{ color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>
        <Loader2 size={16} className="animate-spin" />
        <span>{label}</span>
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="card animate-pulse" style={{ padding: '12px 16px' }}>
            <div style={{ height: 10, width: '45%', background: 'var(--muted)', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ height: 8, width: '30%', background: 'var(--muted)', borderRadius: 6 }} />
          </div>
        ))}
      </div>
    </Wrapper>
  );
}