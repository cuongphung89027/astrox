'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/LocaleProvider';
import { DISPLAY_AD_CLIENT, DISPLAY_AD_SLOT, DISPLAY_ADS_ENABLED, displayAdPlacement } from '@/lib/display-ads';
import styles from './DisplayAd.module.css';

type AdWindow = Window & { adsbygoogle?: { push: (value: object) => unknown } };
let sdk: Promise<void> | null = null;
function loadAds(): Promise<void> {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${DISPLAY_AD_CLIENT}`;
    const timer = setTimeout(() => { script.remove(); sdk = null; reject(new Error('Ads timeout')); }, 10000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); sdk = null; reject(new Error('Ads unavailable')); };
    document.head.appendChild(script);
  });
  return sdk;
}

/** Explicit placement; no refresh, overlay, animation or fabricated fallback ad. */
export function DisplayAd({ placement }: { placement: 'home' | 'calendar' }) {
  const locale = useLocale();
  const allowed = displayAdPlacement(usePathname()) === placement;
  const element = useRef<HTMLModElement>(null);
  const [empty, setEmpty] = useState(false);
  const [support, setSupport] = useState(false);
  useEffect(() => {
    if (!DISPLAY_ADS_ENABLED || !allowed || !element.current) return;
    const node = element.current;
    let active = true;
    const status = new MutationObserver(() => {
      if (node.dataset.adStatus === 'unfilled') setEmpty(true);
    });
    status.observe(node, { attributes: true, attributeFilter: ['data-ad-status'] });
    const nearby = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      nearby.disconnect();
      void loadAds().then(() => {
        if (!active || node.dataset.astroxRequested) return;
        node.dataset.astroxRequested = 'true';
        const host = window as AdWindow;
        const queue = host.adsbygoogle || ([] as object[]);
        host.adsbygoogle = queue;
        queue.push({});
      }).catch(() => {
        if (!active) return;
        setEmpty(true);
        try {
          if (!sessionStorage.getItem('astrox-ad-support-seen')) {
            sessionStorage.setItem('astrox-ad-support-seen', '1');
            setSupport(true);
          }
        } catch { /* Storage unavailable: keep the failed ad collapsed without repeated prompts. */ }
      });
    }, { rootMargin: '200px' });
    nearby.observe(node);
    return () => { active = false; nearby.disconnect(); status.disconnect(); };
  }, [allowed]);
  if (!DISPLAY_ADS_ENABLED || !allowed) return null;
  if (empty) return support ? (
    <aside className={styles.support} data-ad-support>
      <p>{locale.locale === 'en'
        ? 'Ads could not load. Allowing ads on AstroX helps keep our free tools available.'
        : 'Quảng cáo chưa tải được. Cho phép quảng cáo trên AstroX giúp duy trì các tiện ích miễn phí.'}</p>
      <button type="button" onClick={() => setSupport(false)} aria-label={locale.locale === 'en' ? 'Dismiss message' : 'Đóng lời nhắc'}>×</button>
    </aside>
  ) : null;
  return (
    <aside className={styles.frame} aria-label={locale.locale === 'en' ? 'Advertisement' : 'Quảng cáo'} data-ad-placement={placement}>
      <span className={styles.label}>{locale.locale === 'en' ? 'Advertisement' : 'Quảng cáo'}</span>
      <ins ref={element} className={`adsbygoogle ${styles.slot}`} data-ad-client={DISPLAY_AD_CLIENT}
        data-ad-slot={DISPLAY_AD_SLOT} data-ad-format="horizontal" data-full-width-responsive="false" />
    </aside>
  );
}
