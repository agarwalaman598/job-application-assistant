import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
  {
    variants: {
      variant: {
        default:   'bg-[var(--primary)] text-white hover:bg-indigo-600 active:scale-[0.98]',
        secondary: 'bg-transparent text-[var(--muted-foreground)] border border-[var(--border)] hover:border-[#3a3a3a] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
        ghost:     'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
        danger:    'bg-transparent text-[var(--destructive)] border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.08)] hover:border-[rgba(239,68,68,0.5)]',
        link:      'bg-transparent text-[var(--primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2 text-sm',
        sm:      'h-8  px-3 text-xs',
        lg:      'h-12 px-7 text-base',
        icon:    'h-9  w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export function Button({ className, variant, size, children, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}
