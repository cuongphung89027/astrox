"use client";

/**
 * Màn Ví AstroX Point (/hoso?section=points):
 * - Hero số dư (đồng xu Đông Sơn, NumberPopIn, nạp nhanh qua TopupPanel).
 * - "Kiếm thêm Point": giới thiệu bạn bè + xem quảng cáo — trạng thái & mức
 *   thưởng đọc từ cấu hình admin đã xuất bản (/api/site-config → rewards),
 *   chưa bật thì hiện "Sắp mở" trung thực, không thưởng giả.
 * - Lịch sử Point: gộp ledger (nạp/cộng/trừ, phân trang cursor) + đơn nạp
 *   đang chờ thanh toán; lọc Tất cả / Cộng / Tiêu.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { openLoginDialog } from "@/lib/login-dialog";
import { usePointsBalance } from "@/lib/points";
import { rewardedAdAction, fetchRewardsSummary, loadPointsHistory, loadTopupHistory, rewardsCheckin, type PointTxn, type RewardsSummary, type TopupOrder } from "@/lib/api";
import { FeatureIcon } from "@/components/kit/FeatureIcon";
import { NumberPopIn, ShimmerText, useToast } from "@/components/motion";
import { TopupPanel } from "@/components/topup/TopupPanel";
import {showRewardedAd} from "@/lib/rewarded-ad";
import { PointCoin } from "./PointCoin";
import styles from "./PointsHome.module.css";

type Filter = "all" | "in" | "out";

interface Entry {
  key: string;
  /** 1 = vào ví, -1 = ra khỏi ví, 0 = đang chờ thanh toán. */
  dir: 1 | -1 | 0;
  label: string;
  sub: string;
  display: string;
  at: string;
  icon: "coin" | "invite" | "play" | "calendar" | "wallet";
}

/** Mức thưởng admin cấu hình (publicConfig.rewards) — null khi chưa tải được. */
interface RewardsInfo {
  enabled: boolean;
  registrationEnabled: boolean;
  registrationInviter: number;
  firstTopupEnabled: boolean;
  firstTopupInviter: number;
  ads: { enabled: boolean; points: number; dailyLimit: number };
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "in", label: "Cộng Point" },
  { id: "out", label: "Tiêu Point" },
];

const REASON_LABELS: Record<string, string> = {
  topup_payos: "Nạp Point",
  ad_reward: "Thưởng xem quảng cáo",
  referral: "Thưởng giới thiệu bạn bè",
  attendance: "Điểm danh hàng ngày",
  milestone: "Thưởng chuỗi điểm danh",
  admin_adjust: "Điều chỉnh từ AstroX",
  ai_service: "Luận giải dịch vụ trả phí",
  ai_service_refund: "Hoàn Point luận giải",
  unlock: "Mở khóa dịch vụ",
};

