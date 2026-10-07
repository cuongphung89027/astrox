'use client';

import { useState, useRef, useEffect, useId, type ReactNode } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { lookupGlossary } from '@/lib/glossary';
import styles from './Term.module.css';

interface TermProps {
  children: ReactNode;
  /** Explicit term key or text to look up. Defaults to stringified children if omitted */
  termKey?: string;
  /** Optional custom brief definition override */
  customBrief?: string;
  className?: string;
}

export function Term({ children, termKey, customBrief, className }: TermProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [flipBottom, setFlipBottom] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverId = useId();

  const lookupText = termKey || (typeof children === 'string' ? children : '');
  const entry = lookupGlossary(lookupText, locale);
  const brief = customBrief || entry?.brief;
  const title = entry?.term || lookupText;

  // Check top viewport boundary to flip popover if needed
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.top < 130) {
      setFlipBottom(true);
    } else {
      setFlipBottom(false);
    }
  };

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      hoverTimer.current = setTimeout(() => {
        updatePosition();
        setOpen(true);
      }, 140);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePosition();
    setOpen(prev => !prev);
  };

  // Close on Escape or outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  // If no glossary description is available, render clean text
  if (!brief) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={styles.popoverAnchor} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.termTrigger} ${className || ''}`}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={handleClick}
        title={open ? undefined : `${title}: ${brief}`}
      >
        {children}
      </button>

      <div
        id={popoverId}
        ref={popoverRef}
        role="tooltip"
        className={`${styles.popover} ${open ? styles.isOpen : ''} ${flipBottom ? styles.flipBottom : ''}`}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <span className={styles.badge}>{locale === 'en' ? 'Glossary' : 'Thuật ngữ'}</span>
        </div>
        <p className={styles.body}>{brief}</p>
      </div>
    </span>
  );
}
