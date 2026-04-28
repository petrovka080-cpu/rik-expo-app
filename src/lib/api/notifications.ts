import { client, normalizePage, parseErr } from "./_core";

const logNotificationsDebug = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

type AppRole = "accountant" | "buyer" | "director";

type NotificationRow = {
  id: string | number;
  role: AppRole;
  title?: string | null;
  body?: string | null;
  payload?: unknown;
  created_at?: string | null;
  is_read?: boolean | null;
};

export async function notifList(role: AppRole, limit = 20): Promise<NotificationRow[]> {
  try {
    const page = normalizePage({ pageSize: limit }, { pageSize: 20, maxPageSize: 100 });
    const { data, error } = await client
      .from("notifications")
      .select("id, role, title, body, payload, created_at, is_read")
      .eq("role", role)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(page.from, page.to);

    if (error) throw error;
    return Array.isArray(data) ? (data as NotificationRow[]) : [];
  } catch (e) {
    logNotificationsDebug("[notifList]", parseErr(e));
    return [];
  }
}

export async function notifMarkRead(role: AppRole) {
  try {
    const { error } = await client
      .from("notifications")
      .update({ is_read: true })
      .eq("role", role)
      .eq("is_read", false);

    if (error) throw error;
    return true;
  } catch (e) {
    logNotificationsDebug("[notifMarkRead]", parseErr(e));
    return false;
  }
}