function formatVnd(n: number): string {
  return `${n.toLocaleString("vi-VN")}đ`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const signed = (dir: 1 | -1 | 0, n: number) => `${dir === -1 ? "−" : "+"}${n.toLocaleString("vi-VN")}`;

/** Thời điểm tải module — dùng cho mốc thời gian của dòng lịch sử minh họa (preview). */
const PREVIEW_NOW = typeof window === "undefined" ? Date.parse("2026-09-22T09:00:00.000Z") : Date.now();

function txnToEntry(t: PointTxn, orders: Map<string, TopupOrder>): Entry {
  const dir: 1 | -1 = t.delta >= 0 ? 1 : -1;
  const known = Object.keys(REASON_LABELS).some((k) => t.reason === k || t.reason.startsWith(`${k}:`) || t.reason.startsWith(k));
  let label = dir === 1 ? "Cộng Point" : "Dùng Point";
  let icon: Entry["icon"] = dir === 1 ? "coin" : "wallet";
  if (t.reason === "topup_payos") {
    label = REASON_LABELS.topup_payos;
    const order = t.reference_id ? orders.get(t.reference_id) : undefined;
    const amount = order ? formatVnd(order.amount_vnd) : t.reference_id ? `đơn #${t.reference_id}` : "";
    return { key: t.id, dir, label, sub: amount, display: signed(dir, t.delta), at: t.created_at, icon: "coin" };
  }
  if (known) {
    label = REASON_LABELS[Object.keys(REASON_LABELS).find((k) => t.reason === k || t.reason.startsWith(`${k}:`) || t.reason.startsWith(k))!];
    icon = t.reason.startsWith("referral") ? "invite" : t.reason.startsWith("ad") ? "play" : t.reason.startsWith("attendance") || t.reason.startsWith("milestone") ? "calendar" : "coin";
  }
  return { key: t.id, dir, label, sub: "", display: signed(dir, t.delta), at: t.created_at, icon };
}

function EntryIcon({ icon }: { icon: Entry["icon"] }) {
  if (icon === "coin") return <PointCoin size={19} />;
  return <FeatureIcon name={icon === "invite" ? "invite" : icon === "play" ? "play" : icon === "calendar" ? "calendar" : "wallet"} size={19} />;
}

/** Lịch sử: status đổi qua callback của promise (không setState đồng bộ trong effect). */
interface HistoryState {
  status: "loading" | "ready" | "error";
  txns: PointTxn[];
  nextCursor: string | null;
}

export function PointsHome() {
  const { loggedIn, ready, astroxUser } = useAuth();
  const preview = astroxUser?.id === "localhost-preview";
  const { points, status, refresh } = usePointsBalance(!preview);
  const toast = useToast();

  const [topupOpen, setTopupOpen] = useState(false);
  const [rewards, setRewards] = useState<RewardsInfo | null | undefined>(undefined);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [summaryError,setSummaryError]=useState(false);
  const [adConsent,setAdConsent]=useState(false),[adBusy,setAdBusy]=useState(false);
  const adDialog=useRef<HTMLDialogElement>(null),adController=useRef<AbortController|null>(null);
  useEffect(()=>{if(adConsent)adDialog.current?.showModal();else adDialog.current?.close();},[adConsent]);
  useEffect(()=>()=>{adController.current?.abort();},[]);
  const [history, setHistory] = useState<HistoryState>({ status: "loading", txns: [], nextCursor: null });
  const [orders, setOrders] = useState<TopupOrder[] | null>(null);
  const [historyEpoch, setHistoryEpoch] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cấu hình phần thưởng từ admin (đã xuất bản) — quyết định trạng thái 2 thẻ "Kiếm Point".
  useEffect(() => {
    let alive = true;
    fetch("/api/site-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const rw = d?.config?.rewards;
        setRewards(
          rw && typeof rw === "object"
            ? {
                enabled: Boolean(rw.enabled),
                registrationEnabled: Boolean(rw.registrationEnabled),
                registrationInviter: Number(rw.registrationInviter) || 0,
                firstTopupEnabled: Boolean(rw.firstTopupEnabled),
                firstTopupInviter: Number(rw.firstTopupInviter) || 0,
                ads: {
                  enabled: Boolean(rw.ads?.enabled),
                  points: Number(rw.ads?.points) || 0,
                  dailyLimit: Number(rw.ads?.dailyLimit) || 0,
                },
              }
            : null,
        );
      })
      .catch(() => alive && setRewards(null));
    return () => {
      alive = false;
    };
  }, []);

  // Lịch sử: trang đầu ledger + đơn nạp (lấy amount_vnd + đơn đang chờ).
  // historyEpoch tăng khi bấm "Thử lại" để chạy lại effect.
  useEffect(() => {
    if (!loggedIn || !astroxUser || preview) return;
    let alive = true;
    fetchRewardsSummary()
      .then((s) => { if (alive) {setSummary(s);setSummaryError(false);} })
      .catch(() => { if (alive) {setSummary(null);setSummaryError(true);} });
    loadPointsHistory()
      .then((p) => {
        if (alive) setHistory({ status: "ready", txns: p.transactions, nextCursor: p.nextCursor });
      })
      .catch(() => {
        if (alive) setHistory({ status: "error", txns: [], nextCursor: null });
      });
    loadTopupHistory()
      .then((o) => {
        if (alive) setOrders(o);
      })
      .catch(() => {
        if (alive) setOrders([]);
      });
    return () => {
      alive = false;
    };
  }, [loggedIn, astroxUser, preview, historyEpoch]);

  const reloadHistory = useCallback(() => setHistoryEpoch((n) => n + 1), []);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const orderMap = useMemo(() => {
    const m = new Map<string, TopupOrder>();
    (orders ?? []).forEach((o) => {
      if (o.order_code != null) m.set(String(o.order_code), o);
    });
    return m;
  }, [orders]);

  const entries = useMemo<Entry[]>(() => {
    if (preview) {
      const ago = (h: number) => new Date(PREVIEW_NOW - h * 3600_000).toISOString();
      return [
        { key: "d1", dir: 1, label: "Nạp Point", sub: `${formatVnd(50000)} · đơn #1758…`, display: "+55", at: ago(2), icon: "coin" },
        { key: "d2", dir: -1, label: "Mở khóa dịch vụ", sub: "", display: "−30", at: ago(26), icon: "wallet" },
        { key: "d3", dir: 1, label: "Thưởng xem quảng cáo", sub: "", display: "+5", at: ago(49), icon: "play" },
      ];
    }
    const list = history.txns.map((t) => txnToEntry(t, orderMap));
    const pending = (orders ?? [])
      .filter((o) => o.status === "pending" && !history.txns.some((t) => t.reason === "topup_payos" && t.reference_id === String(o.order_code)))
      .map<Entry>((o) => ({
        key: `pending-${o.order_code ?? `${o.amount_vnd}-${o.created_at ?? ""}`}`,
        dir: 0,
        label: "Nạp Point",
        sub: `Chưa thanh toán · ${formatVnd(o.amount_vnd)}`,
        display: `+${o.points.toLocaleString("vi-VN")}`,
        at: o.created_at ?? "",
        icon: "coin",
      }));
    return [...list, ...pending].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [preview, history, orders, orderMap]);

  const filtered = useMemo(
    () => entries.filter((e) => (filter === "all" ? true : filter === "in" ? e.dir !== -1 : e.dir === -1)),
    [entries, filter],
  );

  const loadMore = async () => {
    if (!history.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPointsHistory(history.nextCursor);
      setHistory((prev) => ({ ...prev, txns: [...prev.txns, ...page.transactions], nextCursor: page.nextCursor }));
    } catch {
      toast.show("Không tải được thêm giao dịch.", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const referralCode = summary?.referral.code || "";
  const referralLink = referralCode && typeof window !== "undefined" ? `${window.location.origin}/?ref=${referralCode}` : "";
  const referralOpen = Boolean(rewards?.enabled && rewards.registrationEnabled);
  const adsOpen = Boolean(summary?.enabled && summary.ads?.enabled);
  const attendanceOpen = Boolean(summary?.enabled && summary.attendance.enabled) || preview;
  const attendanceToday = preview ? true : Boolean(summary?.attendance.today);

  const checkin = async () => {
    if (checkingIn) return;
    if (preview) { toast.show("Tài khoản xem thử — điểm danh chỉ hoạt động khi đăng nhập thật.", "info"); return; }
    setCheckingIn(true);
    try {
      const r = await rewardsCheckin();
      if ("error" in r) {
        if (r.error === "already_checked_in") {
          toast.show("Hôm nay bạn đã điểm danh rồi.", "info");
          setSummary((s) => (s ? { ...s, attendance: { ...s.attendance, today: true } } : s));
        } else if (r.error === "attendance_disabled") {
          toast.show("Điểm danh đang tạm khoá.", "error");
        } else {
          toast.show("Không điểm danh được — thử lại sau.", "error");
        }
      } else {
        const bonus = r.milestones.length ? ` — mốc ngày ${r.milestones.join(", ")}!` : "";
        toast.show(`Điểm danh thành công +${r.points.toLocaleString("vi-VN")} Point${bonus}`, "success");
        void refresh();
        reloadHistory();
        setSummary((s) => (s ? { ...s, attendance: { ...s.attendance, today: true, streak: r.streak, lastDay: r.day, claimed:[...new Set([...s.attendance.claimed,...r.milestones])] } } : s));
      }
    } catch {toast.show("Chưa xác nhận được điểm danh. Kiểm tra lịch sử Point rồi thử lại.","error");reloadHistory();
    } finally {
      setCheckingIn(false);
    }
  };

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.show("Đã sao chép link giới thiệu.", "success");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2400);
    } catch {
      toast.show("Không sao chép được — hãy giữ và chép thủ công.", "error");
    }
  };

  const watchAd=()=>{if(!adBusy)setAdConsent(true);};
  const startAd=async()=>{
    if(adBusy)return;setAdConsent(false);setAdBusy(true);
    const controller=new AbortController();adController.current=controller;let id:string|undefined;
    try{
      const session=await rewardedAdAction('start',undefined,controller.signal);id=session.id;let readyAt=0;
      const result=await showRewardedAd({adUnit:session.adUnit,signal:controller.signal,
        onReady:async()=>{await rewardedAdAction('ready',id,controller.signal);readyAt=Date.now();},
        onGrant:async()=>{
          const delay=Math.max(0,5100-(Date.now()-readyAt));if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
          let lastError:unknown;
          for(let attempt=0;attempt<2;attempt++)try{return (await rewardedAdAction('grant',id,controller.signal)).points;}catch(e){lastError=e;if(controller.signal.aborted)throw e;}
          throw lastError;
        }});
      if(!controller.signal.aborted)toast.show(result.rewarded?`Đã nhận +${result.points} Point từ quảng cáo.`:'Bạn đã đóng quảng cáo trước khi được cấp thưởng.',result.rewarded?'success':'info');
    }catch(e){if(!controller.signal.aborted)toast.show(e instanceof Error?e.message:'Chưa tải được quảng cáo.','error');}
    finally{
      if(id)void rewardedAdAction('cancel',id).catch(()=>{});
      if(!controller.signal.aborted){void refresh();reloadHistory();setAdBusy(false);}adController.current=null;
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
        <h3>Ví AstroX Point</h3>
        <p>Đăng nhập bằng Zalo để xem số dư, nạp Point, kiếm Point miễn phí và lưu lại toàn bộ lịch sử giao dịch.</p>
        <button type="button" className={styles.gateLogin} onClick={openLoginDialog}>
          Đăng nhập bằng Zalo
        </button>
      </section>
    );
  }

  const balance = preview ? 1000 : points;
  const balanceText = balance === null ? null : balance.toLocaleString("vi-VN");
  const filterIndex = FILTERS.findIndex((f) => f.id === filter);

  return (
    <div className={styles.wrap}>
      {summaryError&&<p role="alert" className={styles.earnNote}>Chưa tải được trạng thái nhận thưởng. <button onClick={reloadHistory}>Thử lại</button></p>}
      <dialog ref={adDialog} onCancel={e=>{e.preventDefault();setAdConsent(false);}} className={styles.adDialog} aria-labelledby="ad-consent-title">
        <h2 id="ad-consent-title">Xem quảng cáo nhận Point</h2><p>Bạn có muốn xem một quảng cáo để nhận <strong>{summary?.ads?.points||0} Point</strong> khi đủ điều kiện nhận thưởng?</p>
        <p>Quảng cáo do Google cung cấp, có thể có âm thanh. Bạn có thể đóng bất cứ lúc nào; đóng trước khi được cấp thưởng sẽ không nhận Point.</p>
        <div><button onClick={()=>setAdConsent(false)}>Để sau</button><button className={styles.adBtn} onClick={()=>void startAd()}>Đồng ý xem</button></div>
      </dialog>
      {/* ------------------------------- Hero số dư ------------------------------ */}
      <section className={styles.hero} aria-label="Số dư AstroX Point">
        <span className={styles.heroRings} aria-hidden="true" />
        <span className={styles.heroCoin} aria-hidden="true">
          <i className={styles.heroRing} />
          <PointCoin size={38} />
        </span>
        <div className={styles.heroMain}>
          <p className={styles.heroLabel}>Số dư khả dụng</p>
          <p className={styles.heroBalance}>
            {balanceText === null ? (
              <span className={styles.dots} role="status">{status === "error" ? "Chưa tải được" : "•••"}</span>
            ) : (
              <>
                <NumberPopIn value={balanceText} className={styles.heroNumber} />
                <ShimmerText text="Point" className={styles.heroUnit} style={{ ["--shimmer-base" as string]: "#dfd1a4", ["--shimmer-highlight" as string]: "#fff6d8" }} />
              </>
            )}
          </p>
          {preview && <span className={styles.previewTag}>localhost · dữ liệu minh họa</span>}
          {status === "error" && !preview && (
            <button type="button" className={styles.retry} onClick={() => void refresh()}>
              Thử lại ↻
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.topupBtn}
          onClick={() => setTopupOpen(true)}
          disabled={preview}
          title={preview ? "Tài khoản xem thử — mở trên theastrox.space để nạp thật" : undefined}
          aria-label="Nạp AstroX Point"
        >
          <PointCoin size={17} />
          Nạp Point
        </button>
      </section>

      {/* ---------------------------- Kiếm thêm Point ---------------------------- */}
      <div className="ax-stagger is-shown">
        <section className={styles.earn} aria-label="Kiếm thêm Point">
          <header className={`ax-stagger-line ${styles.earnHeading}`}>
            <h2>
              <FeatureIcon name="explore" size={20} />
              Kiếm thêm Point
            </h2>
          </header>
          <div className={`${styles.earnGrid} ax-stagger-line`}>
            {/* Điểm danh hàng ngày */}
            <article className={styles.earnCard}>
              <span className={`${styles.earnIcon} ${attendanceOpen ? styles.earnIconOn : ""}`}>
                <FeatureIcon name="calendar" size={22} />
              </span>
              <div className={styles.earnBody}>
                <h3>Điểm danh hàng ngày</h3>
                <p className={styles.earnLine}>
                  {!attendanceOpen ? (
                    <span className={styles.miniSkeleton} aria-label="Đang tải mức thưởng" />
                  ) : (
                    <>
                      <b>+{(preview ? 2 : summary?.attendance.daily ?? 0).toLocaleString("vi-VN")}</b> Point mỗi ngày
                      {(summary?.attendance.milestones?.length || 0) > 0 && summary && (
                        <> · mốc {summary.attendance.milestones.map((m) => `ngày ${m.day} (+${m.points})`).join(", ")}</>
                      )}
                    </>
                  )}
                </p>
                {attendanceOpen ? (
                  <>
                    <div className={styles.checkinRow}>
                      <span className={styles.streakChip} aria-label="Chuỗi điểm danh">
                        Chuỗi <b>{summary?.attendance.streak ?? 0}</b> ngày
                      </span>
                      <button type="button" className={styles.adBtn} onClick={checkin} disabled={checkingIn || (attendanceToday && !preview)}>
                        {!preview && attendanceToday ? "Đã điểm danh hôm nay ✓" : checkingIn ? "Đang ghi…" : "Điểm danh ngay"}
                      </button>
                    </div>
                    <div className={styles.milestones} aria-label="Mốc thưởng điểm danh">{summary?.attendance.milestones.map(m=><div key={m.day} data-claimed={summary.attendance.claimed.includes(m.day)}><span>Ngày {m.day}</span><strong>+{m.points} Point</strong><small>{summary.attendance.claimed.includes(m.day)?'Đã nhận ✓':`Còn ${Math.max(0,m.day-summary.attendance.streak)} ngày`}</small></div>)}</div>
                    <p className={styles.earnNote}>Ngày điểm danh tính theo giờ Việt Nam. Bỏ một ngày thì chuỗi tính lại; mỗi mốc thưởng chỉ nhận một lần cho mỗi tài khoản.</p>
                  </>
                ) : (
                  <p className={styles.earnNote}>
                    <span className={styles.soonChip}>Sắp mở</span>
                    Điểm danh chưa mở hoặc chưa tải được trạng thái tài khoản.
                  </p>
                )}
              </div>
            </article>

            {/* Giới thiệu bạn bè */}
            <article className={styles.earnCard}>
              <span className={`${styles.earnIcon} ${referralOpen ? styles.earnIconOn : ""}`}>
                <FeatureIcon name="invite" size={22} />
              </span>
              <div className={styles.earnBody}>
                <h3>Giới thiệu bạn bè</h3>
                <p className={styles.earnLine}>
                  {rewards == null ? (
                    <span className={styles.miniSkeleton} aria-label="Đang tải mức thưởng" />
                  ) : (
                    <>
                      <b>+{rewards.registrationInviter.toLocaleString("vi-VN")}</b> Point khi bạn bè đăng ký
                      {rewards.firstTopupEnabled && rewards.firstTopupInviter > 0 && (
                        <> · <b>+{rewards.firstTopupInviter.toLocaleString("vi-VN")}</b> Point khi họ nạp lần đầu</>
                      )}
                    </>
                  )}
                </p>
                {referralOpen ? (
                  <>
                    <div className={styles.refRow}>
                      <input readOnly placeholder="Đang tải link giới thiệu…" value={referralLink} aria-label="Link giới thiệu của bạn" onFocus={(e) => e.currentTarget.select()} />
                      <button type="button" onClick={copyReferral} disabled={!referralLink} aria-label="Sao chép link giới thiệu">
                        {copied ? "Đã chép ✓" : "Sao chép"}
                      </button>
                    </div>
                    <p className={styles.earnNote}>
                      Thưởng khi bạn bè hoàn tất đăng ký Zalo lần đầu qua link này{!preview && summary ? ` — đã mời ${summary.referral.invited} người · nhận ${summary.referral.earned.toLocaleString("vi-VN")} Point` : ""}.
                    </p>
                    <p className={styles.earnNote}>Người mới nhận +{summary?.referral.registrationUser||0} Point. {summary?.referral.firstTopupMinVnd?`Thưởng nạp đầu áp dụng từ ${summary.referral.firstTopupMinVnd.toLocaleString('vi-VN')}đ.`:''} Thưởng mốc điểm danh của bạn bè: {summary?.attendance.milestones.filter(m=>(m.inviterPoints||0)>0).map(m=>`ngày ${m.day}: +${m.inviterPoints} Point`).join(' · ')}.</p>
                  </>
                ) : (
                  <p className={styles.earnNote}>
                    <span className={styles.soonChip}>Sắp mở</span>
                    Chương trình giới thiệu đang được hoàn thiện — mức thưởng hiển thị theo cấu hình chính thức.
                  </p>
                )}
              </div>
            </article>

            {/* Xem quảng cáo */}
            <article className={styles.earnCard}>
              <span className={`${styles.earnIcon} ${adsOpen ? styles.earnIconOn : ""}`}>
                <FeatureIcon name="play" size={22} />
              </span>
              <div className={styles.earnBody}>
                <h3>Xem quảng cáo</h3>
                <p className={styles.earnLine}>
                  {rewards == null ? (
                    <span className={styles.miniSkeleton} aria-label="Đang tải mức thưởng" />
                  ) : (
                    <>
                      <b>+{rewards.ads.points.toLocaleString("vi-VN")}</b> Point mỗi lượt · tối đa{" "}
                      <b>{rewards.ads.dailyLimit.toLocaleString("vi-VN")}</b> lượt/ngày
                    </>
                  )}
                </p>
                {adsOpen ? (
                  <>
                    <button type="button" className={styles.adBtn} onClick={watchAd} disabled={adBusy||(summary?.ads?.used||0)>=(summary?.ads?.dailyLimit||0)}>
                      <FeatureIcon name="play" size={16} />
                      {adBusy?'Đang mở quảng cáo…':(summary?.ads?.used||0)>=(summary?.ads?.dailyLimit||0)?'Đã đủ lượt hôm nay':'Xem quảng cáo nhận Point'}
                    </button>
                    <p className={styles.earnNote}>Đã nhận {summary?.ads?.used||0}/{summary?.ads?.dailyLimit||0} lượt hôm nay · Chờ {summary?.ads?.cooldownSeconds||0} giây giữa hai lượt. Phần thưởng được ghi khi mạng quảng cáo cấp thưởng.</p>
                  </>
                ) : (
                  <p className={styles.earnNote}>
                    <span className={styles.soonChip}>Sắp mở</span>
                    Đang kết nối mạng quảng cáo — không có thưởng thử nghiệm, chỉ thưởng khi xem quảng cáo thật.
                  </p>
                )}
              </div>
            </article>
          </div>
        </section>
      </div>

      {/* ------------------------------ Lịch sử Point ---------------------------- */}
      <div className="ax-stagger is-shown">
        <section className={styles.ledger} aria-label="Lịch sử Point">
          <header className={`ax-stagger-line ${styles.ledgerHeading}`}>
            <h2>
              <FeatureIcon name="wallet" size={20} />
              Lịch sử Point
            </h2>
            <div className={styles.filter} role="group" aria-label="Lọc lịch sử theo chiều giao dịch">
              <span className={styles.filterPill} style={{ transform: `translateX(${filterIndex * 100}%)` }} aria-hidden="true" />
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  className={filter === f.id ? styles.filterOn : undefined}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </header>

          <div className={`${styles.rows} ax-stagger-line`} key={filter}>
            {!preview && history.status === "error" ? (
              <div className={styles.empty}>
                <PointCoin size={40} className={styles.emptyCoin} />
                <p>Không tải được lịch sử Point.</p>
                <button type="button" onClick={reloadHistory}>Thử lại ↻</button>
              </div>
            ) : !preview && (history.status === "loading" || orders === null) ? (
              <div className={styles.rowSkeletons} aria-hidden="true">
                <span className="ax-skeleton" />
                <span className="ax-skeleton" />
                <span className="ax-skeleton" />
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.empty}>
                <PointCoin size={40} className={styles.emptyCoin} />
                {filter === "out" ? (
                  <p>Chưa tiêu Point nào.<br />Point dùng để mở khóa các dịch vụ chiêm tinh AstroX.</p>
                ) : filter === "in" ? (
                  <p>Chưa có Point nào được cộng vào ví.</p>
                ) : (
                  <p>Chưa có giao dịch Point nào.</p>
                )}
                <button type="button" onClick={() => setTopupOpen(true)}>Nạp Point ngay</button>
              </div>
            ) : (
              <>
                {filtered.map((e, i) => (
                  <div
                    key={e.key}
                    className={styles.row}
                    style={{ ["--i" as string]: String(Math.min(i, 8)) }}
                    data-dir={e.dir === -1 ? "out" : e.dir === 0 ? "pending" : "in"}
                  >
                    <span className={styles.rowIcon}>
                      <EntryIcon icon={e.icon} />
                    </span>
                    <div className={styles.rowMain}>
                      <p className={styles.rowLabel}>
                        {e.dir === 0 && <i className={styles.pendingDot} aria-hidden="true" />}
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
                    <button type="button" className={styles.moreBtn} onClick={() => void loadMore()} disabled={loadingMore}>
                      {loadingMore ? "Đang tải…" : "Xem thêm giao dịch"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

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
