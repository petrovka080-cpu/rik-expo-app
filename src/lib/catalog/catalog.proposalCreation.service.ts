import {
  proposalSubmit as rpcProposalSubmit,
  isProposalDirectorVisibleRow,
  normalizeProposalStatus,
  type ProposalStatus,
} from "../api/proposals";
import {
  SUPPLIER_NONE_LABEL,
  asLooseRecord,
  norm,
} from "./catalog.compat.shared";
import {
  isRpcNonEmptyString,
  isRpcOptionalBoolean,
  isRpcOptionalString,
  isRpcRecord,
  validateRpcResponse,
} from "../api/queryBoundary";
import { traceAsync } from "../observability/sentry";
import {
  callProposalAtomicSubmitRpc,
  loadExistingProposalItemRecoveryRows,
  loadExistingProposalRecoveryRows,
  type ExistingProposalItemRecoveryRow,
  type ExistingProposalRecoveryRow,
  type ProposalAtomicSubmitRpcArgs,
  type ProposalAtomicSubmitRpcBucket,
} from "./catalog.proposalCreation.transport";

export type ProposalBucketInput = ProposalAtomicSubmitRpcBucket;

export type CreateProposalsOptions = {
  buyerFio?: string | null;
  submit?: boolean;
  requestItemStatus?: string | null;
  requestId?: string | null;
  clientMutationId?: string | null;
};

export type CreateProposalsResult = {
  proposals: {
    proposal_id: string;
    proposal_no: string | null;
    supplier: string;
    request_item_ids: string[];
    status: ProposalStatus;
    raw_status: string | null;
    submitted: boolean;
    submitted_at: string | null;
    visible_to_director: boolean;
    submit_source: "rpc:proposal_submit" | "rpc:proposal_submit_text_v1" | null;
  }[];
  meta?: {
    canonical_path: "rpc:proposal_submit_v3";
    client_mutation_id: string | null;
    request_id: string | null;
    idempotent_replay: boolean;
    expected_bucket_count: number;
    expected_item_count: number;
    created_proposal_count: number;
    created_item_count: number;
    attachment_continuation_ready: boolean;
  };
};

type ProposalAtomicSubmitRpcProposalRow = {
  bucket_index?: number | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  supplier?: string | null;
  request_item_ids?: unknown;
  raw_status?: string | null;
  submitted_at?: string | null;
  sent_to_accountant_at?: string | null;
  submit_source?: "rpc:proposal_submit" | "rpc:proposal_submit_text_v1" | null;
};

type ProposalAtomicSubmitRpcMeta = {
  canonical_path?: string | null;
  client_mutation_id?: string | null;
  request_id?: string | null;
  idempotent_replay?: boolean | null;
  expected_bucket_count?: number | null;
  expected_item_count?: number | null;
  created_proposal_count?: number | null;
  created_item_count?: number | null;
  attachment_continuation_ready?: boolean | null;
};

type ProposalAtomicSubmitRpcResult = {
  status?: string | null;
  proposals?: ProposalAtomicSubmitRpcProposalRow[] | null;
  meta?: ProposalAtomicSubmitRpcMeta | null;
};

const isAtomicSubmitProposalRow = (value: unknown): value is ProposalAtomicSubmitRpcProposalRow =>
  isRpcRecord(value) &&
  isRpcNonEmptyString(value.proposal_id) &&
  (value.request_item_ids == null || Array.isArray(value.request_item_ids)) &&
  isRpcOptionalString(value.proposal_no) &&
  isRpcOptionalString(value.supplier) &&
  isRpcOptionalString(value.raw_status) &&
  isRpcOptionalString(value.submitted_at) &&
  isRpcOptionalString(value.sent_to_accountant_at) &&
  isRpcOptionalString(value.submit_source);

const isAtomicSubmitMeta = (value: unknown): value is ProposalAtomicSubmitRpcMeta =>
  value == null ||
  (isRpcRecord(value) &&
    isRpcOptionalString(value.canonical_path) &&
    isRpcOptionalString(value.client_mutation_id) &&
    isRpcOptionalString(value.request_id) &&
    isRpcOptionalBoolean(value.idempotent_replay) &&
    isRpcOptionalBoolean(value.attachment_continuation_ready));

