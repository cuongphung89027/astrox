"use client";
import {captureReferral,storedReferral} from "./referral";

/**
 * Auth + module access — port từ initSupabaseAuth/initAstroxAuth của
 * index.html. Hai kênh đăng nhập chạy song song:
 *  - Supabase session (Google/email…) → Bearer token cho /api/user-data
 *    và /api/module-access cùng origin.
 *  - AstroX Worker (Zalo, cookie astrox_session) → api.theastrox.space.
 * Mặc định mọi module được phép; chỉ khoá khi backend trả access[module]=false.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { fetchAstroxUser, fetchModuleAccessAstrox } from "./api";
import { AUTH_API_BASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import {startCloudSync} from "./cloud-sync";
import {setPointsAccount} from "./points";
import { getState, activateAccount } from "./state";
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

const noSubscribe=()=>()=>{};
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const localPreview=useSyncExternalStore(noSubscribe,()=>process.env.NODE_ENV === "development" && ["localhost","127.0.0.1","[::1]"].includes(window.location.hostname),()=>false);
  useEffect(captureReferral,[]);

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
  const [client]=useState<SupabaseClient|null>(()=>getSupabase());
  const syncStop=useRef<(()=>void)|null>(null);
  const [supabaseId,setSupabaseId]=useState<string|null>(null);

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
  }, [client]);

  useEffect(() => {
    let alive = true;
    let subscription:{unsubscribe:()=>void}|undefined;
    (async () => {
      // Supabase session
      if (client) {
        try {
          const { data } = await client.auth.getSession();
          const user = (data as { session: Session | null })?.session?.user ?? null;
          if (user && alive) {
            setSupabaseEmail((user.email as string) || null);
            setSupabaseName(((user.user_metadata as { full_name?: string } | null)?.full_name as string) || null);
            setSupabaseId(user.id);
          }
        } catch {
          /* coi như chưa đăng nhập */
        }
        const authChange=client.auth.onAuthStateChange((event, session) => {
          if(!alive)return;
          setSupabaseId(session?.user?.id||null);
          const user = session?.user ?? null;
          setSupabaseEmail((user?.email as string) || null);
          setSupabaseName(((user?.user_metadata as { full_name?: string } | null)?.full_name as string) || null);
          if (event === "SIGNED_OUT") {
            syncStop.current?.();activateAccount(null);setPointsAccount(null);
          }
        });
        subscription=authChange.data.subscription;
        if(!alive)subscription.unsubscribe();
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
      alive = false;subscription?.unsubscribe();
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

  useLayoutEffect(()=>{
    if(!ready)return;
    syncStop.current?.();syncStop.current=null;
    const owner=astroxUser?`zalo:${astroxUser.id}`:supabaseId?`supabase:${supabaseId}`:null;
    activateAccount(owner);setPointsAccount(astroxUser?String(astroxUser.id):null);
    if(owner){
      syncStop.current=startCloudSync(astroxUser?`${AUTH_API_BASE}/api/user-data`:'/api/user-data',async()=>{
        if(astroxUser)return {} as Record<string,string>;
        const token=await currentAccessToken(client);if(!token)throw Error('no_session');
        return {Authorization:`Bearer ${token}`};
      });
    }
    return()=>{syncStop.current?.();syncStop.current=null;};
  },[ready,astroxUser,supabaseId,client]);

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
        syncStop.current?.();syncStop.current=null;activateAccount(null);setPointsAccount(null);
        try {
          if (client) await client.auth.signOut();
          if (AUTH_API_BASE) await fetch(`${AUTH_API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
        } catch {
          /* bỏ qua */
        }
        activateAccount(null);
        setAstroxUser(null);
        setSupabaseId(null);
        setSupabaseEmail(null);
        setSupabaseName(null);
      },
      zaloLogin: () => {
        if (AUTH_API_BASE) {
          const ref = storedReferral();
          window.location.href = `${AUTH_API_BASE}/auth/zalo/login${ref ? `?ref=${ref}` : ""}`;
        }
      },
    }),
    [supabaseEmail, supabaseName, astroxUser, loggedIn, ready, displayName, moduleAccess, refreshModuleAccess, client],
  );

  return <AuthContext.Provider value={value}><AccountContent key={astroxUser?.id||supabaseId||"guest"}>{children}</AccountContent></AuthContext.Provider>;
}
function AccountContent({children}:{children:React.ReactNode}){return children;}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
