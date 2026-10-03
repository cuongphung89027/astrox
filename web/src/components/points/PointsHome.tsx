'use client';

/**
 * Màn Ví AstroX Point (/hoso?section=points):
 * - Hero số dư (đồng xu Đông Sơn, NumberPopIn, nạp nhanh qua TopupPanel).
 * - "Kiếm thêm Point": giới thiệu bạn bè + xem quảng cáo — trạng thái & mức
 *   thưởng đọc từ cấu hình admin đã xuất bản (/api/site-config → rewards),
 *   chưa bật thì hiện "Sắp mở" trung thực, không thưởng giả.
 * - Lịch sử Point: gộp ledger (nạp/cộng/trừ, phân trang cursor) + đơn nạp
 *   đang chờ thanh toán; lọc Tất cả / Cộng / Tiêu.
 */
import Link from 'next/link';
import { EarnPointsView } from './EarnPointsView';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { usePointsBalance } from '@/lib/points';
import { useDailyCheckin } from '@/lib/use-daily-checkin';
import {
  rewardedAdAction,
  loadPointsHistory,
  loadTopupHistory,
  type PointTxn,
  type TopupOrder,
} from '@/lib/api';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { NumberPopIn, ShimmerText, useToast } from '@/components/motion';
import { TopupPanel } from '@/components/topup/TopupPanel';
import { showRewardedAd } from '@/lib/rewarded-ad';
import { PointCoin } from './PointCoin';
import styles from './PointsHome.module.css';
import { formatHistoryDelta } from '@/lib/format-history-delta';
import { useLocale } from '@/i18n/LocaleProvider';

type Filter = 'all' | 'in' | 'out';

interface Entry {
  key: string;
  /** 1 = vào ví, -1 = ra khỏi ví, 0 = đang chờ thanh toán. */
  dir: 1 | -1 | 0;
  label: string;
  sub: string;
  display: string;
  at: string;
  icon: 'coin' | 'invite' | 'play' | 'calendar' | 'wallet';
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'in', label: 'Cộng Point' },
  { id: 'out', label: 'Tiêu Point' },
];

const REASON_LABELS: Record<string, string> = {
  topup_payos: 'Nạp Point',
  ad_reward: 'Thưởng xem quảng cáo',
  referral: 'Thưởng giới thiệu bạn bè',
  attendance: 'Điểm danh hàng ngày',
  milestone: 'Thưởng chuỗi điểm danh',
  admin_adjust: 'Điều chỉnh từ AstroX',
  ai_service: 'Luận giải dịch vụ trả phí',
  ai_service_refund: 'Hoàn Point luận giải',
  unlock: 'Mở khóa dịch vụ',
};

function formatVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`;
}

function formatOrder(o: TopupOrder) {
  return o.amount_usd_cents != null
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(o.amount_usd_cents / 100)
    : formatVnd(o.amount_vnd);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Thời điểm tải module — dùng cho mốc thời gian của dòng lịch sử minh họa (preview). */
const PREVIEW_NOW = typeof window === 'undefined' ? Date.parse('2026-09-22T09:00:00.000Z') : Date.now();

function txnToEntry(t: PointTxn, orders: Map<string, TopupOrder>, en = false): Entry {
  const locale = en ? 'en-US' : 'vi-VN';
  const labels: Record<string, string> = en
    ? {
        topup_payos: 'Buy Credits',
        ad_reward: 'Ad reward',
        referral: 'Referral reward',
        attendance: 'Daily check-in',
        milestone: 'Check-in milestone',
        admin_adjust: 'AstroX adjustment',
        ai_service: 'Paid reading',
        ai_service_refund: 'Reading refund',
        unlock: 'Service unlock',
        bonus: 'Bonus Credits',
        refund: 'Purchase refund',
        release: 'Reservation released',
      }
    : REASON_LABELS;
  const dir: 1 | -1 = t.delta >= 0 ? 1 : -1;
  const known = Object.keys(labels).some(k => t.reason === k || t.reason.startsWith(`${k}:`) || t.reason.startsWith(k));
  let label = en ? (dir === 1 ? 'Credits added' : 'Credits spent') : dir === 1 ? 'Cộng Point' : 'Dùng Point';
  let icon: Entry['icon'] = dir === 1 ? 'coin' : 'wallet';
  if (t.reason === 'topup_payos') {
    label = labels.topup_payos;
    const order = t.reference_id ? orders.get(t.reference_id) : undefined;
    const amount = order ? formatOrder(order) : t.reference_id ? `${en ? 'Order' : 'đơn'} #${t.reference_id}` : '';
    return {
      key: t.id,
      dir,
      label,
      sub: amount,
      display: formatHistoryDelta(t.delta, locale),
      at: t.created_at,
      icon: 'coin',
    };
  }
  if (known) {
    label =
      labels[Object.keys(labels).find(k => t.reason === k || t.reason.startsWith(`${k}:`) || t.reason.startsWith(k))!];
    icon = t.reason.startsWith('referral')
      ? 'invite'
      : t.reason.startsWith('ad')
        ? 'play'
        : t.reason.startsWith('attendance') || t.reason.startsWith('milestone')
          ? 'calendar'
          : 'coin';
  }
  return { key: t.id, dir, label, sub: '', display: formatHistoryDelta(t.delta, locale), at: t.created_at, icon };
}

