import { client, parseErr } from "./_core";

export async function notifList(
  role: "accountant" | "buyer" | "director",
  limit = 20
) {
  try {
    const { data, error } = await client
      .from("notifications" as any)
      .select("id, role, title, body, payload, created_at, is_read")
      .eq("role", role)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(100, limit)));

    if (error) throw error;
    return (data ?? []) as any[];
  } catch (e) {
    console.warn("[notifList]", parseErr(e));
    return [];
  }
}

export async function notifMarkRead(role: "accountant" | "buyer" | "director") {
  try {
    const { error } = await client
      .from("notifications" as any)
      .update({ is_read: true })
      .eq("role", role)
      .eq("is_read", false);

    if (error) throw error;
    return true;
  } catch (e) {
    console.warn("[notifMarkRead]", parseErr(e));
    return false;
  }
}
