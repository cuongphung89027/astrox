"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "./AppShell";

/** Admin has its own server-verified session. Public preview auth must never
 * become an admin identity, nor mount the consumer dock on admin routes. */
export function RouteBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return <>{children}</>;
  return <AuthProvider><div className="ax-bg" aria-hidden="true" /><AppShell>{children}</AppShell></AuthProvider>;
}