const isAtomicSubmitRpcResult = (value: unknown): value is ProposalAtomicSubmitRpcResult =>
  isRpcRecord(value) &&
  isRpcOptionalString(value.status) &&
  Array.isArray(value.proposals) &&
  value.proposals.every(isAtomicSubmitProposalRow) &&
  isAtomicSubmitMeta(value.meta);

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];

const parseInteger = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const parseBoolean = (value: unknown): boolean => value === true;

const buildProposalSubmitMutationId = (
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
): string => {
  const explicit = norm(opts.clientMutationId ?? null);
  if (explicit) return explicit;

  const cryptoLike =
    typeof globalThis !== "undefined"
      ? (globalThis as typeof globalThis & {
          crypto?: {
            randomUUID?: () => string;
            getRandomValues?: (array: Uint8Array) => Uint8Array;
          };
        }).crypto
      : undefined;

  if (typeof cryptoLike?.randomUUID === "function") {
    return cryptoLike.randomUUID();
  }

  const requestId = norm(opts.requestId ?? null) || "request";
  const bucketFingerprint = buckets
    .map((bucket) =>
      (bucket.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean)
        .sort()
        .join(","),
    )
    .join("|");
  return `proposal-submit:${requestId}:${bucketFingerprint}:${Date.now().toString(36)}`;
};

const bucketSupplierLabel = (bucket: ProposalBucketInput | undefined): string => {
  const supplier = norm(bucket?.supplier ?? null);
  return supplier || SUPPLIER_NONE_LABEL;
};

