import { cn } from '../../lib/utils';

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn('block text-xs font-medium text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase', className)}
      {...props}
    >
      {children}
    </label>
  );
}
