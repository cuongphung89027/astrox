/**
 * Popup đăng nhập dùng chung — mọi nút "Đăng nhập" trên site đều mở popup này
 * thay vì điều hướng thẳng tới Zalo OAuth. Store ngoài React để bất kỳ component
 * nào cũng gọi được openLoginDialog() mà không phải khoan context.
 */
import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export function openLoginDialog(): void {
  if (open) return;
  open = true;
  emit();
}

export function closeLoginDialog(): void {
  if (!open) return;
  open = false;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => open;
const getServerSnapshot = () => false;

export function useLoginDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
