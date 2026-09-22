import { Suspense } from "react";
import { AccountPage } from "@/components/profile/AccountPage";
export default function Page() { return <Suspense fallback={<div role="status" className="p-6 text-center">Đang mở hồ sơ…</div>}><AccountPage /></Suspense>; }
