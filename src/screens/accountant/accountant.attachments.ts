import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../lib/database.types";
import {
  ensureProposalAttachmentUrl,
  listCanonicalProposalAttachments,
  type CanonicalProposalAttachmentReadModel,
  type ProposalAttachmentViewState,
} from "../../lib/api/proposalAttachments.service";

type SupabaseLike = SupabaseClient<Database>;

type ProposalHeaderRow = {
  id?: string | null;
  proposal_no?: string | null;
  id_short?: string | number | null;
  status?: string | null;
  payment_status?: string | null;
  sent_to_accountant_at?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
};

export type AccountantAttachmentOwnerType = "proposal_commercial" | "invoice" | "payment";
export type AccountantAttachmentResolverKind = "signed_url";
export type AccountantAttachmentBasisKind =
  | "supplier_quote"
  | "invoice_source"
  | "commercial_doc";
export type AccountantAttachmentFilterReason =
  | "missing_locator"
  | "non_basis_group"
  | "surrogate_group";

export type AccountantAttachment = {
  attachmentId: string;
  proposalId: string;
  ownerType: AccountantAttachmentOwnerType;
  ownerId: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  isVisibleToAccountant: boolean;
  basisKind: AccountantAttachmentBasisKind;
  sourceKind: "canonical" | "compatibility";
  sourceDetailKind: "proposal_attachments";
  resolverKind: AccountantAttachmentResolverKind;
  bucketId: string | null;
  storagePath: string | null;
  groupKey: string | null;
  createdAt: string | null;
};

export type AccountantAttachmentDiagnostics = {
  proposalId: string;
  rawCount: number;
  mappedCount: number;
  filteredCount: number;
  filterReasons: Record<AccountantAttachmentFilterReason, number>;
  explicitRowCount: number;
  visibleCommercialRowCount: number;
  generatedProposalDocumentInjected: boolean;
  basisGroupCounts: Record<string, number>;
  surrogateGroupCounts: Record<string, number>;
  ownerChain: {
    proposalNo: string | null;
    hasInvoiceMeta: boolean;
    hasSentToAccountant: boolean;
    paymentCount: number;
  };
};

export type AccountantAttachmentLoadResult = {
  rows: AccountantAttachment[];
  state: ProposalAttachmentViewState;
  sourceKind: string;
  fallbackUsed: boolean;
  rawCount: number;
  mappedCount: number;
  filteredCount: number;
  errorMessage: string | null;
  diagnostics: AccountantAttachmentDiagnostics;
};

type CommercialGroupConfig = {
  ownerType: AccountantAttachmentOwnerType;
  basisKind: AccountantAttachmentBasisKind;
};

const text = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => text(value).toLowerCase();

const COMMERCIAL_GROUP_CONFIG = new Map<string, CommercialGroupConfig>([
  [
    "supplier_quote",
    {
      ownerType: "proposal_commercial",
      basisKind: "supplier_quote",
    },
  ],
  [
    "commercial_doc",
    {
      ownerType: "proposal_commercial",
      basisKind: "commercial_doc",
    },
  ],
  [
    "invoice_source",
    {
      ownerType: "proposal_commercial",
      basisKind: "invoice_source",
    },
  ],
]);
const SURROGATE_EVIDENCE_KINDS = new Set(["proposal_pdf", "proposal_html"]);

const emptyFilterReasons = (): Record<AccountantAttachmentFilterReason, number> => ({
  missing_locator: 0,
  non_basis_group: 0,
  surrogate_group: 0,
});

const incrementFilterReason = (
  reasons: Record<AccountantAttachmentFilterReason, number>,
  reason: AccountantAttachmentFilterReason,
) => {
  reasons[reason] += 1;
};

