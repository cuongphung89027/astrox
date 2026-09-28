'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { registerReadingConsent, type ReadingQuote, type ReadingSelection } from '@/lib/reading-consent';
import { useLocale } from '@/i18n/LocaleProvider';
export function PaidReadingConsent() {
  const t = useLocale();
  const en = t.locale === 'en';

  const dialog = useRef<HTMLDialogElement>(null),
    finish = useRef<((decision: { accepted: boolean; selection?: ReadingSelection }) => void) | null>(null);
  const [quote, setQuote] = useState<ReadingQuote | null>(null),
    [selected, setSelected] = useState('');
  const unit = quote?.market ? (quote.market === 'US' ? 'Credits' : 'Point') : en ? 'Credits' : 'Point';
  const offer = quote?.offers?.find(o => o.id === selected),
    points = offer?.points ?? quote?.points ?? 0;
  const decide = (accepted: boolean) => {
    const selection =
      offer && quote
        ? {
            offerId: offer.id,
            points: offer.points,
            revision: quote.revision!,
            version: quote.version!,
            scopeKey: quote.scopeKey!,
            expiresAt: offer.expiresAt,
          }
        : undefined;
    finish.current?.({ accepted, selection });
    finish.current = null;
    setQuote(null);
  };
  useEffect(() => {
    const unregister = registerReadingConsent(
      (q, signal) =>
        new Promise(resolve => {
          if (finish.current || signal?.aborted) {
            resolve({ accepted: false });
            return;
          }
          const cancel = () => {
            finish.current?.({ accepted: false });
            finish.current = null;
            setQuote(null);
          };
          finish.current = decision => {
            signal?.removeEventListener('abort', cancel);
            resolve(decision);
          };
          signal?.addEventListener('abort', cancel, { once: true });
          setSelected(q.offers?.[0]?.id ?? '');
          setQuote(q);
        }),
    );
    return () => {
      unregister();
      finish.current?.({ accepted: false });
    };
  }, []);
  useEffect(() => {
    if (quote) dialog.current?.showModal();
    else dialog.current?.close();
  }, [quote]);
  return (
    <dialog
      ref={dialog}
      onCancel={e => {
        e.preventDefault();
        decide(false);
      }}
      aria-labelledby="paid-reading-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg overflow-y-auto rounded-3xl border border-[#ccd5bf] bg-[#fffaf0] p-6 text-[#244d40] backdrop:bg-black/35 sm:p-8"
    >
      <h2 id="paid-reading-title" className="font-display text-2xl">
        {quote?.offers
          ? en
            ? 'Choose what to unlock'
            : 'Chọn phần muốn mở'
          : en
            ? 'Confirm this reading'
            : 'Xác nhận lượt luận giải'}
      </h2>
      <p className="mt-2 text-sm">{quote?.name}</p>
      {quote?.offers && (
        <fieldset className="mt-5 space-y-3">
          <legend className="sr-only">{en ? 'Unlock scope' : 'Phạm vi mở khóa'}</legend>
          {quote.offers.map(o => (
            <label
              key={o.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${selected === o.id ? 'border-[#244d40] bg-[#edf0e2]' : 'border-[#ccd5bf]'}`}
            >
              <input
                type="radio"
                name="reading-offer"
                checked={selected === o.id}
                onChange={() => setSelected(o.id)}
                className="mt-1 accent-[#244d40]"
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{o.name}</strong>
                <span className="mt-1 block text-xs">
                  {o.owned
                    ? en
                      ? 'Unlocked'
                      : 'Đã mở'
                    : en
                      ? `${o.members.length} readings`
                      : `${o.members.length} phần luận giải`}{' '}
                  · {o.expiresAt ? (en ? 'This period' : 'Kỳ hiện tại') : en ? 'Per profile' : 'Theo hồ sơ'}
                </span>
              </span>
              <strong className="whitespace-nowrap text-sm">
                {o.points.toLocaleString(en ? 'en-US' : 'vi-VN')} {unit}
              </strong>
            </label>
          ))}
        </fieldset>
      )}
      {offer && (
        <>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{en ? 'List price' : 'Giá niêm yết'}</dt>
              <dd>
                {offer.basePoints.toLocaleString(en ? 'en-US' : 'vi-VN')} {unit}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                {offer.owned
                  ? en
                    ? 'Already owned'
                    : 'Đã sở hữu'
                  : en
                    ? 'Credit for owned parts'
                    : 'Khấu trừ phần đã mua'}
              </dt>
              <dd>
                −{(offer.owned ? offer.basePoints : offer.credit).toLocaleString(en ? 'en-US' : 'vi-VN')} {unit}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-6">
            {quote?.scopeLabel}
            {offer.expiresAt
              ? ` · ${en ? 'until ' : 'đến '}${new Date(offer.expiresAt).toLocaleString(en ? 'en-US' : 'vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
              : en
                ? '. The bundle covers profile-based readings; period forecasts are sold separately.'
                : '. Gói bao gồm các luận giải theo hồ sơ; dự báo theo kỳ được mua riêng.'}
          </p>
        </>
      )}
      <p className="my-5 text-3xl font-semibold" aria-live="polite">
        {points.toLocaleString(en ? 'en-US' : 'vi-VN')} {unit}
      </p>
      <p className="text-sm leading-6">
        {offer?.owned
          ? en
            ? 'Already unlocked for this profile. This reading deducts nothing.'
            : 'Phần này đã được mở cho hồ sơ đang xem. Lượt đọc này không trừ thêm Point.'
          : en
            ? 'Credits are deducted when the reading starts. If the system fails to complete it, they are refunded.'
            : 'Point được trừ khi bắt đầu. Nếu hệ thống không hoàn thành lượt này, Point sẽ được hoàn lại.'}
      </p>
      <Link
        href={en ? '/en/terms#terms-of-use' : '/dieukhoan#dieu-khoan-su-dung'}
        target="_blank"
        className="mt-3 block text-sm underline"
      >
        {en ? 'Terms and refund policy' : 'Điều khoản và chính sách hoàn Point'}
      </Link>
      <div className="mt-6 flex gap-3">
        <button onClick={() => decide(false)} className="min-h-12 flex-1 rounded-xl border border-[#ccd5bf]">
          {en ? 'Later' : 'Để sau'}
        </button>
        <button onClick={() => decide(true)} className="min-h-12 flex-1 rounded-xl bg-[#244d40] px-3 text-white">
          {points === 0
            ? en
              ? 'Read'
              : 'Đọc luận giải'
            : en
              ? `Agree · ${points} ${unit}`
              : `Đồng ý · ${points} ${unit}`}
        </button>
      </div>
    </dialog>
  );
}
