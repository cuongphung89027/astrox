"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect phía client — tương thích static export (không có server header). */
export function Redirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return null;
}