const inferMimeType = (fileName: string, groupKey: string | null): string | null => {
  const normalizedName = lower(fileName);
  const normalizedGroupKey = lower(groupKey);
  if (normalizedName.endsWith(".pdf") || normalizedGroupKey === "proposal_pdf") {
    return "application/pdf";
  }
  if (normalizedName.endsWith(".html") || normalizedGroupKey === "proposal_html") {
    return "text/html";
  }
  if (normalizedName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalizedName.endsWith(".doc")) {
    return "application/msword";
  }
  if (normalizedName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (normalizedName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }
  if (normalizedName.endsWith(".png")) return "image/png";
  if (normalizedName.endsWith(".jpg") || normalizedName.endsWith(".jpeg")) return "image/jpeg";
  return null;
};

const countGroups = (rows: Array<{ groupKey?: string | null }>) => {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = text(row.groupKey) || "ungrouped";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const sortRows = (rows: AccountantAttachment[]) =>
  rows.slice().sort((left, right) => {
    const leftAt = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightAt = right.createdAt ? Date.parse(right.createdAt) : 0;
    if (leftAt !== rightAt) return rightAt - leftAt;
    return right.attachmentId.localeCompare(left.attachmentId);
  });

async function loadProposalHeader(client: SupabaseLike, proposalId: string): Promise<ProposalHeaderRow | null> {
  const query = await client
    .from("proposals")
    .select(
      "id,proposal_no,id_short,status,payment_status,sent_to_accountant_at,invoice_number,invoice_date",
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (query.error) throw query.error;
  return query.data ?? null;
}

async function loadProposalPaymentCount(client: SupabaseLike, proposalId: string): Promise<number> {
  const query = await client
    .from("proposal_payments")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId);

  if (query.error) throw query.error;
  return Number(query.count ?? 0);
}

function mapExplicitRow(
  row: CanonicalProposalAttachmentReadModel,
  reasons: Record<AccountantAttachmentFilterReason, number>,
): AccountantAttachment | null {
  const evidenceKind = lower(row.evidenceKind);
  if (SURROGATE_EVIDENCE_KINDS.has(evidenceKind)) {
    incrementFilterReason(reasons, "surrogate_group");
    return null;
  }

  if (row.visibilityScope !== "buyer_director_accountant" && row.visibilityScope !== "director_accountant") {
    incrementFilterReason(reasons, "non_basis_group");
    return null;
  }

  const groupConfig = COMMERCIAL_GROUP_CONFIG.get(evidenceKind);
  if (!groupConfig) {
    incrementFilterReason(reasons, "non_basis_group");
    return null;
  }

  const hasLocator =
    Boolean(text(row.fileUrl)) ||
    (Boolean(text(row.bucketId)) && Boolean(text(row.storagePath)));
  if (!hasLocator) {
    incrementFilterReason(reasons, "missing_locator");
    return null;
  }

  return {
    attachmentId: row.attachmentId,
    proposalId: row.proposalId,
    ownerType: groupConfig.ownerType,
    ownerId: row.entityId,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType ?? inferMimeType(row.fileName, row.groupKey),
    isVisibleToAccountant: true,
    basisKind: groupConfig.basisKind,
    sourceKind: row.sourceKind,
    sourceDetailKind: "proposal_attachments",
    resolverKind: "signed_url",
    bucketId: row.bucketId,
    storagePath: row.storagePath,
    groupKey: row.groupKey,
    createdAt: row.createdAt,
  };
}

export async function listProposalAttachments(
  client: SupabaseLike,
  proposalIdInput: string,
): Promise<AccountantAttachmentLoadResult> {
  const proposalId = text(proposalIdInput);
  if (!proposalId) {
    const diagnostics: AccountantAttachmentDiagnostics = {
      proposalId,
      rawCount: 0,
      mappedCount: 0,
      filteredCount: 0,
      filterReasons: emptyFilterReasons(),
      explicitRowCount: 0,
      visibleCommercialRowCount: 0,
      generatedProposalDocumentInjected: false,
      basisGroupCounts: {},
      surrogateGroupCounts: {},
      ownerChain: {
        proposalNo: null,
        hasInvoiceMeta: false,
        hasSentToAccountant: false,
        paymentCount: 0,
      },
    };
    return {
      rows: [],
      state: "error",
      sourceKind: "rpc:proposal_attachment_evidence_scope_v1",
      fallbackUsed: false,
      rawCount: 0,
      mappedCount: 0,
      filteredCount: 0,
      errorMessage: "proposalId is empty",
      diagnostics,
    };
  }

  const [canonicalResult, proposalHeader, paymentCount] = await Promise.all([
    listCanonicalProposalAttachments(client, proposalId, {
      screen: "accountant",
    }),
    loadProposalHeader(client, proposalId).catch(() => null),
    loadProposalPaymentCount(client, proposalId).catch(() => 0),
  ]);

  const filterReasons = emptyFilterReasons();
  const commercialRows = canonicalResult.rows
    .map((row) => mapExplicitRow(row, filterReasons))
    .filter((row): row is AccountantAttachment => !!row);
  const rows = sortRows(commercialRows);
  const basisGroupCounts = countGroups(rows);
  const surrogateGroupCounts = countGroups(
    canonicalResult.rows.filter((row) => SURROGATE_EVIDENCE_KINDS.has(lower(row.evidenceKind))),
  );

  const filteredCount =
    canonicalResult.filteredCount +
    Object.values(filterReasons).reduce((sum, value) => sum + value, 0);

  const diagnostics: AccountantAttachmentDiagnostics = {
    proposalId,
    rawCount: canonicalResult.rawCount,
    mappedCount: canonicalResult.mappedCount,
    filteredCount,
    filterReasons,
    explicitRowCount: canonicalResult.rows.length,
    visibleCommercialRowCount: rows.length,
    generatedProposalDocumentInjected: false,
    basisGroupCounts,
    surrogateGroupCounts,
    ownerChain: {
      proposalNo: text(proposalHeader?.proposal_no) || null,
      hasInvoiceMeta: Boolean(text(proposalHeader?.invoice_number) || text(proposalHeader?.invoice_date)),
      hasSentToAccountant: Boolean(text(proposalHeader?.sent_to_accountant_at)),
      paymentCount,
    },
  };

  let state: ProposalAttachmentViewState = canonicalResult.state;
  let errorMessage = canonicalResult.errorMessage;

  if (rows.length > 0) {
    if (canonicalResult.state === "degraded") {
      state = "degraded";
      errorMessage =
        canonicalResult.errorMessage ||
        "Commercial accountant attachments were loaded through the compatibility path.";
    } else {
      state = "ready";
      errorMessage = null;
    }
  } else if (canonicalResult.state === "error") {
    state = "error";
    errorMessage = canonicalResult.errorMessage || "Commercial accountant attachments failed to load.";
  } else if (Object.keys(surrogateGroupCounts).length > 0) {
    state = "degraded";
    errorMessage =
      "Only technical proposal documents were found. Accountant basis attachments show commercial buyer files only.";
  } else if (canonicalResult.rows.length > 0) {
    state = "degraded";
    errorMessage =
      "Proposal attachments were found, but none matched accountant commercial-basis visibility rules.";
  } else {
    state = "empty";
    errorMessage = null;
  }

  return {
    rows,
    state,
    sourceKind: canonicalResult.sourceKind,
    fallbackUsed: canonicalResult.fallbackUsed,
    rawCount: canonicalResult.rawCount,
    mappedCount: canonicalResult.mappedCount,
    filteredCount,
    errorMessage,
    diagnostics,
  };
}

export async function ensureAttachmentSignedUrl(
  client: SupabaseLike,
  row: AccountantAttachment,
): Promise<string> {
  return ensureProposalAttachmentUrl(client, {
    attachmentId: row.attachmentId,
    proposalId: row.proposalId,
    ownerType: row.ownerType === "proposal_commercial" ? "proposal" : row.ownerType,
    ownerId: row.ownerId,
    entityType: "proposal",
    entityId: row.ownerId,
    evidenceKind:
      row.basisKind === "invoice_source"
        ? "invoice_source"
        : row.basisKind === "commercial_doc"
          ? "commercial_doc"
          : "supplier_quote",
    createdBy: null,
    visibilityScope: "buyer_director_accountant",
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileUrl: row.fileUrl,
    storagePath: row.storagePath,
    bucketId: row.bucketId,
    groupKey: row.groupKey,
    createdAt: row.createdAt,
    sourceKind: row.sourceKind,
  });
}
