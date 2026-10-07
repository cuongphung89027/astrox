'use client';
import { useState, useRef, useEffect, useLayoutEffect, useId, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from '@/i18n/LocaleProvider';
import { lookupGlossary } from '@/lib/glossary';
import styles from './Term.module.css';

interface TermProps {
  children: ReactNode;
  termKey?: string;
  customBrief?: string;
  className?: string;
}

export function Term({ children, termKey, customBrief, className }: TermProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null),
    popoverRef = useRef<HTMLSpanElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    popoverId = useId();
  const lookupText = termKey || (typeof children === 'string' ? children : '');
  const entry = lookupGlossary(lookupText, locale),
    brief = customBrief || entry?.brief,
    title = entry?.term || lookupText;
  const clearHover = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);
  const close = useCallback(() => {
    clearHover();
    setOpen(false);
    setPosition(null);
  }, [clearHover]);
  const show = () => {
    clearHover();
    setOpen(true);
  };
  const leave = () => {
    clearHover();
    hoverTimer.current = setTimeout(close, 160);
  };
  useEffect(() => () => clearHover(), [clearHover]);
  useLayoutEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const trigger = triggerRef.current,
        popover = popoverRef.current;
      if (!trigger || !popover) return;
      const rect = trigger.getBoundingClientRect(),
        size = popover.getBoundingClientRect();
      const left = Math.max(16, Math.min(rect.left + rect.width / 2 - size.width / 2, innerWidth - size.width - 16));
      const above = rect.top - size.height - 10;
      const top = Math.max(12, Math.min(above >= 76 ? above : rect.bottom + 10, innerHeight - size.height - 12));
      setPosition({ left, top });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, brief, locale]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!popoverRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);
  if (!brief) return <span className={className}>{children}</span>;
  return (
    <span
      className={styles.popoverAnchor}
      onMouseEnter={() => {
        if (matchMedia('(pointer: fine)').matches) {
          clearHover();
          hoverTimer.current = setTimeout(show, 140);
        }
      }}
      onMouseLeave={leave}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.termTrigger} ${className || ''}`}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={e => {
          e.stopPropagation();
          if (open) close();
          else show();
        }}
        onFocus={e => {
          if (e.currentTarget.matches(':focus-visible')) show();
        }}
        onBlur={close}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <span
            id={popoverId}
            ref={popoverRef}
            role="tooltip"
            className={`${styles.popover} ${position ? styles.isOpen : ''}`}
            style={{ left: position?.left ?? 16, top: position?.top ?? 76 }}
            onMouseEnter={clearHover}
            onMouseLeave={leave}
          >
            <span className={styles.header}>
              <span className={styles.title}>{title}</span>
              <span className={styles.badge}>{locale === 'en' ? 'Glossary' : 'Thuật ngữ'}</span>
            </span>
            <span className={styles.body}>{brief}</span>
          </span>,
          document.body,
        )}
    </span>
  );
}
