'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/i18n/LocaleProvider';
import { AiText, ReadingInline, readingHeading } from './AiText';
import styles from './StructuredReading.module.css';

/** Preserve every paragraph, including responses cached with the older prompt. */
export function splitReadingSections(text: string) {
  const sections: { title: string; body: string }[] = [];
  let fence = '';
  for (const line of text
    .replace(/\bAI\b/g, 'AstroX')
    .replace(/bốn trụ/gi, match => (match[0] === 'B' ? 'Tứ trụ' : 'tứ trụ'))
    .replace(/\r\n?/g, '\n')
    .split('\n')) {
    const delimiter = line.match(/^\s*(`{3,}|~{3,})/);
    const insideFence = !!fence;
    if (delimiter) {
      if (!fence) fence = delimiter[1];
      else if (delimiter[1][0] === fence[0] && delimiter[1].length >= fence.length) fence = '';
    }
    const heading = !insideFence && !delimiter ? readingHeading(line) : null;
    if (heading) {
      sections.push({ title: heading.replace(/[:：]$/, '').trim(), body: '' });
    } else {
      if (!sections.length) sections.push({ title: '', body: '' });
      sections[sections.length - 1].body += `\n${line}`;
    }
  }
  return sections
    .map(section => ({ ...section, body: section.body.trim() }))
    .filter(section => section.title || section.body);
}

export function StructuredReading({ text }: { text: string }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const sections = splitReadingSections(text);
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const id = setTimeout(() => setCanShare(true), 0);
      return () => clearTimeout(id);
    }
  }, []);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#_`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = en ? 'en-US' : 'vi-VN';
    utterance.rate = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleCopy = async () => {
    try {
      const cleanText = text.replace(/[*#_`~]/g, '');
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      const cleanText = text.replace(/[*#_`~]/g, '');
      await navigator.share({
        title: en ? 'AstroX Reading' : 'Luận giải AstroX',
        text: cleanText,
      });
    } catch {}
  };

  return (
    <div className={styles.readingSections}>
      <div className={styles.toolbar} role="toolbar" aria-label={en ? 'Reading tools' : 'Công cụ bài đọc'}>
        <button
          type="button"
          className={styles.toolButton}
          onClick={handleSpeak}
          data-active={speaking}
          aria-label={speaking ? (en ? 'Stop reading' : 'Dừng đọc') : (en ? 'Read aloud' : 'Nghe bài')}
        >
          <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
          <span>{speaking ? (en ? 'Stop' : 'Dừng đọc') : (en ? 'Listen' : 'Nghe bài')}</span>
        </button>

        <button
          type="button"
          className={styles.toolButton}
          onClick={handleCopy}
          aria-label={copied ? (en ? 'Copied' : 'Đã sao chép') : (en ? 'Copy text' : 'Sao chép')}
        >
          <span aria-hidden="true">{copied ? '✓' : '📋'}</span>
          <span>{copied ? (en ? 'Copied' : 'Đã chép') : (en ? 'Copy' : 'Sao chép')}</span>
        </button>

        {canShare && (
          <button
            type="button"
            className={styles.toolButton}
            onClick={handleShare}
            aria-label={en ? 'Share reading' : 'Chia sẻ bài'}
          >
            <span aria-hidden="true">↗</span>
            <span>{en ? 'Share' : 'Chia sẻ'}</span>
          </button>
        )}
      </div>

      {sections.map((section, index) => {
        const conclusion = /tổng hợp|lời khuyên|kết luận|hành động|summary|advice|conclusion|action/i.test(
          section.title,
        );
        const isBasis = /cơ sở|đối chiếu|technical|basis|evidence|nguyên lý|nguồn gốc|căn cứ/i.test(
          section.title,
        );

        if (isBasis) {
          return (
            <details key={index} className={styles.readingBasis}>
              <summary>
                <header className={styles.basisHeader}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>
                    <ReadingInline text={section.title} />
                  </h3>
                  <small className={styles.basisBadge}>{en ? 'Explore details ▾' : 'Cơ sở & đối chiếu ▾'}</small>
                </header>
              </summary>
              <div className={styles.basisContent}>
                {section.body && <AiText text={section.body} />}
              </div>
            </details>
          );
        }

        return (
          <section key={index} className={conclusion ? styles.readingConclusion : styles.readingSection}>
            {section.title && (
              <header>
                <span>{conclusion ? '↗' : String(index + 1).padStart(2, '0')}</span>
                <h3>
                  <ReadingInline text={section.title} />
                </h3>
              </header>
            )}
            {section.body && <AiText text={section.body} />}
          </section>
        );
      })}
    </div>
  );
}
