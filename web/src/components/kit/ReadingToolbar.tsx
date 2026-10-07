'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './ReadingToolbar.module.css';

function ToolIcon({ kind }: { kind: 'listen' | 'copy' | 'share' | 'stop' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'listen' ? (
        <>
          <path d="M11 5 6 9H3v6h3l5 4Z" />
          <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
        </>
      ) : kind === 'copy' ? (
        <>
          <rect x="8" y="8" width="12" height="13" rx="2" />
          <path d="M16 8V3H3v13h5" />
        </>
      ) : kind === 'share' ? (
        <>
          <path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" />
        </>
      ) : (
        <rect x="6" y="6" width="12" height="12" rx="2" />
      )}
    </svg>
  );
}

export function ReadingToolbar({ text, locale }: { text: string; locale: 'vi' | 'en' }) {
  const en = locale === 'en';
  const [capabilities, setCapabilities] = useState({ listen: false, share: false });
  const [speaking, setSpeaking] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  const utterance = useRef<SpeechSynthesisUtterance | null>(null),
    generation = useRef(0);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setCapabilities({
          listen: 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined',
          share: typeof navigator.share === 'function',
        }),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const session = generation;
    const timer = setTimeout(() => {
      setSpeaking(false);
      setCopied(false);
      setError('');
    }, 0);
    return () => {
      clearTimeout(timer);
      session.current++;
      if (utterance.current) {
        utterance.current = null;
        window.speechSynthesis?.cancel();
      }
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, [text, locale]);
  const listen = () => {
    setError('');
    generation.current++;
    const token = generation.current;
    window.speechSynthesis.cancel();
    utterance.current = null;
    if (speaking) {
      setSpeaking(false);
      return;
    }
    // Short utterances avoid browser cut-offs on a full, multi-chapter report.
    const chunks: string[] = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
      if (!chunks.length || chunks.at(-1)!.length + word.length > 320) chunks.push(word);
      else chunks[chunks.length - 1] += ' ' + word;
    }
    let index = 0;
    const next = () => {
      if (token !== generation.current) return;
      if (index >= chunks.length) {
        utterance.current = null;
        setSpeaking(false);
        return;
      }
      const current = new SpeechSynthesisUtterance(chunks[index++]);
      current.lang = en ? 'en-US' : 'vi-VN';
      const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(en ? 'en' : 'vi'));
      if (voice) current.voice = voice;
      current.onend = next;
      current.onerror = () => {
        if (token !== generation.current) return;
        utterance.current = null;
        setSpeaking(false);
        setError(en ? 'Audio could not play. Please try again.' : 'Chưa phát được bài đọc. Bạn hãy thử lại.');
      };
      utterance.current = current;
      window.speechSynthesis.speak(current);
    };
    setSpeaking(true);
    next();
  };
  const copy = async () => {
    setError('');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        en
          ? 'Copy failed. Check your browser clipboard permission.'
          : 'Chưa sao chép được. Kiểm tra quyền sao chép của trình duyệt.',
      );
    }
  };
  const share = async () => {
    setError('');
    try {
      await navigator.share({ title: en ? 'AstroX Reading' : 'Luận giải AstroX', text });
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError')
        setError(
          en ? 'Sharing is unavailable. Try copying the reading.' : 'Chưa chia sẻ được. Bạn có thể sao chép bài đọc.',
        );
    }
  };
  return (
    <div className={styles.tools}>
      <div className={styles.toolbar} role="toolbar" aria-label={en ? 'Reading tools' : 'Công cụ bài đọc'}>
        {capabilities.listen && (
          <button type="button" onClick={listen} aria-pressed={speaking}>
            <ToolIcon kind={speaking ? 'stop' : 'listen'} />
            <span>{speaking ? (en ? 'Stop' : 'Dừng đọc') : en ? 'Listen' : 'Nghe bài'}</span>
          </button>
        )}
        <button type="button" onClick={copy}>
          <ToolIcon kind="copy" />
          <span>{copied ? (en ? 'Copied' : 'Đã sao chép') : en ? 'Copy' : 'Sao chép'}</span>
        </button>
        {capabilities.share && (
          <button type="button" onClick={share}>
            <ToolIcon kind="share" />
            <span>{en ? 'Share' : 'Chia sẻ'}</span>
          </button>
        )}
      </div>
      <span className={styles.status} role="status">
        {error || (copied ? (en ? 'Reading copied.' : 'Đã sao chép bài đọc.') : '')}
      </span>
    </div>
  );
}
