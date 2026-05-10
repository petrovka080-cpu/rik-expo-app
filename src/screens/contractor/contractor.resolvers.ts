type RowLike = {
  progress_id?: string | null;
  request_id?: string | null;
  purchase_item_id?: string | null;
  contractor_job_id?: string | null;
};

type PurchaseItemRow = {
  request_item_id?: string | null;
};

type RequestItemRow = {
  request_id?: string | null;
};

type RequestContractRow = {
  subcontract_id?: string | null;
  contractor_job_id?: string | null;
};

type WorkProgressRow = {
  contractor_job_id?: string | null;
  subcontract_id?: string | null;
};

const looksLikeUuid = (v: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

async function loadWorkProgressJobLink(
  supabaseClient: any,
  progressId: string,
): Promise<WorkProgressRow | null> {
  const attempts = [
    "contractor_job_id, subcontract_id",
    "contractor_job_id",
    "subcontract_id",
  ];

  for (const columns of attempts) {
    const result = await supabaseClient
      .from("work_progress")
      .select(columns)
      .eq("id", progressId)
      .maybeSingle();
    if (!result.error) return (result.data || null) as WorkProgressRow | null;
  }

  return null;
}

export async function resolveRequestIdForRow(
  supabaseClient: any,
  row: RowLike
): Promise<string> {
  const direct = String(row.request_id || "").trim();
  if (direct && looksLikeUuid(direct)) return direct;

  const piId = String(row.purchase_item_id || "").trim();
  if (!piId || !looksLikeUuid(piId)) return "";

  const pi = await supabaseClient
    .from("purchase_items")
    .select("request_item_id")
    .eq("id", piId)
    .maybeSingle();
  const reqItemId = String((pi.data as PurchaseItemRow | null)?.request_item_id || "").trim();
  if (!reqItemId || !looksLikeUuid(reqItemId)) return "";

  const ri = await supabaseClient
    .from("request_items")
    .select("request_id")
    .eq("id", reqItemId)
    .maybeSingle();
  const reqId = String((ri.data as RequestItemRow | null)?.request_id || "").trim();
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
      .from("requests")
      .select("subcontract_id, contractor_job_id")
      .eq("id", reqId)
      .maybeSingle();
    if (req.error) {
      req = await supabaseClient
        .from("requests")
        .select("subcontract_id")
        .eq("id", reqId)
        .maybeSingle();
    }
    if (req.error) {
      req = await supabaseClient
        .from("requests")
        .select("contractor_job_id")
        .eq("id", reqId)
        .maybeSingle();
    }
    if (!req.error && req.data) {
      const reqData = req.data as RequestContractRow;
      const rid = String(reqData.subcontract_id || reqData.contractor_job_id || "").trim();
      if (rid) return rid;
    }
  }

  const progressId = String(row.progress_id || "").trim();
  if (!looksLikeUuid(progressId)) return "";

  const wpData = await loadWorkProgressJobLink(supabaseClient, progressId);
  if (!wpData) return "";
  return String(wpData.contractor_job_id || wpData.subcontract_id || "").trim();
}