const isProposalRequestSupplierConflict = (error: unknown): boolean => {
  const source = asLooseRecord(error);
  const code = norm(source.code == null ? null : String(source.code));
  const status = Number(source.status ?? source.statusCode ?? 0);
  const text = [
    source.message,
    source.details,
    source.hint,
    source.error,
    source.code,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  return (
    text.includes("proposals_uniq_req_supplier") ||
    (code === "23505" && text.includes("request_id") && text.includes("supplier")) ||
    (status === 409 && text.includes("duplicate") && text.includes("supplier"))
  );
};

const uniqueBucketRequestItemIds = (bucket: ProposalBucketInput | undefined): string[] =>
  Array.from(
    new Set(
      (bucket?.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean),
    ),
  );

async function loadExistingProposalItems(proposalId: string, requestItemIds: string[]): Promise<Set<string>> {
  if (!requestItemIds.length) return new Set();

  const { data, error } = await loadExistingProposalItemRecoveryRows(proposalId, requestItemIds);

  if (error) throw error;
  return new Set(
    (Array.isArray(data) ? (data as ExistingProposalItemRecoveryRow[]) : [])
      .map((row) => String(row?.request_item_id ?? "").trim())
      .filter(Boolean),
  );
}

async function findExistingProposalForBucket(
  requestId: string,
  bucket: ProposalBucketInput,
): Promise<ExistingProposalRecoveryRow | null> {
  const requestItemIds = uniqueBucketRequestItemIds(bucket);
  const supplier = norm(bucket?.supplier ?? null);

  const { data, error } = await loadExistingProposalRecoveryRows({ requestId, supplier });
  if (error) throw error;

  const rows = Array.isArray(data) ? (data as ExistingProposalRecoveryRow[]) : [];
  for (const row of rows) {
    const proposalId = norm(row?.id ?? null);
    if (!proposalId) continue;
    const existingItemIds = await loadExistingProposalItems(proposalId, requestItemIds);
    if (requestItemIds.every((requestItemId) => existingItemIds.has(requestItemId))) {
      return row;
    }
  }

  return null;
}

async function recoverExistingProposalSubmitResult(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
  clientMutationId: string,
): Promise<CreateProposalsResult> {
  const requestId = norm(opts.requestId ?? null);
  if (!requestId) {
    throw new Error("rpc_proposal_submit_v3 duplicate proposal recovery requires requestId");
  }

  const proposals: ProposalAtomicSubmitRpcProposalRow[] = [];
  let createdItemCount = 0;

  for (let bucketIndex = 0; bucketIndex < buckets.length; bucketIndex += 1) {
    const bucket = buckets[bucketIndex];
    const requestItemIds = uniqueBucketRequestItemIds(bucket);
    const existing = await findExistingProposalForBucket(requestId, bucket);
    const proposalId = norm(existing?.id ?? null);
    if (!existing || !proposalId) {
      throw new Error("rpc_proposal_submit_v3 duplicate proposal recovery could not find matching proposal");
    }

    const visible = isProposalDirectorVisibleRow({
      status: existing.status ?? null,
      submitted_at: existing.submitted_at ?? null,
      sent_to_accountant_at: existing.sent_to_accountant_at ?? null,
    });
    let rawStatus = existing.status ?? null;
    let submittedAt = existing.submitted_at ?? null;

    if (opts.submit !== false && !visible) {
      await rpcProposalSubmit(proposalId);
      rawStatus = "На утверждении";
      submittedAt = submittedAt || new Date().toISOString();
    }

    createdItemCount += requestItemIds.length;
    proposals.push({
      bucket_index: bucketIndex,
      proposal_id: proposalId,
      proposal_no: norm(existing.display_no ?? null) || norm(existing.proposal_no ?? null) || null,
      supplier: norm(existing.supplier ?? null) || norm(bucket?.supplier ?? null) || null,
      request_item_ids: requestItemIds,
      raw_status: rawStatus,
      submitted_at: submittedAt,
      sent_to_accountant_at: existing.sent_to_accountant_at ?? null,
      submit_source: opts.submit === false ? null : "rpc:proposal_submit_text_v1",
    });
  }

  return mapAtomicProposalSubmitResult(
    {
      status: "ok",
      proposals,
      meta: {
        canonical_path: "rpc:proposal_submit_v3",
        client_mutation_id: clientMutationId,
        request_id: requestId,
        idempotent_replay: true,
        expected_bucket_count: buckets.length,
        expected_item_count: createdItemCount,
        created_proposal_count: proposals.length,
        created_item_count: createdItemCount,
        attachment_continuation_ready: true,
      },
    },
    buckets,
  );
}

function mapAtomicProposalSubmitResult(
  rawResult: ProposalAtomicSubmitRpcResult,
  buckets: ProposalBucketInput[],
): CreateProposalsResult {
  const proposalsRaw = Array.isArray(rawResult?.proposals) ? rawResult.proposals : [];
  const proposals = proposalsRaw.map((proposal) => {
    const bucketIndex = parseInteger(proposal?.bucket_index, -1);
    const sourceBucket = bucketIndex >= 0 ? buckets[bucketIndex] : undefined;
    const supplierText = norm(proposal?.supplier ?? null) || bucketSupplierLabel(sourceBucket);
    const request_item_ids = (() => {
      const fromRpc = parseStringArray(proposal?.request_item_ids);
      if (fromRpc.length) return fromRpc;
      return (sourceBucket?.request_item_ids ?? [])
        .map((requestItemId) => String(requestItemId ?? "").trim())
        .filter(Boolean);
    })();
    const raw_status = norm(proposal?.raw_status ?? null) || null;
    const submitted_at = norm(proposal?.submitted_at ?? null) || null;
    const sent_to_accountant_at = norm(proposal?.sent_to_accountant_at ?? null) || null;
    const status = normalizeProposalStatus(raw_status);
    const visible_to_director = isProposalDirectorVisibleRow({
      status: raw_status,
      submitted_at,
      sent_to_accountant_at,
    });

    return {
      proposal_id: norm(proposal?.proposal_id ?? null),
      proposal_no: norm(proposal?.proposal_no ?? null) || null,
      supplier: supplierText,
      request_item_ids,
      status,
      raw_status,
      submitted: !!submitted_at && status === "submitted",
      submitted_at,
      visible_to_director,
      submit_source: proposal?.submit_source ?? (submitted_at ? "rpc:proposal_submit_text_v1" : null),
    };
  });

  const metaSource = rawResult?.meta ?? null;
  return {
    proposals,
    meta: {
      canonical_path: "rpc:proposal_submit_v3",
      client_mutation_id: norm(metaSource?.client_mutation_id ?? null) || null,
      request_id: norm(metaSource?.request_id ?? null) || null,
      idempotent_replay: parseBoolean(metaSource?.idempotent_replay),
      expected_bucket_count: parseInteger(metaSource?.expected_bucket_count, proposals.length),
      expected_item_count: parseInteger(
        metaSource?.expected_item_count,
        proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0),
      ),
      created_proposal_count: parseInteger(metaSource?.created_proposal_count, proposals.length),
      created_item_count: parseInteger(
        metaSource?.created_item_count,
        proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0),
      ),
      attachment_continuation_ready:
        metaSource?.attachment_continuation_ready === false ? false : true,
    },
  };
}

