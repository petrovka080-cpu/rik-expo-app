import { supabase } from "../../../lib/supabaseClient";

export async function loadBuyerRfqPrefillAuthMetadata(): Promise<unknown> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.user_metadata;
}
