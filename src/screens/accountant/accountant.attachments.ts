import { supabase } from "../../lib/supabaseClient";
import {
  ensureProposalAttachmentUrl,
  listCanonicalProposalAttachments,
  type CanonicalProposalAttachmentReadModel,
  type ProposalAttachmentViewState,
} from "../../lib/api/proposalAttachments.service";

type SupabaseLike = typeof supabase;

type ProposalHeaderRow = {
  id?: string | null;
  proposal_no?: string | null;
  id_short?: string | number | null;
  status?: string | null;
  payment_status?: string | null;
  sent_to_accountant_at?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  created_at?: string | null;
  submitted_at?: string | null;
};

export type AccountantAttachmentOwnerType = "proposal" | "invoice" | "payment";
export type AccountantAttachmentResolverKind = "signed_url" | "generated_proposal_pdf";
export type AccountantAttachmentFilterReason =
  | "screen_hidden_group"
  | "missing_locator";

export type AccountantAttachment = {
  attachmentId: string;
  proposalId: string;
  ownerType: AccountantAttachmentOwnerType;
  ownerId: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string | null;
  isVisibleToAccountant: boolean;
  sourceKind: "canonical" | "compatibility";
  sourceDetailKind: "proposal_attachments" | "generated_proposal_pdf";
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
  visibleExplicitRowCount: number;
  generatedProposalDocumentInjected: boolean;
  proposalAttachmentGroups: Record<string, number>;
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

const text = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => text(value).toLowerCase();

const ACCOUNTANT_VISIBLE_GROUPS = new Set([
  "supplier_quote",
  "proposal_pdf",
  "proposal_html",
  "invoice",
  "payment",
]);
const PROPOSAL_SOURCE_GROUPS = new Set(["proposal_pdf", "proposal_html"]);

const emptyFilterReasons = (): Record<AccountantAttachmentFilterReason, number> => ({
  screen_hidden_group: 0,
  missing_locator: 0,
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

const toOwnerType = (groupKey: string | null): AccountantAttachmentOwnerType | null => {
  const normalized = lower(groupKey);
  if (!normalized) return "proposal";
  if (normalized === "invoice") return "invoice";
  if (normalized === "payment") return "payment";
  if (ACCOUNTANT_VISIBLE_GROUPS.has(normalized)) return "proposal";
  return null;
};

const countGroups = (rows: CanonicalProposalAttachmentReadModel[]) => {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = text(row.groupKey) || "ungrouped";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const sortRows = (rows: AccountantAttachment[]) =>
  rows
    .slice()
    .sort((left, right) => {
      const leftGenerated = left.sourceDetailKind === "generated_proposal_pdf" ? 1 : 0;
      const rightGenerated = right.sourceDetailKind === "generated_proposal_pdf" ? 1 : 0;
      if (leftGenerated !== rightGenerated) return rightGenerated - leftGenerated;

      const leftAt = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightAt = right.createdAt ? Date.parse(right.createdAt) : 0;
      if (leftAt !== rightAt) return rightAt - leftAt;
      return right.attachmentId.localeCompare(left.attachmentId);
    });

async function loadProposalHeader(client: SupabaseLike, proposalId: string): Promise<ProposalHeaderRow | null> {
  const query = await client
    .from("proposals")
    .select(
      "id,proposal_no,id_short,status,payment_status,sent_to_accountant_at,invoice_number,invoice_date,created_at,submitted_at",
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

function buildGeneratedProposalDocument(
  proposalId: string,
  header: ProposalHeaderRow | null,
): AccountantAttachment {
  const proposalNo = text(header?.proposal_no);
  const fileName = proposalNo ? `${proposalNo}.pdf` : `proposal_${proposalId.slice(0, 8)}.pdf`;
  return {
    attachmentId: `generated:proposal_pdf:${proposalId}`,
    proposalId,
    ownerType: "proposal",
    ownerId: proposalId,
    fileName,
    fileUrl: null,
    mimeType: "application/pdf",
    isVisibleToAccountant: true,
    sourceKind: "canonical",
    sourceDetailKind: "generated_proposal_pdf",
    resolverKind: "generated_proposal_pdf",
    bucketId: null,
    storagePath: null,
    groupKey: "proposal_pdf",
    createdAt:
      text(header?.sent_to_accountant_at) ||
      text(header?.submitted_at) ||
      text(header?.created_at) ||
      null,
  };
}

function mapExplicitRow(
  row: CanonicalProposalAttachmentReadModel,
  reasons: Record<AccountantAttachmentFilterReason, number>,
): AccountantAttachment | null {
  const ownerType = toOwnerType(row.groupKey);
  if (!ownerType) {
    incrementFilterReason(reasons, "screen_hidden_group");
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
    ownerType,
    ownerId: row.proposalId,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: inferMimeType(row.fileName, row.groupKey),
    isVisibleToAccountant: true,
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
      visibleExplicitRowCount: 0,
      generatedProposalDocumentInjected: false,
      proposalAttachmentGroups: {},
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
      sourceKind: "rpc:proposal_attachments_list",
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
  const proposalAttachmentGroups = countGroups(canonicalResult.rows);
  const visibleExplicitRows = canonicalResult.rows
    .map((row) => mapExplicitRow(row, filterReasons))
    .filter((row): row is AccountantAttachment => !!row);

  const hasProposalSourceRow = visibleExplicitRows.some((row) =>
    PROPOSAL_SOURCE_GROUPS.has(lower(row.groupKey)),
  );
  const generatedProposalDocumentInjected = Boolean(proposalHeader) && !hasProposalSourceRow;

  const rows = sortRows([
    ...(generatedProposalDocumentInjected
      ? [buildGeneratedProposalDocument(proposalId, proposalHeader)]
      : []),
    ...visibleExplicitRows,
  ]);

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
    visibleExplicitRowCount: visibleExplicitRows.length,
    generatedProposalDocumentInjected,
    proposalAttachmentGroups,
    ownerChain: {
      proposalNo: text(proposalHeader?.proposal_no) || null,
      hasInvoiceMeta: Boolean(text(proposalHeader?.invoice_number) || text(proposalHeader?.invoice_date)),
      hasSentToAccountant: Boolean(text(proposalHeader?.sent_to_accountant_at)),
      paymentCount,
    },
  };

  const syntheticOnlyRecovery = rows.length > 0 && visibleExplicitRows.length === 0 && generatedProposalDocumentInjected;
  const recoveredFromFailure = rows.length > 0 && canonicalResult.state === "error";

  let state: ProposalAttachmentViewState = canonicalResult.state;
  let errorMessage = canonicalResult.errorMessage;

  if (rows.length > 0) {
    if (syntheticOnlyRecovery) {
      state = "degraded";
      errorMessage =
        "Persisted accountant-visible attachments not found; proposal source document was recovered from proposal owner.";
    } else if (recoveredFromFailure) {
      state = "degraded";
      errorMessage =
        canonicalResult.errorMessage ||
        "Canonical attachment source failed; using recovered accountant attachment owner chain.";
    } else if (canonicalResult.state === "degraded") {
      state = "degraded";
      errorMessage =
        canonicalResult.errorMessage ||
        "Canonical attachment source returned compatibility rows.";
    } else {
      state = "ready";
      errorMessage = null;
    }
  } else if (canonicalResult.state === "ready") {
    state = "empty";
    errorMessage = null;
  }

  const sourceKind = generatedProposalDocumentInjected
    ? `${canonicalResult.sourceKind}+generated_proposal_pdf`
    : canonicalResult.sourceKind;

  return {
    rows,
    state,
    sourceKind,
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
  if (row.resolverKind === "generated_proposal_pdf") {
    const { exportProposalPdf } = await import("../../lib/catalog_api");
    return exportProposalPdf(row.proposalId, "preview");
  }

  return ensureProposalAttachmentUrl(client, {
    attachmentId: row.attachmentId,
    proposalId: row.proposalId,
    ownerType: row.ownerType,
    ownerId: row.ownerId,
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
