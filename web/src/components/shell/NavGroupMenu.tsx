'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FeatureIcon, FEATURE_BY_ID, type FeatureName } from '@/components/kit/FeatureIcon';
import type { NavSubLink } from '@/lib/nav';
import styles from './NavGroupMenu.module.css';

interface NavGroupMenuProps {
  id?: string;
  label: string;
  items: NavSubLink[];
}

export function NavGroupMenu({ id, label, items }: NavGroupMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if current route matches any child item
  const isGroupActive = items.some(item =>
    item.href === '/'
      ? pathname === '/'
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => {
        setOpen(true);
      }, 90);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  const handleTriggerClick = () => {
    setOpen(prev => !prev);
  };

  // Keyboard navigation & click outside
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  const groupIconName: FeatureName | null = id === 'self' ? 'tuvi' : id === 'qa' ? 'tarot' : null;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        data-active={isGroupActive}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={handleTriggerClick}
      >
        {groupIconName && (
          <FeatureIcon name={groupIconName} size={18} className={styles.groupIcon} />
        )}
        <span>{label}</span>
        <span className={styles.chevron} aria-hidden="true">▾</span>
        <span className={styles.underline} aria-hidden="true" />
      </button>

      <div
        id={menuId}
        className={`${styles.dropdown} ${open ? styles.isOpen : ''}`}
        role="region"
        aria-label={label}
      >
        {items.map(item => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const iconName = FEATURE_BY_ID[item.id] ?? 'home';

          return (
            <Link
              key={item.id}
              href={item.href}
              className={styles.item}
              data-active={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <div className={styles.itemIcon}>
                <FeatureIcon name={iconName} size={18} />
              </div>
              <div className={styles.itemText}>
                <span className={styles.itemLabel}>{item.label}</span>
                {item.hint && <span className={styles.itemHint}>{item.hint}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
