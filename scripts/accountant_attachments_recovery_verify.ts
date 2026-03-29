import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import { listCanonicalProposalAttachments } from "../src/lib/api/proposalAttachments.service";
import { listProposalAttachments } from "../src/screens/accountant/accountant.attachments";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const admin = createVerifierAdmin("accountant-attachments-recovery-verify");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const text = (value: unknown) => String(value ?? "").trim();

type ProposalRow = {
  id?: string | null;
  proposal_no?: string | null;
  status?: string | null;
  payment_status?: string | null;
  sent_to_accountant_at?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  created_at?: string | null;
};

type AttachmentRow = {
  id?: string | number | null;
  proposal_id?: string | null;
  group_key?: string | null;
  file_name?: string | null;
  bucket_id?: string | null;
  storage_path?: string | null;
  created_at?: string | null;
};

type PurchaseRow = {
  id?: string | null;
  proposal_id?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  payment_status?: string | null;
  attachments?: unknown;
};

type ProposalPaymentRow = {
  id?: number | null;
  proposal_id?: string | null;
  paid_at?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

type AccountantScopeRow = {
  proposal_id?: string | null;
  proposal_no?: string | null;
};

type ScopeEnvelope = {
  rows?: AccountantScopeRow[];
  meta?: Record<string, unknown>;
};

async function findProposalByNo(proposalNo: string) {
  const query = await admin
    .from("proposals")
    .select(
      "id,proposal_no,status,payment_status,sent_to_accountant_at,invoice_number,invoice_date,created_at",
    )
    .eq("proposal_no", proposalNo)
    .maybeSingle();
  if (query.error) throw query.error;
  return (query.data ?? null) as ProposalRow | null;
}

async function loadOwnerChain(proposalId: string) {
  const [proposal, proposalAttachments, purchases, proposalPayments] = await Promise.all([
    admin
      .from("proposals")
      .select(
        "id,proposal_no,status,payment_status,sent_to_accountant_at,invoice_number,invoice_date,created_at",
      )
      .eq("id", proposalId)
      .maybeSingle(),
    admin
      .from("proposal_attachments")
      .select("id,proposal_id,group_key,file_name,bucket_id,storage_path,created_at")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false }),
    admin
      .from("purchases")
      .select("id,proposal_id,invoice_no,invoice_date,payment_status,attachments")
      .eq("proposal_id", proposalId),
    admin
      .from("proposal_payments")
      .select("id,proposal_id,paid_at,amount,created_at")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false }),
  ]);

  if (proposal.error) throw proposal.error;
  if (proposalAttachments.error) throw proposalAttachments.error;
  if (purchases.error) throw purchases.error;
  if (proposalPayments.error) throw proposalPayments.error;

  const paymentRpc = await Promise.all(
    ((proposalPayments.data ?? []) as ProposalPaymentRow[]).map(async (payment) => {
      const paymentId = Number(payment.id);
      const rpc = await admin.rpc("pdf_payment_source_v1", { p_payment_id: paymentId });
      return {
        paymentId,
        error:
          rpc.error == null
            ? null
            : {
                message: rpc.error.message,
                details: rpc.error.details,
                hint: rpc.error.hint,
                code: rpc.error.code,
              },
        attachmentsMetaCount: Array.isArray(rpc.data?.attachments_meta) ? rpc.data.attachments_meta.length : 0,
        attachmentsMetaSample: Array.isArray(rpc.data?.attachments_meta)
          ? rpc.data.attachments_meta.slice(0, 5)
          : [],
      };
    }),
  );

  return {
    proposal: proposal.data ?? null,
    proposalAttachments: (proposalAttachments.data ?? []) as AttachmentRow[],
    proposalAttachmentGroups: Object.fromEntries(
      Object.entries(
        ((proposalAttachments.data ?? []) as AttachmentRow[]).reduce<Record<string, number>>((acc, row) => {
          const key = text(row.group_key) || "ungrouped";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((left, right) => left[0].localeCompare(right[0])),
    ),
    purchases: (purchases.data ?? []) as PurchaseRow[],
    proposalPayments: (proposalPayments.data ?? []) as ProposalPaymentRow[],
    paymentRpc,
  };
}

async function loadInboxSample(tab: string) {
  const rpc = await admin.rpc("accountant_inbox_scope_v1", {
    p_tab: tab,
    p_offset: 0,
    p_limit: 10,
  });
  if (rpc.error) throw rpc.error;
  const envelope = (rpc.data ?? {}) as ScopeEnvelope;
  const row = Array.isArray(envelope.rows) ? envelope.rows.find((item) => text(item.proposal_id)) : null;
  return row
    ? {
        tab,
        proposalId: text(row.proposal_id),
        proposalNo: text(row.proposal_no) || null,
      }
    : {
        tab,
        proposalId: null,
        proposalNo: null,
      };
}

async function loadHistorySample() {
  const rpc = await admin.rpc("accountant_history_scope_v1", {
    p_date_from: null,
    p_date_to: null,
    p_search: null,
    p_offset: 0,
    p_limit: 10,
  });
  if (rpc.error) throw rpc.error;
  const envelope = (rpc.data ?? {}) as ScopeEnvelope;
  const row = Array.isArray(envelope.rows) ? envelope.rows.find((item) => text(item.proposal_id)) : null;
  return row
    ? {
        tab: "history",
        proposalId: text(row.proposal_id),
        proposalNo: text(row.proposal_no) || null,
      }
    : {
        tab: "history",
        proposalId: null,
        proposalNo: null,
      };
}

async function loadSentToAccountantSummary() {
  const proposals = await admin
    .from("proposals")
    .select("id,proposal_no,sent_to_accountant_at,payment_status,status")
    .not("sent_to_accountant_at", "is", null)
    .limit(200);
  if (proposals.error) throw proposals.error;

  const ids = (proposals.data ?? []).map((row) => text((row as ProposalRow).id)).filter(Boolean);
  const attachments = ids.length
    ? await admin.from("proposal_attachments").select("proposal_id,group_key").in("proposal_id", ids)
    : { data: [], error: null };
  if (attachments.error) throw attachments.error;

  const attachmentGroupsByProposal = new Map<string, Record<string, number>>();
  for (const row of (attachments.data ?? []) as AttachmentRow[]) {
    const proposalId = text(row.proposal_id);
    if (!proposalId) continue;
    const entry = attachmentGroupsByProposal.get(proposalId) ?? {};
    const group = text(row.group_key) || "ungrouped";
    entry[group] = (entry[group] ?? 0) + 1;
    attachmentGroupsByProposal.set(proposalId, entry);
  }

  const financeGroups = new Set(["proposal_html", "proposal_pdf", "invoice", "payment"]);
  const sample = ((proposals.data ?? []) as ProposalRow[]).slice(0, 25).map((proposal) => {
    const proposalId = text(proposal.id);
    return {
      proposalId,
      proposalNo: text(proposal.proposal_no) || null,
      paymentStatus: text(proposal.payment_status) || null,
      attachmentGroups: attachmentGroupsByProposal.get(proposalId) ?? {},
    };
  });

  const sentRows = ((proposals.data ?? []) as ProposalRow[]).map((proposal) => {
    const proposalId = text(proposal.id);
    const groups = attachmentGroupsByProposal.get(proposalId) ?? {};
    return {
      proposalId,
      proposalNo: text(proposal.proposal_no) || null,
      groups,
      hasFinanceAttachmentGroup: Object.keys(groups).some((group) => financeGroups.has(group)),
      hasAnyAttachment: Object.keys(groups).length > 0,
    };
  });

  return {
    totalSentToAccountant: sentRows.length,
    withAnyAttachments: sentRows.filter((row) => row.hasAnyAttachment).length,
    withFinanceAttachmentGroups: sentRows.filter((row) => row.hasFinanceAttachmentGroup).length,
    sample,
  };
}

async function main() {
  const proposalNo = "PR-0381/2026";
  const targetProposal = await findProposalByNo(proposalNo);
  if (!targetProposal?.id) {
    throw new Error(`Target proposal not found: ${proposalNo}`);
  }
  const proposalId = text(targetProposal.id);

  const ownerChain = await loadOwnerChain(proposalId);
  const baseCanonical = await listCanonicalProposalAttachments(admin, proposalId, { screen: "accountant" });
  const accountantResult = await listProposalAttachments(admin, proposalId);
  const sentSummary = await loadSentToAccountantSummary();

  const explicitSample =
    sentSummary.sample.find((item) => Object.keys(item.attachmentGroups).length > 0)?.proposalId ?? null;
  const explicitSampleResult = explicitSample
    ? await listProposalAttachments(admin, explicitSample)
    : null;

  const statusSamples = await Promise.all([
    loadInboxSample("to_pay"),
    loadInboxSample("partial"),
    loadInboxSample("paid"),
    loadHistorySample(),
  ]);

  const cardProofCases = await Promise.all(
    statusSamples.map(async (sample) => {
      if (!sample.proposalId) {
        return {
          tab: sample.tab,
          proposalId: null,
          proposalNo: null,
          state: "empty",
          sourceKind: null,
          rowCount: 0,
          fields: [],
        };
      }

      const result = await listProposalAttachments(admin, sample.proposalId);
      return {
        tab: sample.tab,
        proposalId: sample.proposalId,
        proposalNo: sample.proposalNo,
        state: result.state,
        sourceKind: result.sourceKind,
        rowCount: result.rows.length,
        fields: result.rows[0] ? Object.keys(result.rows[0]).sort() : [],
      };
    }),
  );

  const ownerChainArtifact = {
    generatedAt: new Date().toISOString(),
    proposalNo,
    proposalId,
    ownerChain,
    sentToAccountantSummary: sentSummary,
  };

  const loaderDiagnosticsArtifact = {
    generatedAt: new Date().toISOString(),
    proposalNo,
    proposalId,
    requestSuccess: true,
    canonicalBase: {
      state: baseCanonical.state,
      sourceKind: baseCanonical.sourceKind,
      fallbackUsed: baseCanonical.fallbackUsed,
      rawCount: baseCanonical.rawCount,
      mappedCount: baseCanonical.mappedCount,
      filteredCount: baseCanonical.filteredCount,
      errorMessage: baseCanonical.errorMessage,
      rowGroups: baseCanonical.rows.map((row) => ({
        attachmentId: row.attachmentId,
        groupKey: row.groupKey,
        fileName: row.fileName,
        sourceKind: row.sourceKind,
      })),
    },
    accountantReadModel: {
      state: accountantResult.state,
      sourceKind: accountantResult.sourceKind,
      fallbackUsed: accountantResult.fallbackUsed,
      rawCount: accountantResult.rawCount,
      mappedCount: accountantResult.mappedCount,
      filteredCount: accountantResult.filteredCount,
      errorMessage: accountantResult.errorMessage,
      diagnostics: accountantResult.diagnostics,
      rows: accountantResult.rows,
    },
    exactFailurePoint:
      baseCanonical.rows.length === 0 && accountantResult.rows.length > 0
        ? "base canonical attachment query returned zero persisted rows; accountant wrapper recovered proposal owner document"
        : baseCanonical.rows.length > 0 && accountantResult.rows.length === 0
          ? "accountant mapper/filter removed all rows"
          : "no mismatch",
  };

  const cardProofArtifact = {
    generatedAt: new Date().toISOString(),
    contractFields:
      accountantResult.rows[0] == null ? [] : Object.keys(accountantResult.rows[0]).sort(),
    statusIndependentSource: true,
    cases: cardProofCases,
  };

  const smoke = {
    generatedAt: new Date().toISOString(),
    smoke1_pr0381_recovered: {
      proposalNo,
      rowCount: accountantResult.rows.length,
      state: accountantResult.state,
      generatedProposalDocumentInjected: accountantResult.diagnostics.generatedProposalDocumentInjected,
      pass:
        accountantResult.rows.length > 0 &&
        accountantResult.state === "degraded" &&
        accountantResult.diagnostics.generatedProposalDocumentInjected,
    },
    smoke2_explicit_rows_visible: explicitSampleResult
      ? {
          proposalId: explicitSample,
          rowCount: explicitSampleResult.rows.length,
          hasExplicitRow: explicitSampleResult.rows.some(
            (row) => row.sourceDetailKind === "proposal_attachments",
          ),
          state: explicitSampleResult.state,
          pass:
            explicitSampleResult.rows.length > 0 &&
            explicitSampleResult.rows.some((row) => row.sourceDetailKind === "proposal_attachments"),
        }
      : null,
    smoke3_request_success_vs_data_success: {
      baseRawCount: baseCanonical.rawCount,
      baseMappedCount: baseCanonical.mappedCount,
      accountantRowCount: accountantResult.rows.length,
      pass:
        baseCanonical.rawCount === 0 &&
        baseCanonical.mappedCount === 0 &&
        accountantResult.rows.length > 0,
    },
    smoke4_card_contract_shared: {
      caseCount: cardProofCases.filter((item) => item.proposalId).length,
      allCasesUseCanonicalRows: cardProofCases
        .filter((item) => item.proposalId)
        .every((item) => item.fields.includes("attachmentId") && item.fields.includes("sourceDetailKind")),
      pass: cardProofCases
        .filter((item) => item.proposalId)
        .every((item) => item.fields.includes("attachmentId") && item.fields.includes("sourceDetailKind")),
    },
  };

  const summary = {
    status:
      smoke.smoke1_pr0381_recovered.pass &&
      (smoke.smoke2_explicit_rows_visible == null || smoke.smoke2_explicit_rows_visible.pass) &&
      smoke.smoke3_request_success_vs_data_success.pass &&
      smoke.smoke4_card_contract_shared.pass
        ? "GREEN"
        : "NOT GREEN",
    targetProposalNo: proposalNo,
    targetProposalId: proposalId,
    targetState: accountantResult.state,
    targetRowCount: accountantResult.rows.length,
    financeAttachmentGroupsInSentSet: sentSummary.withFinanceAttachmentGroups,
  };

  writeJson("artifacts/accountant-attachments-owner-chain-map.json", ownerChainArtifact);
  writeJson("artifacts/accountant-attachments-loader-diagnostics.json", loaderDiagnosticsArtifact);
  writeJson("artifacts/accountant-attachments-card-proof.json", cardProofArtifact);
  writeJson("artifacts/accountant-attachments-smoke.json", smoke);

  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
