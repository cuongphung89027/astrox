import type { AdminConfig } from "../../../services/admin/config";
export type AdminSession = {
  user: { email: string; capabilities: string[] };
  csrf: string;
};
export type ConfigSnapshot = {
  draft: AdminConfig;
  revision: number;
  published: AdminConfig | null;
  publishedRevision: number | null;
  secrets: string[];
  integration: { wallet: boolean };
};
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function adminRequest<T>(
  path: string,
  csrf?: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: method || (body === undefined ? "GET" : "POST"),
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(csrf ? { "x-admin-csrf": csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response
    .json()
    .catch(() => ({ message: "Máy chủ trả về phản hồi không hợp lệ." }));
  if (!response.ok)
    throw new AdminError(
      response.status,
      [
        payload.message ||
          payload.error ||
          `Không thể xử lý yêu cầu (${response.status}).`,
        ...(Array.isArray(payload.errors)
          ? payload.errors.map(
              (item: { path: string; message: string }) =>
                `${item.path}: ${item.message}`,
            )
          : []),
      ].join("\n"),
    );
  return payload as T;
}
