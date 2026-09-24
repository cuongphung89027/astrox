"use client";
import {captureReferral,storedReferral} from "./referral";

/**
 * Auth + module access qua AstroX Worker (Zalo, cookie astrox_session) tại
 * api.theastrox.space. Mặc định mọi module được phép; chỉ khoá khi backend
 * trả access[module]=false.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useLayoutEffect, useRef, useState } from "react";
import { fetchAstroxUser, fetchModuleAccessAstrox } from "./api";
import { AUTH_API_BASE } from "./config";
import {startCloudSync} from "./cloud-sync";
import {setPointsAccount} from "./points";
import { getState, activateAccount } from "./state";
import type { AstroxUser } from "./types";

/* ----------------------------- context ----------------------------- */

interface AuthContextValue {
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

// Tính trực tiếp mỗi render: hai provider render cùng markup nên không có
// hydration mismatch. (Bản trước dùng useSyncExternalStore với subscribe no-op
// — một số lần load ở dev kẹt ở server snapshot false, làm localhost rơi vào
// RealAuthProvider và gọi API production.)
const localPreview = () =>
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "development" &&
  ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hydration theo server (false) cho khớp HTML tĩnh; sau mount đổi sang
  // preview localhost bằng state — deterministic, không lệ thuộc việc
  // useSyncExternalStore đọc lại snapshot (từng kẹt false ở dev).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Cờ mounted sau hydration là cách deterministic; useSyncExternalStore từng
    // kẹt snapshot false trên dev (thấy trên HEAD), render trực tiếp gây mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  const preview = mounted && localPreview();
  useEffect(captureReferral, []);

  return preview ? <LocalPreviewProvider>{children}</LocalPreviewProvider> : <RealAuthProvider>{children}</RealAuthProvider>;
}

function LocalPreviewProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(true);
  const name = getState().profile?.name || "Tài khoản xem thử";
  const value: AuthContextValue = {
    astroxUser: active ? { id: "localhost-preview", display_name: name } : null,
    loggedIn: active, ready: true, displayName: name, moduleAccess: {},
    isModuleAllowed: () => true, refresh: () => {},
    logout: async () => { setActive(false); },
    zaloLogin: () => { setActive(true); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function RealAuthProvider({ children }: { children: React.ReactNode }) {
  const syncStop=useRef<(()=>void)|null>(null);
  const [astroxUser, setAstroxUser] = useState<AstroxUser | null>(null);
  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  const refreshModuleAccess = useCallback(async () => {
    setModuleAccess(AUTH_API_BASE ? await fetchModuleAccessAstrox() : {});
  }, []);

  useEffect(() => {
    let alive = true;
    // Hoãn 1 macrotask: ở dev-localhost provider này có thể chỉ mounted lướt
    // qua trước khi AuthProvider đổi sang preview — tránh bắn request CORS.
    const kickoff = setTimeout(() => {
      if (!alive) return;
      void (async () => {
        const axUser = await fetchAstroxUser();
        if (alive) setAstroxUser(axUser);
        if (alive) {
          await refreshModuleAccess();
          setReady(true);
        }
      })();
    }, 0);
    return () => {
      alive = false;
      clearTimeout(kickoff);
    };
  }, [refreshModuleAccess]);

  // Poll module access mỗi 20s khi tab hiển thị (admin bật/khoá realtime).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshModuleAccess();
    }, 20000);
    return () => clearInterval(id);
  }, [astroxUser, refreshModuleAccess]);

  useLayoutEffect(()=>{
    if(!ready)return;
    syncStop.current?.();syncStop.current=null;
    const owner=astroxUser?`zalo:${astroxUser.id}`:null;
    activateAccount(owner);setPointsAccount(astroxUser?String(astroxUser.id):null);
    if(owner)syncStop.current=startCloudSync(`${AUTH_API_BASE}/api/user-data`,async()=>({}));
    return()=>{syncStop.current?.();syncStop.current=null;};
  },[ready,astroxUser]);

  const loggedIn = !!astroxUser;
  const displayName = astroxUser?.display_name || "tài khoản";

  const value = useMemo<AuthContextValue>(
    () => ({
      astroxUser,
      loggedIn,
      ready,
      displayName,
      moduleAccess,
      isModuleAllowed: (module: string) => moduleAccess[module] !== false,
      refresh: () => {
        refreshModuleAccess();
      },
      logout: async () => {
        syncStop.current?.();syncStop.current=null;activateAccount(null);setPointsAccount(null);
        try {
          if (AUTH_API_BASE) await fetch(`${AUTH_API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
        } catch {
          /* bỏ qua */
        }
        activateAccount(null);
        setAstroxUser(null);
      },
      zaloLogin: () => {
        if (AUTH_API_BASE) {
          const ref = storedReferral();
          window.location.href = `${AUTH_API_BASE}/auth/zalo/login${ref ? `?ref=${ref}` : ""}`;
        }
      },
    }),
    [astroxUser, loggedIn, ready, displayName, moduleAccess, refreshModuleAccess],
  );

  return <AuthContext.Provider value={value}><AccountContent key={astroxUser?.id||"guest"}>{children}</AccountContent></AuthContext.Provider>;
}
function AccountContent({children}:{children:React.ReactNode}){return children;}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return ctx;
}
