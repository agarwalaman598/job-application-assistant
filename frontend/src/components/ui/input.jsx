import { cn } from '../../lib/utils';

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'w-full px-3.5 py-2.5 rounded-lg text-sm font-normal',
        'bg-[var(--input)] border border-[var(--border)]',
        'text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
        'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]',
        'transition-all duration-200',
        className
      )}
      {...props}
    />
  );
}
