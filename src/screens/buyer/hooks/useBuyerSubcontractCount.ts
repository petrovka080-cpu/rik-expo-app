import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchBuyerSubcontractCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("subcontracts")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);

  if (error || count == null) return null;
  return count;
}
