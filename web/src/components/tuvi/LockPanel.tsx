"use client";

/**
 * LockPanel — panel khoá module khi tài khoản chưa được cấp quyền "tuvi"
 * (useAuth().isModuleAllowed === false). Port ngữ cảnh gate của app cũ.
 */
import Link from "next/link";
import { ModuleLockBadge } from "@/components/kit";

export function LockPanel() {
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-20">
      <div className="glass flex flex-col items-center gap-4 rounded-[var(--radius-card)] p-10 text-center">
        <ModuleLockBadge />
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-muc">
          Chưa được cấp quyền truy cập Tử Vi
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muc-2">
          Module Tử Vi Đẩu Số là tính năng Premium. Tài khoản của bạn chưa được mở quyền — hãy nạp điểm hoặc liên hệ
          AstroX để được cấp. Bạn vẫn có thể xem Cung Hoàng Đạo miễn phí.
        </p>
        <Link
          href="/trangchu"
          className="inline-flex items-center gap-2 rounded-full bg-son px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-pop)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-son"
        >
          ← Về trang chủ
        </Link>
      </div>
    </section>
  );
}
