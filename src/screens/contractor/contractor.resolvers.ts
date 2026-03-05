type RowLike = {
  progress_id?: string | null;
  request_id?: string | null;
  purchase_item_id?: string | null;
  contractor_job_id?: string | null;
};

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export async function resolveRequestIdForRow(
  supabaseClient: any,
  row: RowLike
): Promise<string> {
  const direct = String(row.request_id || "").trim();
  if (direct && looksLikeUuid(direct)) return direct;

  const piId = String(row.purchase_item_id || "").trim();
  if (!piId || !looksLikeUuid(piId)) return "";

  const pi = await supabaseClient
    .from("purchase_items" as any)
    .select("request_item_id")
    .eq("id", piId)
    .maybeSingle();
  const reqItemId = String((pi.data as any)?.request_item_id || "").trim();
  if (!reqItemId || !looksLikeUuid(reqItemId)) return "";

  const ri = await supabaseClient
    .from("request_items" as any)
    .select("request_id")
    .eq("id", reqItemId)
    .maybeSingle();
  const reqId = String((ri.data as any)?.request_id || "").trim();
  return looksLikeUuid(reqId) ? reqId : "";
}

export async function resolveContractorJobIdForRow(
  supabaseClient: any,
  row: RowLike,
  resolveRequestId: (row: RowLike) => Promise<string>
): Promise<string> {
  const direct = String(row.contractor_job_id || "").trim();
  if (direct) return direct;

  const reqId = await resolveRequestId(row);
  if (reqId && looksLikeUuid(reqId)) {
    let req = await supabaseClient
      .from("requests" as any)
      .select("subcontract_id, contractor_job_id")
      .eq("id", reqId)
      .maybeSingle();
    if (req.error) {
      req = await supabaseClient
        .from("requests" as any)
        .select("subcontract_id")
        .eq("id", reqId)
        .maybeSingle();
    }
    if (req.error) {
      req = await supabaseClient
        .from("requests" as any)
        .select("contractor_job_id")
        .eq("id", reqId)
        .maybeSingle();
    }
    if (!req.error && req.data) {
      const rid = String((req.data as any).subcontract_id || (req.data as any).contractor_job_id || "").trim();
      if (rid) return rid;
    }
  }

  const progressId = String(row.progress_id || "").trim();
  if (!looksLikeUuid(progressId)) return "";

  const [wpById, wpByProgress] = await Promise.all([
    supabaseClient.from("work_progress" as any).select("*").eq("id", progressId).maybeSingle(),
    supabaseClient.from("work_progress" as any).select("*").eq("progress_id", progressId).maybeSingle(),
  ]);
  const wpData = wpById.data || wpByProgress.data;
  if (!wpData) return "";
  return String((wpData as any).contractor_job_id || (wpData as any).subcontract_id || "").trim();
}