function EntryIcon({ icon }: { icon: Entry['icon'] }) {
  if (icon === 'coin') return <PointCoin size={19} />;
  return (
    <FeatureIcon
      name={icon === 'invite' ? 'invite' : icon === 'play' ? 'play' : icon === 'calendar' ? 'calendar' : 'wallet'}
      size={19}
    />
  );
}

/** Lịch sử: status đổi qua callback của promise (không setState đồng bộ trong effect). */
interface HistoryState {
  status: 'loading' | 'ready' | 'error';
  txns: PointTxn[];
  nextCursor: string | null;
}

export function PointsHome({ view = 'wallet' }: { view?: 'wallet' | 'earn' }) {
  const { locale } = useLocale();
  const en = locale === 'en';

  const { loggedIn, ready, astroxUser } = useAuth();
  const preview = astroxUser?.id === 'localhost-preview';
  const { points, status, refresh, market } = usePointsBalance(!preview);
  const unit = market ? (market === 'US' ? 'Credits' : 'Point') : en ? 'Credits' : 'Point';
  const copy = (vi: string, enText: string) => (en ? enText : vi).replaceAll('Credits', unit).replaceAll('Point', unit);
  const toast = useToast();

  const [topupOpen, setTopupOpen] = useState(false);
  const daily = useDailyCheckin();
  const { summary, busy: checkingIn, reload: reloadDaily } = daily;
  const summaryError = daily.status === 'error';
  const [adConsent, setAdConsent] = useState(false),
    [adBusy, setAdBusy] = useState(false);
  const adDialog = useRef<HTMLDialogElement>(null),
    adController = useRef<AbortController | null>(null);
  useEffect(() => {
    if (adConsent) adDialog.current?.showModal();
    else adDialog.current?.close();
  }, [adConsent]);
  useEffect(
    () => () => {
      adController.current?.abort();
    },
    [],
  );
  const [history, setHistory] = useState<HistoryState>({ status: 'loading', txns: [], nextCursor: null });
  const [orders, setOrders] = useState<TopupOrder[] | null>(null);
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lịch sử: trang đầu ledger + đơn nạp (lấy amount_vnd + đơn đang chờ).
  // historyEpoch tăng khi bấm "Thử lại" để chạy lại effect.
  useEffect(() => {
    if (!loggedIn || !astroxUser || preview) return;
    let alive = true;
    loadPointsHistory()
      .then(p => {
        if (alive) setHistory({ status: 'ready', txns: p.transactions, nextCursor: p.nextCursor });
      })
      .catch(() => {
        if (alive) setHistory({ status: 'error', txns: [], nextCursor: null });
      });
    loadTopupHistory()
      .then(o => {
        if (alive) setOrders(o);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, [loggedIn, astroxUser, preview, historyEpoch]);

  useEffect(() => {
    if (!loggedIn || preview || !orders?.some(o => o.status === 'pending')) return;
    let alive = true;
    const timer = setInterval(() => {
      void loadTopupHistory()
        .then(rows => {
          if (!alive) return;
          setOrders(rows);
          if (rows.some(row => orders.some(old => old.order_code === row.order_code && old.status !== row.status))) {
            setHistoryEpoch(n => n + 1);
            void refresh();
          }
        })
        .catch(() => {});
    }, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [loggedIn, preview, orders, refresh]);

  const reloadHistory = useCallback(() => { setHistoryEpoch(n => n + 1); void reloadDaily(); }, [reloadDaily]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const orderMap = useMemo(() => {
    const m = new Map<string, TopupOrder>();
    (orders ?? []).forEach(o => {
      if (o.order_code != null) m.set(String(o.order_code), o);
    });
    return m;
  }, [orders]);

  const entries = useMemo<Entry[]>(() => {
    if (preview) {
      const ago = (h: number) => new Date(PREVIEW_NOW - h * 3600_000).toISOString();
      return [
        {
          key: 'd1',
          dir: 1,
          label: en ? 'Buy Credits' : 'Nạp Point',
          sub: `${formatVnd(50000)} · đơn #1758…`,
          display: '+55',
          at: ago(2),
          icon: 'coin',
        },
        { key: 'd2', dir: -1, label: 'Mở khóa dịch vụ', sub: '', display: '−30', at: ago(26), icon: 'wallet' },
        { key: 'd3', dir: 1, label: 'Thưởng xem quảng cáo', sub: '', display: '+5', at: ago(49), icon: 'play' },
      ];
    }
    const list = history.txns.map(t => txnToEntry(t, orderMap, en));
    const pending = (orders ?? [])
      .filter(
        o =>
          ['pending', 'failed', 'cancelled', 'expired'].includes(o.status) &&
          !history.txns.some(t => t.reason === 'topup_payos' && t.reference_id === String(o.order_code)),
      )
      .map<Entry>(o => ({
        key: `pending-${o.order_code ?? `${o.amount_vnd}-${o.created_at ?? ''}`}`,
        dir: 0,
        label: en ? 'Buy Credits' : 'Nạp Point',
        sub: `${o.status === 'pending' ? (en ? 'Awaiting payment' : 'Chờ thanh toán · tự hủy sau 10 phút') : en ? 'Order closed' : 'Đơn đã hủy'} · ${formatOrder(o)}`,
        display: o.status === 'pending' ? (en ? 'Pending' : 'Đang chờ') : en ? 'Closed' : 'Đã hủy',
        at: o.created_at ?? '',
        icon: 'coin',
      }));
    return [...list, ...pending].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [preview, history, orders, orderMap, en]);

  const filtered = useMemo(
    () => entries.filter(e => (filter === 'all' ? true : filter === 'in' ? e.dir !== -1 : e.dir === -1)),
    [entries, filter],
  );

  const loadMore = async () => {
    if (!history.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPointsHistory(history.nextCursor);
      setHistory(prev => ({ ...prev, txns: [...prev.txns, ...page.transactions], nextCursor: page.nextCursor }));
    } catch {
      toast.show(copy('Không tải được thêm giao dịch.', 'Unable to load more transactions.'), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const referralCode = summary?.referral.code || '';
  const referralLink =
    referralCode && typeof window !== 'undefined'
      ? `${window.location.origin}${en ? '/en/' : '/'}?ref=${referralCode}`
      : '';

  const checkin = async () => {
    if (checkingIn) return;
    if (preview) {
      toast.show(
        copy(
          'Tài khoản xem thử — điểm danh chỉ hoạt động khi đăng nhập thật.',
          'Preview account — sign in to claim rewards.',
        ),
        'info',
      );
      return;
    }
    const r = await daily.claim();
    if ('error' in r) {
      if (['account_changed', 'checkin_busy'].includes(r.error)) return;
      toast.show(r.error === 'already_checked_in'
        ? copy('Hôm nay bạn đã điểm danh rồi.', 'You have already checked in today.')
        : r.error === 'attendance_disabled'
          ? copy('Điểm danh đang tạm khoá.', 'Check-in is currently paused.')
          : copy('Chưa xác nhận được điểm danh. Kiểm tra lịch sử Point rồi thử lại.', 'Check-in could not be confirmed. Check your transaction history before retrying.'),
        r.error === 'already_checked_in' ? 'info' : 'error');
    } else {
      const bonus = r.milestones.length ? en ? ` — day ${r.milestones.join(', ')} milestone!` : ` — mốc ngày ${r.milestones.join(', ')}!` : '';
      toast.show(`${en ? 'Checked in' : 'Điểm danh thành công'} +${r.points.toLocaleString(en ? 'en-US' : 'vi-VN')} ${unit}${bonus}`, 'success');
    }
    reloadHistory();
  };

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.show(copy('Đã sao chép link giới thiệu.', 'Invite link copied.'), 'success');
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2400);
    } catch {
      toast.show(
        copy(
          'Không sao chép được — hãy giữ và chép thủ công.',
          'Unable to copy. Select the link and copy it manually.',
        ),
        'error',
      );
    }
  };

  const watchAd = () => {
    if (!adBusy) setAdConsent(true);
  };
  const startAd = async () => {
    if (adBusy) return;
    setAdConsent(false);
    setAdBusy(true);
    const controller = new AbortController();
    adController.current = controller;
    let id: string | undefined;
    try {
      const session = await rewardedAdAction('start', undefined, controller.signal);
      id = session.id;
      let readyAt = 0;
      const result = await showRewardedAd({
        adUnit: session.adUnit,
        signal: controller.signal,
        onReady: async () => {
          await rewardedAdAction('ready', id, controller.signal);
          readyAt = Date.now();
        },
        onGrant: async () => {
          const delay = Math.max(0, 5100 - (Date.now() - readyAt));
          if (delay) await new Promise(resolve => setTimeout(resolve, delay));
          let lastError: unknown;
          for (let attempt = 0; attempt < 2; attempt++)
            try {
              return (await rewardedAdAction('grant', id, controller.signal)).points;
            } catch (e) {
              lastError = e;
              if (controller.signal.aborted) throw e;
            }
          throw lastError;
        },
      });
      if (!controller.signal.aborted)
        toast.show(
          result.rewarded
            ? en
              ? `Earned +${result.points} Credits from the ad.`
              : `Đã nhận +${result.points} Point từ quảng cáo.`
            : copy(
                'Bạn đã đóng quảng cáo trước khi được cấp thưởng.',
                'You closed the ad before a reward was granted.',
              ),
          result.rewarded ? 'success' : 'info',
        );
    } catch (e) {
      if (!controller.signal.aborted)
        toast.show(e instanceof Error ? e.message : copy('Chưa tải được quảng cáo.', 'Unable to load an ad.'), 'error');
    } finally {
      if (id) void rewardedAdAction('cancel', id).catch(() => {});
      if (!controller.signal.aborted) {
        void refresh();
        reloadHistory();
        setAdBusy(false);
      }
      adController.current = null;
    }
  };

  /* ----------------------------- Chưa đăng nhập ----------------------------- */
  if (!ready) {
    return <div className={`${styles.skeletonHero} ax-skeleton`} aria-hidden="true" />;
  }
  if (!loggedIn) {
    return (
      <section className={styles.gate}>
        <PointCoin size={44} className={styles.gateCoin} />
        <h3>{copy('Ví AstroX Point', 'AstroX Credits wallet')}</h3>
        <p>
          {copy(
            'Đăng nhập bằng Zalo để xem số dư, nạp Point, kiếm Point miễn phí và lưu lại toàn bộ lịch sử giao dịch.',
            'Sign in with Google to view your balance, buy Credits, earn rewards and see your full transaction history.',
          )}
        </p>
        <button type="button" className={styles.gateLogin} onClick={openLoginDialog}>
          {copy('Đăng nhập bằng Zalo', 'Sign in with Google')}
        </button>
      </section>
    );
  }

  const balance = preview ? 1000 : points;
  const balanceText = balance === null ? null : balance.toLocaleString(en ? 'en-US' : 'vi-VN');
  const filterIndex = FILTERS.findIndex(f => f.id === filter);

  return (
    <div className={styles.wrap}>
      {summaryError && (
        <p role="alert" className={styles.earnNote}>
          {copy('Chưa tải được trạng thái nhận thưởng.', 'Unable to load reward status.')}{' '}
          <button onClick={reloadHistory}>{copy('Thử lại', 'Try again')}</button>
        </p>
      )}
      <dialog
        ref={adDialog}
        onCancel={e => {
          e.preventDefault();
          setAdConsent(false);
        }}
        className={styles.adDialog}
        aria-labelledby="ad-consent-title"
      >
        <h2 id="ad-consent-title">{copy('Xem quảng cáo nhận Point', 'Watch an ad to earn Credits')}</h2>
        <p>
          {copy('Bạn có muốn xem một quảng cáo để nhận', 'Watch an ad to earn')}{' '}
          <strong>
            {summary?.ads?.points || 0} {unit}
          </strong>{' '}
          {copy('khi đủ điều kiện nhận thưởng?', 'when eligible?')}
        </p>
        <p>
          {copy(
            'Quảng cáo do Google cung cấp, có thể có âm thanh. Bạn có thể đóng bất cứ lúc nào; đóng trước khi được cấp thưởng sẽ không nhận Point.',
            'Ads are provided by Google and may include sound. You may close at any time; closing before the reward is granted earns no Credits.',
          )}
        </p>
        <div>
          <button onClick={() => setAdConsent(false)}>{copy('Để sau', 'Later')}</button>
          <button className={styles.adBtn} onClick={() => void startAd()}>
            {copy('Đồng ý xem', 'Watch ad')}
          </button>
        </div>
      </dialog>
      {view === 'earn' ? (
        <EarnPointsView
          unit={unit}
          failed={summaryError}
          summary={summary}
          preview={preview}
          checkingIn={checkingIn}
          adBusy={adBusy}
          copied={copied}
          referralLink={referralLink}
          onCheckin={() => void checkin()}
          onCopy={() => void copyReferral()}
          onAd={watchAd}
        />
      ) : (
        <>
          {/* ------------------------------- Hero số dư ------------------------------ */}
          <section className={styles.hero} aria-label={copy('Số dư AstroX Point', 'AstroX Credits balance')}>
            <span className={styles.heroRings} aria-hidden="true" />
            <span className={styles.heroCoin} aria-hidden="true">
              <i className={styles.heroRing} />
              <PointCoin size={38} />
            </span>
            <div className={styles.heroMain}>
              <p className={styles.heroLabel}>{copy('Số dư khả dụng', 'Available balance')}</p>
              <p className={styles.heroBalance}>
                {balanceText === null ? (
                  <span className={styles.dots} role="status">
                    {status === 'error' ? copy('Chưa tải được', 'Unable to load') : '•••'}
                  </span>
                ) : (
                  <>
                    <NumberPopIn value={balanceText} className={styles.heroNumber} />
                    <ShimmerText
                      text={unit}
                      className={styles.heroUnit}
                      style={{ ['--shimmer-base' as string]: '#dfd1a4', ['--shimmer-highlight' as string]: '#fff6d8' }}
                    />
                  </>
                )}
              </p>
              {preview && (
                <span className={styles.previewTag}>
                  {copy('localhost · dữ liệu minh họa', 'localhost · preview data')}
                </span>
              )}
              {status === 'error' && !preview && (
                <button type="button" className={styles.retry} onClick={() => void refresh()}>
                  {copy('Thử lại ↻', 'Try again ↻')}
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.topupBtn}
              onClick={() => setTopupOpen(true)}
              disabled={preview}
              title={
                preview
                  ? copy(
                      'Tài khoản xem thử — mở trên theastrox.space để nạp thật',
                      'Preview account — sign in on theastrox.space to buy Credits',
                    )
                  : undefined
              }
              aria-label={copy('Nạp AstroX Point', 'Buy AstroX Credits')}
            >
              <PointCoin size={17} />
              {copy('Nạp Point', 'Buy Credits')}
            </button>
          </section>

          <Link href={en ? '/en/profile?section=earn' : '/hoso?section=earn'} className={styles.earnLink}>
            <span>
              <FeatureIcon name="explore" size={25} />
            </span>
            <div>
              <strong>{copy('Kiếm thêm Point', 'Earn more Credits')}</strong>
              <p>{copy('Điểm danh · Mời bạn · Xem quảng cáo', 'Check in · Invite friends · Watch ads')}</p>
            </div>
            <b aria-hidden="true">↗</b>
          </Link>

          {/* ------------------------------ Lịch sử Point ---------------------------- */}
          <div className="ax-stagger is-shown">
            <section className={styles.ledger} aria-label={copy('Lịch sử Point', 'Credits history')}>
              <header className={`ax-stagger-line ${styles.ledgerHeading}`}>
                <h2>
                  <FeatureIcon name="wallet" size={20} />
                  {copy('Lịch sử Point', 'Credits history')}
                </h2>
                <div
                  className={styles.filter}
                  role="group"
                  aria-label={copy('Lọc lịch sử theo chiều giao dịch', 'Filter transactions')}
                >
                  <span
                    className={styles.filterPill}
                    style={{ transform: `translateX(${filterIndex * 100}%)` }}
                    aria-hidden="true"
                  />
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={filter === f.id}
                      className={filter === f.id ? styles.filterOn : undefined}
                      onClick={() => setFilter(f.id)}
                    >
                      {en ? { all: 'All', in: `${unit} added`, out: `${unit} spent` }[f.id] : f.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className={`${styles.rows} ax-stagger-line`} key={filter}>
                {!preview && history.status === 'error' ? (
                  <div className={styles.empty}>
                    <PointCoin size={40} className={styles.emptyCoin} />
                    <p>{copy('Không tải được lịch sử Point.', 'Unable to load Credits history.')}</p>
                    <button type="button" onClick={reloadHistory}>
                      {copy('Thử lại ↻', 'Try again ↻')}
                    </button>
                  </div>
                ) : !preview && (history.status === 'loading' || orders === null) ? (
                  <div className={styles.rowSkeletons} aria-hidden="true">
                    <span className="ax-skeleton" />
                    <span className="ax-skeleton" />
                    <span className="ax-skeleton" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className={styles.empty}>
                    <PointCoin size={40} className={styles.emptyCoin} />
                    {filter === 'out' ? (
                      <p>
                        {copy('Chưa tiêu Point nào.', 'No Credits spent yet.')}
                        <br />
                        {copy(
                          'Point dùng để mở khóa các dịch vụ chiêm tinh AstroX.',
                          'Use Credits to unlock AstroX readings.',
                        )}
                      </p>
                    ) : filter === 'in' ? (
                      <p>{copy('Chưa có Point nào được cộng vào ví.', 'No Credits added yet.')}</p>
                    ) : (
                      <p>{copy('Chưa có giao dịch Point nào.', 'No transactions yet.')}</p>
                    )}
                    <button type="button" onClick={() => setTopupOpen(true)}>
                      {copy('Nạp Point ngay', 'Buy Credits now')}
                    </button>
                  </div>
                ) : (
                  <>
                    {filtered.map((e, i) => (
                      <div
                        key={e.key}
                        className={styles.row}
                        style={{ ['--i' as string]: String(Math.min(i, 8)) }}
                        data-dir={e.dir === -1 ? 'out' : e.dir === 0 ? 'pending' : 'in'}
                      >
                        <span className={styles.rowIcon}>
                          <EntryIcon icon={e.icon} />
                        </span>
                        <div className={styles.rowMain}>
                          <p className={styles.rowLabel}>
                            {e.dir === 0 && e.display === 'Đang chờ' && (
                              <i className={styles.pendingDot} aria-hidden="true" />
                            )}
                            {e.label}
                          </p>
                          {e.sub && <p className={styles.rowSub}>{e.sub}</p>}
                        </div>
                        <div className={styles.rowRight}>
                          <p className={styles.rowDelta}>{e.display}</p>
                          <p className={styles.rowWhen}>{formatWhen(e.at)}</p>
                        </div>
                      </div>
                    ))}
                    {history.nextCursor && (
                      <div className={styles.moreRow}>
                        <button
                          type="button"
                          className={styles.moreBtn}
                          onClick={() => void loadMore()}
                          disabled={loadingMore}
                        >
                          {loadingMore
                            ? copy('Đang tải…', 'Loading…')
                            : copy('Xem thêm giao dịch', 'Load more transactions')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </>
      )}
      <TopupPanel
        open={topupOpen}
        onClose={() => {
          setTopupOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}
