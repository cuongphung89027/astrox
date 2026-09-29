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
import { createLemonTopup } from '@/lib/api';
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
  const { astroxUser, market: accountMarket } = useAuth();
  const eligible = !!astroxUser && astroxUser.id !== 'localhost-preview';
  // Market theo provider (Zalo→VN, Google→US, Sơn 29/09) — không còn bước chọn ví.
  const market: 'US' | 'VN' = accountMarket ?? 'VN';
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

  if (market === 'US') return <TopupUsCredits key={astroxUser?.id ?? 'guest'} onClose={onClose} />;
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

/** Shared wallet presentation with USD/Credits and a Lemon checkout adapter. */
export function TopupUsCredits({ onClose }: { onClose: () => void }) {
  const { astroxUser } = useAuth();
  const { points, refresh } = usePointsBalance(!!astroxUser);
  type Pack = { id: string; name: string; credits: number; amountUsdCents: number };
  const [packs, setPacks] = useState<Pack[] | null>(null),
    [selected, setSelected] = useState('');
  const [history, setHistory] = useState<TopupOrder[] | null>(null),
    [historyError, setHistoryError] = useState(false);
  const [error, setError] = useState(''),
    [loadingError, setLoadingError] = useState(false),
    [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false),
    [promoBusy, setPromoBusy] = useState(false);
  const [promo, setPromo] = useState(''),
    [applied, setApplied] = useState<{ code: string; bonus: number } | null>(null),
    [promoMessage, setPromoMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null),
    alive = useRef(true),
    lock = useRef(false),
    promoLock = useRef(false),
    revision = useRef(0);
  const promoIntent = useRef<{ code: string; key: string } | null>(null);
  const intent = useRef<{ packageId: string; promo: string; key: string } | null>(null);
  const eligible = !!astroxUser && astroxUser.id !== 'localhost-preview';
  const chosen = packs?.find(p => p.id === selected);
  const usd = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  useEffect(() => {
    alive.current = true;
    dialog.current?.showModal();
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/site-config?market=US')
      .then(async r => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(d => {
        if (active) {
          setPacks(d?.config?.billing?.usPackages ?? []);
          setLoadingError(false);
        }
      })
      .catch(() => {
        if (active) {
          setPacks([]);
          setLoadingError(true);
        }
      });
    if (eligible)
      void loadTopupHistory()
        .then(rows => {
          if (active) {
            setHistory(rows);
            setHistoryError(false);
          }
        })
        .catch(() => {
          if (active) setHistoryError(true);
        });
    return () => {
      active = false;
    };
  }, [retry, eligible]);
  const close = () => {
    alive.current = false;
    revision.current++;
    onClose();
  };
  const apply = async () => {
    if (!eligible || promoLock.current || lock.current || !promo.trim()) return;
    promoLock.current = true;
    setPromoBusy(true);
    setPromoMessage('');
    const version = revision.current,
      code = promo.trim().toUpperCase();
    try {
      const result = await promoCheck(code, chosen?.amountUsdCents ?? 0);
      if (!alive.current || version !== revision.current) return;
      if (!result.ok) {
        setPromoMessage(promoErrorMessage(result.error, result.minAmountVnd, 'en'));
        return;
      }
      if (result.kind === 'direct_points') {
        if (promoIntent.current?.code !== code) promoIntent.current = { code, key: `us-promo-${crypto.randomUUID()}` };
        const redeemed = await redeemPromo(code, promoIntent.current.key);
        if (!alive.current || version !== revision.current) return;
        if (!redeemed.ok) {
          setPromoMessage('Unable to redeem this code. Please try again.');
          return;
        }
        promoIntent.current = null;
        setPromoMessage(`Added +${redeemed.points ?? 0} Credits to your wallet.`);
        setPromo('');
        setApplied(null);
        void refresh();
      } else {
        setApplied({ code, bonus: result.bonus ?? 0 });
        setPromoMessage(`+${result.bonus ?? 0} bonus Credits with this purchase.`);
      }
    } catch {
      if (alive.current) setPromoMessage('Unable to verify your code. Please try again.');
    } finally {
      promoLock.current = false;
      if (alive.current) setPromoBusy(false);
    }
  };
  const buy = async () => {
    if (
      !chosen ||
      !eligible ||
      lock.current ||
      promoLock.current ||
      (promo.trim() && applied?.code !== promo.trim().toUpperCase())
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    const code = applied?.code ?? '';
    if (!intent.current || intent.current.packageId !== chosen.id || intent.current.promo !== code)
      intent.current = { packageId: chosen.id, promo: code, key: `topup-${crypto.randomUUID()}` };
    try {
      const result = await createLemonTopup(chosen.id, intent.current.key, code || undefined);
      if (!alive.current) return;
      if (result.ok && result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setError(
        result.ok
          ? 'Checkout is being confirmed. Check your transaction history before retrying.'
          : 'Could not start checkout. Please try again.',
      );
      if (result.error === 'order_failed_retry_new') intent.current = null;
    } catch {
      if (alive.current) setError('Connection interrupted. Retry to check the same order.');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="ax-us-title" onCancel={close}>
      <div className={styles.frame}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>ASTROX WALLET / CREDITS</p>
          <h2 id="ax-us-title">Buy AstroX Credits</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close Credits checkout">
            ×
          </button>
          <div className={styles.wallet}>
            <div>
              <p>Current balance</p>
              <div className={styles.balance}>
                {eligible && points !== null ? points.toLocaleString('en-US') : '—'}
                <small>Credits</small>
              </div>
            </div>
            <PointCoin size={62} className={styles.coin} />
          </div>
        </header>
        <div className={styles.body}>
          <div className={styles.sectionTitle}>
            <h3>Choose a package</h3>
            <span>Secure checkout by Lemon Squeezy</span>
          </div>
          {!eligible && (
            <p className={styles.message}>
              {astroxUser ? 'Preview accounts cannot purchase Credits.' : 'Sign in with Google to buy Credits.'}
            </p>
          )}
          {loadingError ? (
            <div role="alert">
              <p>Unable to load packages.</p>
              <button
                className={styles.retry}
                onClick={() => {
                  setPacks(null);
                  setRetry(n => n + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : packs === null ? (
            <p role="status">Loading packages…</p>
          ) : !packs.length ? (
            <p>Credit packages are not available yet.</p>
          ) : (
            <fieldset className={styles.packages} disabled={busy || promoBusy}>
              <legend className="sr-only">Credit packages</legend>
              {packs.map(p => (
                <label key={p.id} className={styles.package}>
                  <input
                    type="radio"
                    name="us-credit-package"
                    value={p.id}
                    checked={selected === p.id}
                    onChange={() => {
                      revision.current++;
                      setSelected(p.id);
                      setApplied(null);
                      setPromoMessage('');
                      setError('');
                    }}
                  />
                  <span className={styles.packageTop}>
                    <span className={styles.pointValue}>
                      {p.credits.toLocaleString('en-US')}
                      <small>Credits</small>
                    </span>
                    <span className={styles.check} aria-hidden="true">
                      ✓
                    </span>
                  </span>
                  <span className={styles.price}>{usd(p.amountUsdCents)}</span>
                  <span className={styles.badge}>{p.name}</span>
                </label>
              ))}
            </fieldset>
          )}
          <details className={styles.details}>
            <summary>Have a promo code?</summary>
            <p className={styles.message}>Direct Credit codes do not require a purchase.</p>
            <div className={styles.promoRow}>
              <input
                aria-label="Promo code"
                placeholder="Enter your code"
                value={promo}
                disabled={!eligible || busy || promoBusy}
                onChange={e => {
                  revision.current++;
                  setPromo(e.target.value);
                  setApplied(null);
                  setPromoMessage('');
                }}
              />
              <button onClick={() => void apply()} disabled={!eligible || !promo.trim() || busy || promoBusy}>
                {promoBusy ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {promoMessage && (
              <p role="status" className={styles.message}>
                {promoMessage}
              </p>
            )}
          </details>
          <details className={styles.details}>
            <summary>Recent purchases</summary>
            {!eligible ? (
              <p>Sign in to see your purchases.</p>
            ) : historyError ? (
              <p role="alert">
                Unable to load purchases. <button onClick={() => setRetry(n => n + 1)}>Try again</button>
              </p>
            ) : history === null ? (
              <p role="status">Loading purchases…</p>
            ) : !history.length ? (
              <p>No purchases yet.</p>
            ) : (
              <ul className={styles.history}>
                {history.map(o => (
                  <li key={o.order_code}>
                    <div>
                      {o.points.toLocaleString('en-US')} Credits
                      <small>
                        {usd(o.amount_usd_cents ?? 0)} · #{o.order_code}
                      </small>
                    </div>
                    <span className={styles.historyStatus}>
                      {o.status === 'fulfilled'
                        ? 'Added to wallet'
                        : o.status === 'pending'
                          ? 'Awaiting payment'
                          : o.status === 'paid'
                            ? 'Confirming payment'
                            : o.status === 'refunded'
                              ? 'Refunded'
                              : 'Closed'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>
          {error && (
            <p role="alert" className={`${styles.message} ${styles.error}`}>
              {error}
            </p>
          )}
          <p className={styles.message}>
            Final taxes, if applicable, are shown at checkout. Credits are added after payment is confirmed. View
            pending and completed orders in your wallet history.
          </p>
        </div>
        <footer className={styles.footer}>
          <div className={styles.summary} aria-live="polite">
            <div>
              <p>{chosen ? 'You receive' : 'Ready to explore?'}</p>
              <small>
                {chosen
                  ? `${(chosen.credits + (applied?.bonus ?? 0)).toLocaleString('en-US')} Credits${applied ? ` · includes ${applied.bonus} promo Credits` : ''}`
                  : 'Choose a package above'}
              </small>
            </div>
            <strong>{chosen ? usd(chosen.amountUsdCents) : '—'}</strong>
          </div>
          <button
            className={styles.pay}
            onClick={() => void buy()}
            disabled={
              !eligible ||
              !chosen ||
              busy ||
              promoBusy ||
              !!(promo.trim() && applied?.code !== promo.trim().toUpperCase())
            }
          >
            {busy ? 'Opening checkout…' : chosen ? `Continue · ${usd(chosen.amountUsdCents)}` : 'Choose a package'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

