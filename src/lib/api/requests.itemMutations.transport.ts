import type { Database } from "../database.types";
import { supabase } from "../supabaseClient";

type RequestItemsTable = Database["public"]["Tables"]["request_items"];

export type RequestItemAddOrIncTransportArgs =
  Database["public"]["Functions"]["request_item_add_or_inc"]["Args"];

export type RequestItemMetaPatchTransport = Pick<
  RequestItemsTable["Update"],
  "status" | "note" | "app_code" | "kind" | "name_human" | "uom"
>;

export async function addOrIncrementRequestItemFromTransport(
  args: RequestItemAddOrIncTransportArgs,
) {
  return await supabase.rpc("request_item_add_or_inc", args);
}

export async function updateRequestItemMetaFromTransport(
  itemId: string,
  patch: RequestItemMetaPatchTransport,
) {
  return await supabase.from("request_items").update(patch).eq("id", itemId);
}
