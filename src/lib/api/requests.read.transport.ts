import type { Database } from "../database.types";
import { client } from "./_core";

type RequestsTable = Database["public"]["Tables"]["requests"];

export type RequestIdLookupRow = Pick<RequestsTable["Row"], "id">;

export async function selectRequestIdByFilterFromTransport(
  requestFilterId: string,
) {
  return await client
    .from("requests")
    .select("id")
    .eq("id", requestFilterId)
    .limit(1)
    .maybeSingle<RequestIdLookupRow>();
}

export async function selectRequestRecordByIdFromTransport(
  requestFilterId: string,
  requestReadSelect: string,
) {
  return await client
    .from("requests")
    .select(requestReadSelect)
    .eq("id", requestFilterId)
    .maybeSingle();
}
