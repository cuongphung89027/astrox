"use client";

/**
 * Auth + module access — port từ initSupabaseAuth/initAstroxAuth của
 * index.html. Hai kênh đăng nhập chạy song song:
 *  - Supabase session (Google/email…) → Bearer token cho /api/user-data
 *    và /api/module-access cùng origin.
 *  - AstroX Worker (Zalo, cookie astrox_session) → api.theastrox.space.
 * Mặc định mọi module được phép; chỉ khoá khi backend trả access[module]=false.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { fetchAstroxUser, fetchModuleAccessAstrox } from "./api";
import { AUTH_API_BASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { getState, onDataDirty, setState, clearDerivedData } from "./state";
import type { AstroxUser } from "./types";

function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    return null;
  }
}

/* ------------------------- user-data sync ------------------------- */

async function currentAccessToken(client: SupabaseClient | null): Promise<string> {
  if (!client) return "";
  try {
    const { data } = await client.auth.getSession();
    return data?.session?.access_token || "";
  } catch {
    return "";
  }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let syncQueued = false;

function syncUserData(client: SupabaseClient | null, method: "GET" | "PUT") {
  return (async () => {
    const state = getState();
    if (method === "GET" && !state.profile) return; // GET chỉ khi có dữ liệu để merge
    if (method === "PUT" && syncInFlight) {
      syncQueued = true;
      return;
    }
    if (method === "PUT") syncInFlight = true;
    try {
      const token = await currentAccessToken(client);
      if (!token) return;
      const opts: RequestInit = {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      };
      if (method === "PUT") {
        const s = getState();
        opts.body = JSON.stringify({
          profile: s.profile,
          chartImageBase64: s.chartImageBase64,
          chartImageMime: s.chartImageMime,
          ziweiChart: s.ziweiChart,
          natalChart: s.natalChart,
          aiCache: s.aiCache,
          lastAiModel: s.lastAiModel || "",
        });
      }
      let res: Response;
      try {
        res = await fetch("/api/user-data", opts);
      } catch {
        return; // offline — dữ liệu vẫn ở localStorage
      }
      if (!res.ok) return;
      if (method === "GET") {
        const data = await res.json();
        const patch: Parameters<typeof setState>[0] = {};
        if (data.profile) patch.profile = data.profile;
        if (data.chartImageBase64) patch.chartImageBase64 = data.chartImageBase64;
        if (data.chartImageMime) patch.chartImageMime = data.chartImageMime;
        if (data.ziweiChart) patch.ziweiChart = data.ziweiChart;
        if (data.natalChart) patch.natalChart = data.natalChart;
        if (data.lastAiModel) patch.lastAiModel = data.lastAiModel;
        if (data.aiCache) {
          // Merge thô theo updatedAt — đủ dùng cho v5; merge sâu profiles
          // giữ nguyên từ localStorage làm gốc.
          patch.aiCache = data.aiCache;
        }
        setState(patch);
      }
    } finally {
      if (method === "PUT") {
        syncInFlight = false;
        if (syncQueued) {
          syncQueued = false;
          if (syncTimer) clearTimeout(syncTimer);
          syncTimer = setTimeout(() => syncUserData(client, "PUT"), 800);
        }
      }
    }
  })();
}

/* ----------------------------- context ----------------------------- */

interface AuthContextValue {
  supabaseUser: { email?: string | null; fullName?: string | null } | null;
  astroxUser: AstroxUser | null;
  loggedIn: boolean;
  ready: boolean;
  displayName: string;
  moduleAccess: Record<string, boolean>;
  isModuleAllowed: (module: string) => boolean;
  refresh: () => void;
  logout: () => Promise<void>;
  zaloLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [localPreview, setLocalPreview] = useState<boolean | null>(null);
  useEffect(() => {
    setLocalPreview(process.env.NODE_ENV === "development" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
  }, []);
  if (localPreview === null) return null;
  return localPreview ? <LocalPreviewProvider>{children}</LocalPreviewProvider> : <RealAuthProvider>{children}</RealAuthProvider>;
}

function LocalPreviewProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(true);
  const name = getState().profile?.name || "Tài khoản xem thử";
  const value: AuthContextValue = {
    supabaseUser: null,
    astroxUser: active ? { id: "localhost-preview", display_name: name } : null,
    loggedIn: active, ready: true, displayName: name, moduleAccess: {},
    isModuleAllowed: () => true, refresh: () => {},
    logout: async () => { setActive(false); },
    zaloLogin: () => { setActive(true); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function RealAuthProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<SupabaseClient | null>(null);
  if (typeof window !== "undefined" && !clientRef.current) clientRef.current = getSupabase();
  const client = clientRef.current;

  const [supabaseEmail, setSupabaseEmail] = useState<string | null>(null);
  const [supabaseName, setSupabaseName] = useState<string | null>(null);
  const [astroxUser, setAstroxUser] = useState<AstroxUser | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  const refreshModuleAccess = useCallback(async () => {
    let access: Record<string, boolean> = {};
    const hasSupa = !!(await currentAccessToken(client));
    if (!hasSupa && AUTH_API_BASE) {
      access = await fetchModuleAccessAstrox();
    } else if (hasSupa) {
      try {
        const token = await currentAccessToken(client);
        const res = await fetch("/api/module-access", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data?.access) access = data.access;
        }
      } catch {
        /* mặc định cho phép */
      }
    }
    setModuleAccess(access);
  }, [astroxUser, client]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Supabase session
      if (client) {
        try {
          const { data } = await client.auth.getSession();
          const user = (data as { session: Session | null })?.session?.user ?? null;
          if (user && alive) {
            setSupabaseEmail((user.email as string) || null);
            setSupabaseName(((user.user_metadata as { full_name?: string } | null)?.full_name as string) || null);
            await syncUserData(client, "GET");
          }
        } catch {
          /* coi như chưa đăng nhập */
        }
        client.auth.onAuthStateChange((event, session) => {
          const user = session?.user ?? null;
          setSupabaseEmail((user?.email as string) || null);
          setSupabaseName(((user?.user_metadata as { full_name?: string } | null)?.full_name as string) || null);
          if (event === "SIGNED_OUT") {
            clearDerivedData();
          }
        });
      }
      // AstroX (Zalo) user
      const axUser = await fetchAstroxUser();
      if (alive) setAstroxUser(axUser);
      if (alive) {
        await refreshModuleAccess();
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll module access mỗi 20s khi tab hiển thị (admin bật/khoá realtime).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshModuleAccess();
    }, 20000);
    return () => clearInterval(id);
  }, [astroxUser, supabaseEmail, refreshModuleAccess]);

  // Debounce PUT mỗi khi state đổi (hồ sơ, cache AI).
  useEffect(() => {
    if (!ready || !supabaseEmail) return;
    return onDataDirty(() => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(() => syncUserData(client, "PUT"), 800);
    });
  }, [ready, supabaseEmail, client]);

  const loggedIn = !!supabaseEmail || !!astroxUser;
  const displayName =
    supabaseName || supabaseEmail || astroxUser?.display_name || "tài khoản";

  const value = useMemo<AuthContextValue>(
    () => ({
      supabaseUser: supabaseEmail ? { email: supabaseEmail, fullName: supabaseName } : null,
      astroxUser,
      loggedIn,
      ready,
      displayName,
      moduleAccess,
      isModuleAllowed: (module: string) => {
        if (moduleAccess[module] === false) return false;
        return true;
      },
      refresh: () => {
        refreshModuleAccess();
      },
      logout: async () => {
        try {
          if (client) await client.auth.signOut();
          if (AUTH_API_BASE) await fetch(`${AUTH_API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
        } catch {
          /* bỏ qua */
        }
        clearDerivedData();
        setAstroxUser(null);
        setSupabaseEmail(null);
        setSupabaseName(null);
      },
      zaloLogin: () => {
        if (AUTH_API_BASE) window.location.href = `${AUTH_API_BASE}/auth/zalo/login`;
      },
    }),
    [supabaseEmail, supabaseName, astroxUser, loggedIn, ready, displayName, moduleAccess, refreshModuleAccess, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
