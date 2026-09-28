'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { TERMS_SECTIONS } from '@/lib/terms';
import styles from './TermsContent.module.css';

const VI_SECTIONS = Object.values(TERMS_SECTIONS);
const EN_SECTIONS = [{ id: 'terms-of-use' }, { id: 'ai-disclosure' }, { id: 'privacy' }];

export function TermsNavigation() {
  const en = useLocale().locale === 'en';
  const sections = en ? EN_SECTIONS : VI_SECTIONS;
  const shortLabels = en
    ? ['Terms of use', 'AI disclosure', 'Data & privacy']
    : ['Điều khoản sử dụng', 'Miễn trừ trách nhiệm', 'Dữ liệu & quyền riêng tư'];
  const [active, setActive] = useState<string>(sections[0].id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current: string = sections[0].id;
        for (const section of sections) {
          const element = document.getElementById(section.id);
          if (element && element.getBoundingClientRect().top <= 190) current = section.id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('hashchange', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('hashchange', update);
    };
  }, [sections]);

  return (
    <aside className={styles.navigation}>
      <nav aria-label={en ? 'Terms contents' : 'Mục lục điều khoản'} className={styles.desktopNav}>
        <p className={styles.navCaption}>{en ? 'IN THIS DOCUMENT' : 'TRONG TÀI LIỆU NÀY'}</p>
        <ol>
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>
                <span className={styles.navNumber}>0{index + 1}</span>
                <span>{shortLabels[index]}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className={styles.navNote}>
          {en
            ? 'Read each section or save the full document for later.'
            : 'Bạn có thể đọc từng phần hoặc lưu toàn bộ tài liệu để xem lại.'}
        </p>
      </nav>
      <label className={styles.mobileNav}>
        <span>{en ? 'Reading' : 'Đang đọc'}</span>
        <select
          aria-label={en ? 'Choose a terms section' : 'Chọn phần điều khoản'}
          value={active}
          onChange={event => {
            const id = event.target.value;
            if (window.location.hash === `#${id}`) {
              document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
            } else {
              window.location.hash = id;
            }
          }}
        >
          {sections.map((section, index) => (
            <option key={section.id} value={section.id}>
              0{index + 1} · {shortLabels[index]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className={styles.printButton} onClick={() => window.print()}>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM16 11h1" />
        </svg>
        <span>{en ? 'Print / save PDF' : 'In / lưu PDF'}</span>
      </button>
    </aside>
  );
}