async function runAtomicProposalSubmitRpc(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions,
): Promise<CreateProposalsResult> {
  const args: ProposalAtomicSubmitRpcArgs = {
    p_client_mutation_id: buildProposalSubmitMutationId(buckets, opts),
    p_buckets: buckets,
    p_buyer_fio: norm(opts.buyerFio ?? null) || null,
    p_submit: opts.submit !== false,
    p_request_item_status: norm(opts.requestItemStatus ?? null) || null,
    p_request_id: norm(opts.requestId ?? null) || null,
  };

  const { data, error } = await callProposalAtomicSubmitRpc(args);
  if (error) {
    if (isProposalRequestSupplierConflict(error)) {
      return await recoverExistingProposalSubmitResult(buckets, opts, args.p_client_mutation_id);
    }
    throw error;
  }

  const validated = validateRpcResponse(data, isAtomicSubmitRpcResult, {
    rpcName: "rpc_proposal_submit_v3",
    caller: "src/lib/catalog/catalog.proposalCreation.service.runAtomicProposalSubmitRpc",
    domain: "proposal",
  });
  const parsed = mapAtomicProposalSubmitResult(validated, buckets);
  if (!parsed.proposals.length) {
    throw new Error("rpc_proposal_submit_v3 returned empty proposals");
  }
  if (parsed.proposals.some((proposal) => !proposal.proposal_id)) {
    throw new Error("rpc_proposal_submit_v3 returned proposal without proposal_id");
  }

  const expectedBucketCount = parsed.meta?.expected_bucket_count ?? parsed.proposals.length;
  const createdProposalCount = parsed.meta?.created_proposal_count ?? parsed.proposals.length;
  const expectedItemCount =
    parsed.meta?.expected_item_count ??
    parsed.proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0);
  const createdItemCount =
    parsed.meta?.created_item_count ??
    parsed.proposals.reduce((sum, proposal) => sum + proposal.request_item_ids.length, 0);

  if (createdProposalCount !== expectedBucketCount || parsed.proposals.length !== expectedBucketCount) {
    throw new Error(
      `rpc_proposal_submit_v3 proposal count mismatch: expected ${expectedBucketCount}, got ${createdProposalCount}/${parsed.proposals.length}`,
    );
  }
  if (createdItemCount !== expectedItemCount) {
    throw new Error(
      `rpc_proposal_submit_v3 item count mismatch: expected ${expectedItemCount}, got ${createdItemCount}`,
    );
  }

  return parsed;
}

export async function createProposalsBySupplier(
  buckets: ProposalBucketInput[],
  opts: CreateProposalsOptions = {},
): Promise<CreateProposalsResult> {
  return await traceAsync(
    "proposal.submit",
    {
      flow: "proposal_submit",
      role: "buyer",
    },
    async () => await runAtomicProposalSubmitRpc(buckets, opts),
  );
}
