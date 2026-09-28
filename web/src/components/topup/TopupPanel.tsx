'use client';

import { useEffect, useRef, useState } from 'react';
import { usePointsBalance } from '@/lib/points';
import { useAuth } from '@/lib/auth';
import { PointCoin } from '@/components/points/PointCoin';
import {
  createTopup,
  loadTopupHistory,
  loadTopupPackages,
  promoCheck,
  redeemPromo,
  type TopupOrder,
  type TopupPackage,
} from '@/lib/api';
import { promoErrorMessage } from './promo-message';
import { createLemonTopup, chooseMarket } from '@/lib/api';
import { currentMarket } from '@/lib/api';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './TopupPanel.module.css';

const vnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const number = (value: number) => value.toLocaleString('vi-VN');
const packageNote = (label?: string) => label?.replace(/^[\d.\s]+[đ₫]\s*(?:[·•–-]\s*)?/u, '').trim();

export function TopupPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { astroxUser } = useAuth();
  // A fresh session prevents selection, promo or private history leaking across accounts/reopens.
  return open ? <TopupSession key={astroxUser?.id ?? 'guest'} onClose={onClose} /> : null;
}

function TopupSession({ onClose }: { onClose: () => void }) {
  const { astroxUser } = useAuth();
  const eligible = !!astroxUser && astroxUser.id !== 'localhost-preview';
  const [market, setMarket] = useState<'US' | 'VN' | null>(null);
  useEffect(() => {
    void currentMarket().then(setMarket);
  }, []);
  const { points: balance, refresh: refreshBalance } = usePointsBalance(eligible);
  const [packages, setPackages] = useState<TopupPackage[] | null>(null);
  const [pkgError, setPkgError] = useState(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<TopupOrder[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState<{ code: string; bonus: number } | null>(null);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoChecking, setPromoChecking] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const requestLock = useRef(false);
  const promoRevision = useRef(0);
  const promoLock = useRef(false);
  const redemptionKeys = useRef(new Map<string, string>());
  const chosen = packages?.find(pkg => pkg.amount_vnd === selected);
  const unappliedPromo = !!promo.trim() && !applied;

  useEffect(() => {
    alive.current = true;
    const prior = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      alive.current = false;
      dialog?.close();
      document.body.style.overflow = overflow;
      if (prior instanceof HTMLElement && prior.isConnected) prior.focus();
    };
  }, []);

  useEffect(() => {
    let current = true;
    loadTopupPackages()
      .then(value => {
        if (current) setPackages(value);
      })
      .catch(() => {
        if (current) setPkgError(true);
      });
    return () => {
      current = false;
    };
  }, [reload]);

  useEffect(() => {
    if (!eligible) return;
    let current = true;
    void refreshBalance();
    loadTopupHistory()
      .then(value => {
        if (current) setHistory(value);
      })
      .catch(() => {
        if (current) setHistoryError(true);
      });
    return () => {
      current = false;
    };
  }, [eligible, refreshBalance]);

  async function applyPromo() {
    const code = promo.trim().toUpperCase();
    if (!code || promoLock.current || requestLock.current || !eligible) return;
    promoLock.current = true;
    const revision = promoRevision.current;
    setPromoChecking(true);
    setApplied(null);
    setPromoMessage('');
    try {
      const result = await promoCheck(code, chosen?.amount_vnd);
      if (!alive.current || revision !== promoRevision.current) return;
      if (result.ok) {
        if (result.kind === 'direct_points') {
          if (!redemptionKeys.current.has(code)) redemptionKeys.current.set(code, crypto.randomUUID());
          const redeemed = await redeemPromo(code, redemptionKeys.current.get(code)!);
          if (!alive.current || revision !== promoRevision.current) return;
          setPromoSuccess(redeemed.ok);
          setPromoMessage(
            redeemed.ok
              ? `Áp dụng thành công: đã cộng ${number(redeemed.points ?? 0)} Point vào ví.`
              : promoErrorMessage(redeemed.error),
          );
          if (redeemed.ok) {
            setPromo('');
            void refreshBalance();
          }
        } else {
          setApplied({ code, bonus: result.bonus ?? 0 });
          setPromoSuccess(true);
          setPromoMessage(`Áp dụng thành công: mã ${code} thêm ${number(result.bonus ?? 0)} Point khi nạp thành công.`);
        }
      } else {
        setPromoSuccess(false);
        setPromoMessage(promoErrorMessage(result.error, result.minAmountVnd));
      }
    } catch {
      if (alive.current && revision === promoRevision.current)
        setPromoMessage('Chưa kiểm tra được mã. Bạn thử lại nhé.');
    } finally {
      promoLock.current = false;
      if (alive.current) setPromoChecking(false);
    }
  }

  async function buy() {
    if (!chosen || !eligible || requestLock.current || unappliedPromo || promoChecking) return;
    requestLock.current = true;
    setBuying(true);
    setBuyError('');
    try {
      const result = await createTopup(chosen.amount_vnd, applied?.code);
      if (!alive.current) return;
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.error?.startsWith('promo_') || result.error === 'invalid_promo') {
        setApplied(null);
        setPromoSuccess(false);
        setPromoMessage(promoErrorMessage(result.error, result.minAmountVnd));
      }
      setBuyError(
        result.error?.startsWith('promo_') || result.error === 'invalid_promo'
          ? 'Vui lòng kiểm tra lại mã ưu đãi.'
          : result.error === 'payos'
            ? 'Thanh toán đang bảo trì. Bạn quay lại sau nhé.'
            : 'Chưa tạo được đơn nạp. Vui lòng thử lại.',
      );
    } catch {
      if (alive.current)
        setBuyError('Kết nối bị gián đoạn. Kiểm tra lịch sử nạp trước khi thử lại để tránh tạo đơn trùng.');
    } finally {
      requestLock.current = false;
      if (alive.current) setBuying(false);
    }
  }

  // P1-7: a fresh account has NO market yet — choose explicitly before any
  // wallet surface appears, so a US user never lands on the VN PayOS flow.
  if (market === null)
    return (
      <MarketOnboarding
        onClose={onClose}
        onChosen={next => {
          setMarket(next);
        }}
      />
    );
  if (market === 'US') return <TopupUsCredits onClose={onClose} />;
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="ax-tp-title"
      aria-describedby="ax-tp-description"
      onCancel={onClose}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className={styles.frame}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>VÍ ASTROX / POINT</p>
          <h2 id="ax-tp-title">Nạp AstroX Point</h2>
          <button type="button" className={styles.close} aria-label="Đóng trang nạp Point" onClick={onClose}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
          <div className={styles.wallet}>
            <div>
              <p>Số dư hiện tại</p>
              <div className={styles.balance}>
                {eligible && balance !== null ? number(balance) : '—'}
                <small>Point</small>
              </div>
            </div>
            <PointCoin size={62} className={styles.coin} />
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.sectionTitle}>
            <h3>Chọn gói nạp</h3>
            <span id="ax-tp-description">Đơn thanh toán có hiệu lực 10 phút</span>
          </div>
          {!eligible && (
            <p className={styles.message}>
              {astroxUser
                ? 'Chế độ xem thử không hỗ trợ thanh toán.'
                : 'Đăng nhập bằng Zalo để nạp Point. Bạn vẫn có thể xem các gói bên dưới.'}
            </p>
          )}
          {pkgError ? (
            <div role="alert">
              <p className={`${styles.message} ${styles.error}`}>Chưa tải được gói nạp.</p>
              <button
                className={styles.retry}
                type="button"
                onClick={() => {
                  setPkgError(false);
                  setPackages(null);
                  setReload(value => value + 1);
                }}
              >
                Thử lại
              </button>
            </div>
          ) : packages === null ? (
            <div className={styles.packages} role="status" aria-label="Đang tải gói nạp">
              {[0, 1, 2, 3].map(key => (
                <div key={key} className={styles.skeleton} aria-hidden="true" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <p className={styles.message}>Hiện chưa có gói nạp khả dụng. Bạn quay lại sau nhé.</p>
          ) : (
            <fieldset className={styles.packages} aria-label="Gói nạp Point">
              {packages.map(pkg => (
                <label className={styles.package} key={pkg.amount_vnd}>
                  <input
                    type="radio"
                    name="astrox-topup-package"
                    value={pkg.amount_vnd}
                    checked={selected === pkg.amount_vnd}
                    disabled={buying}
                    onChange={() => {
                      setSelected(pkg.amount_vnd);
                      setApplied(null);
                      setPromoMessage('');
                      setBuyError('');
                    }}
                    aria-label={`${number(pkg.points)} Point, ${vnd(pkg.amount_vnd)}`}
                  />
                  <span className={styles.packageTop}>
                    <span className={styles.pointValue}>
                      {number(pkg.points)}
                      <small>Point</small>
                    </span>
                    <span className={styles.check} aria-hidden="true">
                      ✓
                    </span>
                  </span>
                  <span className={styles.price}>{vnd(pkg.amount_vnd)}</span>
                  {packageNote(pkg.label) && <span className={styles.badge}>{packageNote(pkg.label)}</span>}
                </label>
              ))}
            </fieldset>
          )}
          <details className={styles.details}>
            <summary>Bạn có mã ưu đãi?</summary>
            <p className={styles.message}>Mã cộng Point trực tiếp không cần chọn gói nạp.</p>
            <div className={styles.promoRow}>
              <input
                aria-label="Mã ưu đãi"
                value={promo}
                disabled={!eligible || buying}
                placeholder="Nhập mã của bạn"
                autoCapitalize="characters"
                autoComplete="off"
                onChange={event => {
                  promoRevision.current += 1;
                  setPromo(event.target.value);
                  setApplied(null);
                  setPromoSuccess(false);
                  setPromoMessage('');
                  setBuyError('');
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void applyPromo();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void applyPromo()}
                disabled={!eligible || !promo.trim() || promoChecking || buying}
              >
                {promoChecking ? 'Đang kiểm tra…' : 'Áp dụng'}
              </button>
            </div>
            {promoMessage && (
              <p role="status" className={`${styles.message} ${promoSuccess ? styles.success : styles.error}`}>
                {promoMessage}
              </p>
            )}
          </details>
          <details className={styles.details}>
            <summary>Lịch sử nạp gần đây</summary>
            {!eligible ? (
              <p className={styles.message}>Đăng nhập để xem giao dịch của bạn.</p>
            ) : historyError ? (
              <p className={`${styles.message} ${styles.error}`}>
                Chưa tải được lịch sử. Hãy mở lại cửa sổ để thử lại.
              </p>
            ) : history === null ? (
              <p role="status" className={styles.message}>
                Đang tải giao dịch…
              </p>
            ) : history.length === 0 ? (
              <p className={styles.message}>Chưa có giao dịch nào. Lần nạp đầu tiên sẽ xuất hiện ở đây.</p>
            ) : (
              <ul className={styles.history}>
                {history.map((order, index) => (
                  <li key={order.order_code ?? index}>
                    <div>
                      {number(order.points)} Point
                      <small>
                        {vnd(order.amount_vnd)}
                        {order.order_code ? ` · #${order.order_code}` : ''}
                      </small>
                    </div>
                    <span className={styles.historyStatus}>
                      {order.status === 'paid'
                        ? 'Đã nạp'
                        : order.status === 'pending'
                          ? 'Chờ thanh toán'
                          : order.status === 'cancelled' || order.status === 'canceled'
                            ? 'Đã hủy'
                            : order.status === 'expired'
                              ? 'Đã hết hạn'
                              : 'Đang cập nhật'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
        <footer className={styles.footer}>
          <div className={styles.summary} aria-live="polite">
            <div>
              <p>{chosen ? 'Bạn sẽ nhận' : 'Sẵn sàng khám phá?'}</p>
              <small>
                {chosen
                  ? `${number(chosen.points + (applied?.bonus ?? 0))} Point${applied ? ` · gồm ${number(applied.bonus)} Point ưu đãi` : ''}`
                  : 'Chọn một gói Point ở trên'}
              </small>
            </div>
            <strong>{chosen ? vnd(chosen.amount_vnd) : '—'}</strong>
          </div>
          {unappliedPromo && <p className={styles.message}>Áp dụng mã ưu đãi hoặc xóa mã để tiếp tục.</p>}
          {buyError && (
            <p role="alert" className={`${styles.message} ${styles.error}`}>
              {buyError}
            </p>
          )}
          <button
            className={styles.pay}
            type="button"
            disabled={!eligible || !chosen || buying || promoChecking || unappliedPromo}
            onClick={() => void buy()}
          >
            {buying ? 'Đang tạo đơn nạp…' : 'Tiếp tục thanh toán'}
            <span aria-hidden="true">↗</span>
          </button>
          <p className={styles.note}>Thanh toán qua PayOS · Point được cộng sau khi giao dịch được xác nhận.</p>
        </footer>
      </div>
    </dialog>
  );
}

/** US market: Credits packages through Lemon hosted checkout (plan Task 15). */
function TopupUsCredits({ onClose }: { onClose: () => void }) {
  const t = useLocale();
  const { astroxUser } = useAuth();
  const [packs, setPacks] = useState<Array<{
    id: string;
    name: string;
    credits: number;
    amountUsdCents: number;
  }> | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/api/site-config')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (alive) setPacks(d?.config?.billing?.usPackages ?? []);
      })
      .catch(() => alive && setPacks([]));
    return () => {
      alive = false;
    };
  }, []);
  const buy = async (packageId: string) => {
    if (busy) return;
    if (!astroxUser) {
      setError(t.t('login.consentError') ? 'Please sign in first.' : 'Vui lòng đăng nhập trước khi nạp.');
      return;
    }
    setBusy(packageId);
    setError('');
    // requestKey pins this intent for the session: server retries return the same order.
    const requestKey = `topup-${packageId}-${crypto.randomUUID().slice(0, 8)}`;
    const result = await createLemonTopup(packageId, requestKey);
    setBusy('');
    if (result.ok && result.checkoutUrl) {
      window.location.assign(result.checkoutUrl);
      return;
    }
    setError(
      result.ok
        ? 'Checkout is being confirmed. Please check your order status in a moment.'
        : 'Could not start checkout. Please try again.',
    );
  };
  return (
    <dialog open className={styles.dialog} aria-labelledby="ax-us-title" onCancel={onClose}>
      <div className={styles.body}>
        <h2 id="ax-us-title">{t.locale === 'en' ? 'Buy Credits' : 'Nạp Credits'}</h2>
        <p>
          {t.locale === 'en'
            ? 'Prepaid credits for readings. Secure checkout by Lemon Squeezy.'
            : 'Credits trả trước cho luận giải. Thanh toán an toàn qua Lemon Squeezy.'}
        </p>
        {!Array.isArray(packs) ? (
          <p role="status">{t.t('common.loading')}</p>
        ) : packs.length === 0 ? (
          <p>{t.locale === 'en' ? 'Credit packages are not available yet.' : 'Gói Credits chưa mở bán.'}</p>
        ) : (
          <ul className={styles.packages}>
            {packs.map(p => (
              <li key={p.id}>
                <button type="button" onClick={() => buy(p.id)} disabled={!!busy} aria-busy={busy === p.id}>
                  <strong>{p.credits.toLocaleString('en-US')} Credits</strong>
                  <span>${(p.amountUsdCents / 100).toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className={styles.promoError}>
            {error}
          </p>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label={t.t('common.close')}>
          ×
        </button>
      </div>
    </dialog>
  );
}

/** First-wallet-open market choice (P1-7): explicit, server-stored, per account. */
function MarketOnboarding({ onClose, onChosen }: { onClose: () => void; onChosen: (market: 'US' | 'VN') => void }) {
  const t = useLocale();
  const { astroxUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = async (market: 'US' | 'VN') => {
    if (busy) return;
    if (!astroxUser) {
      setError(t.locale === 'en' ? 'Please sign in first.' : 'Vui lòng đăng nhập trước khi chọn.');
      return;
    }
    setBusy(true);
    const ok = await chooseMarket(market);
    setBusy(false);
    if (ok) onChosen(market);
    else
      setError(
        t.locale === 'en'
          ? 'Could not save your choice. Please try again.'
          : 'Chưa lưu được lựa chọn. Vui lòng thử lại.',
      );
  };
  return (
    <dialog open className={styles.dialog} aria-labelledby="ax-market-title" onCancel={onClose}>
      <div className={styles.body}>
        <h2 id="ax-market-title">{t.locale === 'en' ? 'Choose your wallet' : 'Chọn loại ví cho bạn'}</h2>
        <p>
          {t.locale === 'en'
            ? 'AstroX has two wallets. This choice applies to purchases and cannot be switched while an order is processing.'
            : 'AstroX có hai loại ví. Lựa chọn này áp dụng cho việc nạp và không đổi khi có giao dịch đang xử lý.'}
        </p>
        <ul className={styles.packages}>
          <li>
            <button type="button" onClick={() => choose('US')} disabled={busy}>
              <strong>🇺🇸 Credits (USD)</strong>
              <span>Google · Lemon Squeezy checkout</span>
            </button>
          </li>
          <li>
            <button type="button" onClick={() => choose('VN')} disabled={busy}>
              <strong>🇻🇳 Point (VND)</strong>
              <span>Zalo · PayOS</span>
            </button>
          </li>
        </ul>
        {error && (
          <p role="alert" className={styles.promoError}>
            {error}
          </p>
        )}
        <button type="button" className={styles.close} onClick={onClose} aria-label={t.t('common.close')}>
          ×
        </button>
      </div>
    </dialog>
  );
}
