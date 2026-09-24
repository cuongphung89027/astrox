'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { validateConfig, type AdminConfig } from '../../../../services/admin/config';
import { adminRequest, AdminError, type AdminSession, type ConfigSnapshot } from '@/lib/admin-client';
import type { Spec } from './ui';
import type { View } from './navigation';

/** Session, draft config and write helpers shared by every admin tab. */
export function useAdminApi() {
  const [session, setSession] = useState<AdminSession | null>(null),
    [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null),
    [config, setConfig] = useState<AdminConfig | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const accept = useCallback((data: ConfigSnapshot) => {
    setSnapshot(data);
    setConfig(structuredClone(data.draft));
  }, []);
  const reload = useCallback(async () => accept(await adminRequest<ConfigSnapshot>('config')), [accept]);
  const boot = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSession(await adminRequest<AdminSession>('session'));
      await reload();
    } catch (e) {
      if (!(e instanceof AdminError && e.status === 401)) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [reload]);
  const dirty = !!config && !!snapshot && JSON.stringify(config) !== JSON.stringify(snapshot.draft);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof AdminError && e.status === 401) setSession(null);
    } finally {
      setBusy(false);
    }
  };
  const update = (fn: (draft: AdminConfig) => void) =>
    setConfig(current => {
      if (!current) return current;
      const next = structuredClone(current);
      fn(next);
      return next;
    });
  const patch = (group: keyof AdminConfig, key: string, value: unknown) =>
    update(draft => Object.assign(draft[group], { [key]: value }));
  const login = (password: string) =>
    act(async () => {
      setSession(await adminRequest<AdminSession>('login', undefined, { password }));
      await reload();
    });
  const logout = () =>
    act(async () => {
      await adminRequest('logout', session?.csrf, {});
      setSession(null);
      setConfig(null);
    });
  const save = () =>
    act(async () => {
      if (!config || !snapshot) return;
      const errors = validateConfig(config);
      if (errors.length) throw Error(errors.map(e => `${e.path}: ${e.message}`).join('\n'));
      await adminRequest('config', session?.csrf, { config, expectedRevision: snapshot.revision }, 'PUT');
      await reload();
      setMessage('Đã lưu bản nháp. Cấu hình đang chạy chưa thay đổi.');
    });
  const discard = () => {
    if (snapshot) setConfig(structuredClone(snapshot.draft));
    setError('');
    setMessage('Đã bỏ thay đổi chưa lưu.');
  };
  const secret = async (ref: string, value: string) => {
    if (!session?.user.capabilities.includes('secrets.write')) throw Error('Bạn không có quyền quản lý khóa kết nối.');
    await adminRequest('secrets', session?.csrf, { ref, value }, 'PUT');
    setSnapshot(old => (old ? { ...old, secrets: [...new Set([...old.secrets, ref])] } : old));
  };
  const can = (capability: string) => !!session?.user.capabilities.includes(capability);
  return {
    session,
    snapshot,
    config,
    loading,
    busy,
    error,
    message,
    dirty,
    setMessage,
    boot,
    reload,
    act,
    update,
    patch,
    login,
    logout,
    save,
    discard,
    secret,
    can,
    canWrite: can('config.write'),
  };
}

export type AdminApi = ReturnType<typeof useAdminApi>;

/** Props every config tab receives; loaded session, snapshot and config are non-null. */
export type AdminPanelProps = {
  config: AdminConfig;
  snapshot: ConfigSnapshot;
  session: AdminSession;
  view: View;
  update: AdminApi['update'];
  patch: AdminApi['patch'];
  renderFields: (group: keyof AdminConfig, specs: Spec[]) => ReactNode;
  go: (id: View) => void;
  secret: AdminApi['secret'];
  dirty: boolean;
  canWrite: boolean;
  act: AdminApi['act'];
  setMessage: AdminApi['setMessage'];
};
