import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export const Textarea = forwardRef(function Textarea(
  { className, minRows = 2, maxRows, expandOnFocusRows, singleLine = false, onChange, onFocus, onBlur, onKeyDown, style, ...props },
  ref
) {
  const innerRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  useImperativeHandle(ref, () => innerRef.current);

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;

    const effectiveMinRows = isFocused && expandOnFocusRows
      ? Math.max(minRows, expandOnFocusRows)
      : minRows;

    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const padding = parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
    const border = parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);
    const minHeight = effectiveMinRows * lineHeight + padding + border;
    const maxHeight = maxRows ? maxRows * lineHeight + padding + border : Number.POSITIVE_INFINITY;

    el.style.height = 'auto';
    const nextHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minRows, maxRows, expandOnFocusRows, isFocused]);

  useEffect(() => {
    resize();
  }, [props.value, resize]);

  const handleChange = (e) => {
    if (singleLine) {
      e.target.value = e.target.value.replace(/[\r\n]+/g, ' ');
    }
    resize();
    onChange?.(e);
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleKeyDown = (e) => {
    if (singleLine && e.key === 'Enter') {
      e.preventDefault();
    }
    onKeyDown?.(e);
  };

  return (
    <textarea
      ref={innerRef}
      className={cn(
        'w-full px-3.5 py-2.5 rounded-lg text-sm font-normal',
        'bg-[var(--input)] border border-[var(--border)]',
        'text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]',
        'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]',
        'transition-all duration-200 resize-none',
        className
      )}
      rows={minRows}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={style}
      {...props}
    />
  );
});
