import type {
  AiEstimateLedgerAppendRevisionInput,
  AiEstimateLedgerApproveRevisionInput,
  AiEstimateLedgerBindArtifactsInput,
  AiEstimateLedgerHistoryQuery,
  AiEstimateLedgerPage,
  AiEstimateLedgerRecord,
  AiEstimateLedgerSetStatusInput,
  AiEstimateLedgerUpsertDraftInput,
  AiEstimateLedgerHistoryRecord,
  AiEstimateLedgerOperationResult,
} from "../AiEstimateLedgerTypes";

export type AiEstimateLedgerFetch = (
  url: string,
  init: {
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type ServerAiEstimateLedgerStore = {
  readonly adapterKind: "server_api";
  upsertDraft(input: AiEstimateLedgerUpsertDraftInput): Promise<AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>>;
  appendRevision(input: AiEstimateLedgerAppendRevisionInput): Promise<AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>>;
  bindArtifacts(input: AiEstimateLedgerBindArtifactsInput): Promise<AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>>;
  approveRevision(input: AiEstimateLedgerApproveRevisionInput): Promise<AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>>;
  setStatus(input: AiEstimateLedgerSetStatusInput): Promise<AiEstimateLedgerOperationResult<AiEstimateLedgerRecord>>;
  getRecord(estimateId: string): Promise<AiEstimateLedgerRecord | null>;
  listApprovedHistory(query: AiEstimateLedgerHistoryQuery): Promise<AiEstimateLedgerPage<AiEstimateLedgerHistoryRecord>>;
};

async function request<T>(
  fetcher: AiEstimateLedgerFetch,
  baseUrl: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
): Promise<T> {
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  if (!response.ok) throw new Error(`AI_ESTIMATE_LEDGER_SERVER_API_FAILED:${response.status}:${path}`);
  return response.json() as Promise<T>;
}

function queryString(query: AiEstimateLedgerHistoryQuery): string {
  const params = new URLSearchParams();
  params.set("ownerUserId", query.ownerUserId);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.cursorCreatedAt) params.set("cursorCreatedAt", query.cursorCreatedAt);
  for (const status of query.statuses ?? []) params.append("status", status);
  return params.toString();
}

export function createServerAiEstimateLedgerStore(input: {
  baseUrl: string;
  fetcher: AiEstimateLedgerFetch;
}): ServerAiEstimateLedgerStore {
  return {
    adapterKind: "server_api",
    upsertDraft: (body) => request(input.fetcher, input.baseUrl, "/ai-estimate-ledger/drafts/upsert", "POST", body),
    appendRevision: (body) => request(input.fetcher, input.baseUrl, "/ai-estimate-ledger/revisions/append", "POST", body),
    bindArtifacts: (body) => request(input.fetcher, input.baseUrl, "/ai-estimate-ledger/artifacts/bind", "POST", body),
    approveRevision: (body) => request(input.fetcher, input.baseUrl, "/ai-estimate-ledger/revisions/approve", "POST", body),
    setStatus: (body) => request(input.fetcher, input.baseUrl, "/ai-estimate-ledger/status", "POST", body),
    getRecord: (estimateId) =>
      request(input.fetcher, input.baseUrl, `/ai-estimate-ledger/records/${encodeURIComponent(estimateId)}`, "GET"),
    listApprovedHistory: (query) =>
      request(input.fetcher, input.baseUrl, `/ai-estimate-ledger/approved-history?${queryString(query)}`, "GET"),
  };
}
