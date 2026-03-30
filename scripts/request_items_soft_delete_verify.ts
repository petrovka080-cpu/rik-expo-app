import fs from "node:fs";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";
import { classifyProposalItemsByRequestItemIntegrity } from "../src/lib/api/integrity.guards";
import {
  getProposalIntegritySummaryLabel,
  toProposalRequestItemIntegrityDegradedError,
} from "../src/lib/api/proposalIntegrity";
import type { ProposalItemRow } from "../src/lib/api/types";
import { createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin(
  "request-items-soft-delete-proposal-recovery-verify",
) as SupabaseClient<Database>;

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();
const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeProposalStatus = (
  raw: unknown,
): "draft" | "submitted" | "approved" | "rejected" => {
  const normalized = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    !normalized ||
    normalized === "draft" ||
    normalized.includes("\u0447\u0435\u0440\u043d\u043e\u0432")
  ) {
    return "draft";
  }
  if (
    normalized === "pending" ||
    normalized === "submitted" ||
    normalized.includes("\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438")
  ) {
    return "submitted";
  }
  if (
    normalized === "approved" ||
    normalized.includes("\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d")
  ) {
    return "approved";
  }
  if (
    normalized === "rejected" ||
    normalized.includes("\u043e\u0442\u043a\u043b\u043e\u043d") ||
    normalized.includes("\u0434\u043e\u0440\u0430\u0431\u043e\u0442") ||
    normalized.includes("rework")
  ) {
    return "rejected";
  }
  return "draft";
};

type SeedBundle = {
  marker: string;
  requestId: string;
  requestItemId: string;
  proposalId: string;
  proposalItemId: number;
};

type IntegrityRow = Database["public"]["Functions"]["proposal_request_item_integrity_v1"]["Returns"][number];

type DegradedRpcFailure = {
  ok: false;
  message: string;
  degraded: true;
  summary: {
    proposalId: string | null;
    totalItems: number;
    degradedItems: number;
    cancelledItems: number;
    missingItems: number;
    requestItemIds: string[];
  };
};

type GenericRpcFailure = {
  ok: false;
  message: string;
  degraded: false;
};

type RpcSuccess = {
  ok: true;
};

type RpcOutcome = RpcSuccess | DegradedRpcFailure | GenericRpcFailure;

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const collectFiles = (relativeDir: string): string[] => {
  const root = path.join(projectRoot, relativeDir);
  const output: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(next);
        continue;
      }
      if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        output.push(next);
      }
    }
  };
  walk(root);
  return output;
};

const requestItemHardDeleteMatches = collectFiles("src")
  .map((absolutePath) => ({
    absolutePath,
    relativePath: path.relative(projectRoot, absolutePath).replace(/\\/g, "/"),
    text: fs.readFileSync(absolutePath, "utf8"),
  }))
  .filter(({ text }) =>
    /from\((["'])request_items\1\)[\s\S]{0,160}\.delete\(/m.test(text),
  )
  .map(({ relativePath }) => relativePath);

const sourceChecks = (() => {
  const requestService = readText("src/lib/catalog/catalog.request.service.ts");
  const proposalCreationService = readText(
    "src/lib/catalog/catalog.proposalCreation.service.ts",
  );
  const proposalsApi = readText("src/lib/api/proposals.ts");
  const integrityMigration = readText(
    "supabase/migrations/20260330143000_request_items_soft_delete_proposal_recovery_v1.sql",
  );
  const buyerActions = readText("src/screens/buyer/buyer.actions.ts");
  const buyerSheet = readText(
    "src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx",
  );
  const directorSheet = readText("src/screens/director/DirectorProposalSheet.tsx");
  const directorProposal = readText("src/screens/director/director.proposal.ts");

  const requestItemCancelBlock = requestService.slice(
    requestService.indexOf("export async function requestItemCancel("),
    requestService.indexOf("export async function", requestService.indexOf("export async function requestItemCancel(") + 1) > 0
      ? requestService.indexOf("export async function", requestService.indexOf("export async function requestItemCancel(") + 1)
      : requestService.length,
  );

  return {
    requestItemCancelUsesSoftUpdate:
      requestItemCancelBlock.includes('.from("request_items")') &&
      requestItemCancelBlock.includes(".update({") &&
      requestItemCancelBlock.includes('status: "cancelled"') &&
      requestItemCancelBlock.includes("cancelled_at: new Date().toISOString()") &&
      !requestItemCancelBlock.includes(".delete("),
    noRequestItemsHardDeleteInSrc: requestItemHardDeleteMatches.length === 0,
    proposalCreateRejectsCancelledSources:
      proposalCreationService.includes("ensureActiveProposalRequestItemsIntegrity") &&
      proposalCreationService.includes("cancelled_at"),
    proposalReadUsesIntegrityClassifier:
      proposalsApi.includes("classifyProposalItemsByRequestItemIntegrity") &&
      proposalsApi.includes("publishState: classified.degradedRequestItemIds.length ? \"degraded\" : \"ready\""),
    missingSourceContractPresent:
      integrityMigration.includes("when ri.id is null then 'source_missing'") &&
      integrityMigration.includes("'request_item_missing'") &&
      integrityMigration.includes("'missing_items'"),
    buyerViewLoadsIntegrityRpc:
      buyerActions.includes("repoGetProposalRequestItemIntegrity") &&
      buyerActions.includes("proposal_view_integrity_degraded") &&
      buyerActions.includes("request_item_integrity_state"),
    buyerSheetShowsDegradedState:
      buyerSheet.includes("getProposalIntegritySummaryLabel") &&
      buyerSheet.includes("getProposalItemIntegrityLabel"),
    directorSheetShowsDegradedState:
      directorSheet.includes("getProposalIntegritySummaryLabel") &&
      directorSheet.includes("getProposalItemIntegrityLabel"),
    directorApprovalUsesGuardedRpc:
      directorProposal.includes("director_approve_min_auto_v1") &&
      directorProposal.includes("toProposalRequestItemIntegrityDegradedError"),
  };
})();

async function insertRequest(marker: string) {
  const result = await admin
    .from("requests")
    .insert({
      status: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
      comment: `${marker}:request`,
      object_name: marker,
      note: marker,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertRequestItem(params: {
  requestId: string;
  marker: string;
}) {
  const result = await admin
    .from("request_items")
    .insert({
      request_id: params.requestId,
      status: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e",
      name_human: `${params.marker}:item`,
      qty: 2,
      uom: "pcs",
      rik_code: `${params.marker}:rik`,
      app_code: `${params.marker}:app`,
      note: `${params.marker}:item`,
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposal(params: { requestId: string; marker: string }) {
  const result = await admin
    .from("proposals")
    .insert({
      request_id: params.requestId,
      status: "\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a",
      supplier: `${params.marker}:supplier`,
      invoice_number: `${params.marker}:INV`,
      invoice_date: new Date().toISOString().slice(0, 10),
      invoice_currency: "KGS",
    })
    .select("id")
    .single<{ id: string }>();
  if (result.error) throw result.error;
  return trim(result.data.id);
}

async function insertProposalItem(params: {
  proposalId: string;
  requestItemId: string;
  marker: string;
}) {
  const result = await admin
    .from("proposal_items")
    .insert({
      proposal_id: params.proposalId,
      proposal_id_text: params.proposalId,
      request_item_id: params.requestItemId,
      name_human: `${params.marker}:item`,
      qty: 2,
      uom: "pcs",
      rik_code: `${params.marker}:rik`,
      app_code: `${params.marker}:app`,
      price: 10,
      note: `${params.marker}:proposal_item`,
      supplier: `${params.marker}:supplier`,
    })
    .select("id")
    .single<{ id: number }>();
  if (result.error) throw result.error;
  return toNumber(result.data.id);
}

async function createSeedBundle(label: string): Promise<SeedBundle> {
  const marker = `tz17:${label}:${Date.now().toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const requestId = await insertRequest(marker);
  const requestItemId = await insertRequestItem({ requestId, marker });
  const proposalId = await insertProposal({ requestId, marker });
  const proposalItemId = await insertProposalItem({ proposalId, requestItemId, marker });
  return {
    marker,
    requestId,
    requestItemId,
    proposalId,
    proposalItemId,
  };
}

async function loadProposalRows(proposalId: string): Promise<ProposalItemRow[]> {
  const result = await admin
    .from("proposal_items")
    .select("id, request_item_id, rik_code, name_human, uom, app_code, qty, price, note, supplier")
    .eq("proposal_id", proposalId)
    .order("id", { ascending: true });
  if (result.error) throw result.error;
  return (result.data ?? []).map((row) => ({
    id: toNumber(row.id),
    request_item_id: trim(row.request_item_id) || null,
    rik_code: trim(row.rik_code) || null,
    name_human: trim(row.name_human),
    uom: trim(row.uom) || null,
    app_code: trim(row.app_code) || null,
    total_qty: toNumber(row.qty),
    price: row.price == null ? null : toNumber(row.price),
    note: trim(row.note) || null,
    supplier: trim(row.supplier) || null,
  }));
}

async function loadProposalIntegrity(proposalId: string): Promise<IntegrityRow[]> {
  const rpc = await admin.rpc(
    "proposal_request_item_integrity_v1" as never,
    {
      p_proposal_id: proposalId,
    } as never,
  );
  if (rpc.error) throw rpc.error;
  return (rpc.data ?? []) as IntegrityRow[];
}

async function runSubmit(proposalId: string): Promise<RpcOutcome> {
  const rpc = await admin.rpc(
    "proposal_submit_text_v1" as never,
    {
      p_proposal_id_text: proposalId,
    } as never,
  );
  if (!rpc.error) return { ok: true };
  const degraded = toProposalRequestItemIntegrityDegradedError(rpc.error);
  if (degraded) {
    return {
      ok: false,
      message: degraded.message,
      degraded: true,
      summary: degraded.summary,
    };
  }
  return {
    ok: false,
    message: trim(rpc.error.message) || "proposal_submit_text_v1_failed",
    degraded: false,
  };
}

async function runApprove(proposalId: string): Promise<RpcOutcome> {
  const rpc = await admin.rpc(
    "director_approve_min_auto_v1" as never,
    {
      p_proposal_id: proposalId,
      p_comment: "tz17 verify",
    } as never,
  );
  if (!rpc.error) return { ok: true };
  const degraded = toProposalRequestItemIntegrityDegradedError(rpc.error);
  if (degraded) {
    return {
      ok: false,
      message: degraded.message,
      degraded: true,
      summary: degraded.summary,
    };
  }
  return {
    ok: false,
    message: trim(rpc.error.message) || "director_approve_min_auto_v1_failed",
    degraded: false,
  };
}

async function loadProposalStatus(proposalId: string) {
  const result = await admin
    .from("proposals")
    .select("id, status, submitted_at")
    .eq("id", proposalId)
    .single<{ id: string; status: string | null; submitted_at: string | null }>();
  if (result.error) throw result.error;
  return {
    id: trim(result.data.id),
    rawStatus: trim(result.data.status) || null,
    normalizedStatus: normalizeProposalStatus(result.data.status),
    submittedAt: trim(result.data.submitted_at) || null,
  };
}

async function cleanupSeedBundle(bundle: SeedBundle | null) {
  if (!bundle) return;
  try {
    await admin.from("proposal_payments").delete().eq("proposal_id", bundle.proposalId);
  } catch {}
  try {
    await admin.from("proposal_items").delete().eq("proposal_id", bundle.proposalId);
  } catch {}
  try {
    await admin.from("proposals").delete().eq("id", bundle.proposalId);
  } catch {}
  try {
    await admin.from("request_items").delete().eq("id", bundle.requestItemId);
  } catch {}
  try {
    await admin.from("requests").delete().eq("id", bundle.requestId);
  } catch {}
}

async function main() {
  let activeBundle: SeedBundle | null = null;
  let cancelledBundle: SeedBundle | null = null;
    let missingBundle: SeedBundle | null = null;

  try {
    activeBundle = await createSeedBundle("active");
    const activeIntegrity = await loadProposalIntegrity(activeBundle.proposalId);
    const activeSubmit = await runSubmit(activeBundle.proposalId);
    const activeProposal = await loadProposalStatus(activeBundle.proposalId);

    cancelledBundle = await createSeedBundle("cancelled");
    const cancelledAt = new Date().toISOString();
    const cancelledUpdate = await admin
      .from("request_items")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
      })
      .eq("id", cancelledBundle.requestItemId);
    if (cancelledUpdate.error) throw cancelledUpdate.error;
    const cancelledIntegrity = await loadProposalIntegrity(cancelledBundle.proposalId);
    const cancelledRows = await loadProposalRows(cancelledBundle.proposalId);
    const cancelledClassified = await classifyProposalItemsByRequestItemIntegrity(
      admin,
      cancelledRows,
      {
        screen: "buyer",
        surface: "proposal_items_verify",
        sourceKind: "table:proposal_items",
        proposalId: cancelledBundle.proposalId,
      },
    );
    const cancelledSubmit = await runSubmit(cancelledBundle.proposalId);
    const cancelledApprove = await runApprove(cancelledBundle.proposalId);

    missingBundle = await createSeedBundle("missing");
    const missingDelete = await admin
      .from("request_items")
      .delete()
      .eq("id", missingBundle.requestItemId);
    const deleteBlockedByFk =
      trim(missingDelete.error?.code) === "23503" &&
      trim(missingDelete.error?.message).toLowerCase().includes("foreign key");
    const missingIntegrity = await loadProposalIntegrity(missingBundle.proposalId);
    const missingRows = await loadProposalRows(missingBundle.proposalId);
    const missingClassified = await classifyProposalItemsByRequestItemIntegrity(
      admin,
      missingRows,
      {
        screen: "director",
        surface: "proposal_items_verify",
        sourceKind: "table:proposal_items",
        proposalId: missingBundle.proposalId,
      },
    );

    const sourceChecksPassed = Object.values(sourceChecks).every(Boolean);
    const activePathOk =
      activeIntegrity.length === 1 &&
      trim(activeIntegrity[0]?.integrity_state) === "active" &&
      activeSubmit.ok === true &&
      activeProposal.normalizedStatus === "submitted" &&
      !!activeProposal.submittedAt;

    const cancelledPathOk =
      cancelledIntegrity.length === 1 &&
      trim(cancelledIntegrity[0]?.integrity_state) === "source_cancelled" &&
      cancelledClassified.rows.length === cancelledRows.length &&
      cancelledClassified.degradedRequestItemIds.includes(cancelledBundle.requestItemId) &&
      cancelledClassified.cancelledRequestItemIds.includes(cancelledBundle.requestItemId) &&
      !cancelledClassified.missingRequestItemIds.length &&
      cancelledSubmit.ok === false &&
      cancelledSubmit.degraded === true &&
      cancelledSubmit.summary.cancelledItems === 1 &&
      cancelledApprove.ok === false &&
      cancelledApprove.degraded === true &&
      getProposalIntegritySummaryLabel(cancelledClassified.rows) != null;

    const missingContractOk =
      deleteBlockedByFk &&
      missingIntegrity.length === 1 &&
      trim(missingIntegrity[0]?.integrity_state) === "active" &&
      missingClassified.rows.length === missingRows.length &&
      !missingClassified.degradedRequestItemIds.length &&
      sourceChecks.missingSourceContractPresent;

    const recoveryNoDeadlock =
      cancelledIntegrity.length === 1 &&
      missingIntegrity.length === 1 &&
      cancelledClassified.rows.length === 1 &&
      missingClassified.rows.length === 1;

    const matrix = {
      active_request_item_path_unchanged: activePathOk,
      soft_cancel_primary_contract: sourceChecks.requestItemCancelUsesSoftUpdate,
      no_request_items_hard_delete_primary_path: sourceChecks.noRequestItemsHardDeleteInSrc,
      proposal_create_rejects_cancelled_source_items:
        sourceChecks.proposalCreateRejectsCancelledSources,
      cancelled_source_preserved_not_silently_dropped: cancelledPathOk,
      hard_delete_of_linked_request_item_blocked_by_fk: deleteBlockedByFk,
      missing_source_contract_present_for_legacy_corrupt_state:
        sourceChecks.missingSourceContractPresent,
      buyer_surface_has_degraded_truth: sourceChecks.buyerViewLoadsIntegrityRpc && sourceChecks.buyerSheetShowsDegradedState,
      director_surface_has_degraded_truth:
        sourceChecks.directorSheetShowsDegradedState && sourceChecks.directorApprovalUsesGuardedRpc,
      submit_blocked_on_degraded: cancelledSubmit.ok === false,
      approval_blocked_on_degraded: cancelledApprove.ok === false,
      no_hard_fk_like_deadlock: recoveryNoDeadlock,
    };

    const status =
      sourceChecksPassed &&
      Object.values(matrix).every(Boolean)
        ? "GREEN"
        : "NOT_GREEN";

    const brokenLinkProof = {
      status,
      activeCase: {
        proposalId: activeBundle.proposalId,
        integrity: activeIntegrity.map((row) => ({
          requestItemId: trim(row.request_item_id),
          integrityState: trim(row.integrity_state),
          integrityReason: trim(row.integrity_reason) || null,
        })),
        submit: activeSubmit,
        proposal: activeProposal,
      },
      cancelledCase: {
        proposalId: cancelledBundle.proposalId,
        requestItemId: cancelledBundle.requestItemId,
        integrity: cancelledIntegrity.map((row) => ({
          requestItemId: trim(row.request_item_id),
          integrityState: trim(row.integrity_state),
          integrityReason: trim(row.integrity_reason) || null,
          requestItemStatus: trim(row.request_item_status) || null,
          requestItemCancelledAt: trim(row.request_item_cancelled_at) || null,
        })),
        classified: {
          rowsCount: cancelledClassified.rows.length,
          degradedRequestItemIds: cancelledClassified.degradedRequestItemIds,
          cancelledRequestItemIds: cancelledClassified.cancelledRequestItemIds,
          missingRequestItemIds: cancelledClassified.missingRequestItemIds,
          summaryLabel: getProposalIntegritySummaryLabel(cancelledClassified.rows),
        },
        submit: cancelledSubmit,
        approve: cancelledApprove,
      },
      missingCase: {
        proposalId: missingBundle.proposalId,
        requestItemId: missingBundle.requestItemId,
        deleteAttempt: {
          blockedByFk: deleteBlockedByFk,
          errorCode: trim(missingDelete.error?.code) || null,
          errorMessage: trim(missingDelete.error?.message) || null,
          errorDetails: trim(missingDelete.error?.details) || null,
        },
        integrityAfterBlockedDelete: missingIntegrity.map((row) => ({
          requestItemId: trim(row.request_item_id),
          integrityState: trim(row.integrity_state),
          integrityReason: trim(row.integrity_reason) || null,
          requestItemExists: row.request_item_exists === true,
        })),
        classified: {
          rowsCount: missingClassified.rows.length,
          degradedRequestItemIds: missingClassified.degradedRequestItemIds,
          cancelledRequestItemIds: missingClassified.cancelledRequestItemIds,
          missingRequestItemIds: missingClassified.missingRequestItemIds,
          summaryLabel: getProposalIntegritySummaryLabel(missingClassified.rows),
        },
        legacyMissingContract: {
          present: sourceChecks.missingSourceContractPresent,
          classifier: "proposal_request_item_integrity_v1",
          guard: "proposal_request_item_integrity_guard_v1",
        },
      },
    };

    const degradedMatrix = {
      status,
      matrix,
      sourceChecks: {
        ...sourceChecks,
        requestItemHardDeleteMatches,
      },
      testsExpectedToCover: [
        "src/lib/api/proposals.silentCatch.test.ts",
        "src/lib/api/proposalIntegrity.test.ts",
        "src/screens/buyer/buyer.actions.test.ts",
        "src/screens/buyer/components/BuyerPropDetailsSheetBody.test.tsx",
        "src/screens/director/DirectorProposalContainer.test.tsx",
        "src/screens/director/DirectorProposalSheet.test.tsx",
      ],
    };

    const summary = {
      status,
      contract: {
        requestItemLifecycle: "soft_cancel_primary",
        degradedSubmitRule:
          "proposal_request_item_integrity_guard_v1 rejects cancelled or missing source items",
        degradedApprovalRule:
          "director_approve_min_auto_v1 rejects cancelled or missing source items",
        readTruth:
          "proposal_request_item_integrity_v1 classifies active/source_cancelled/source_missing without dropping proposal rows",
      },
      sourceChecksPassed,
      activePathOk,
      cancelledPathOk,
      missingContractOk,
      recoveryNoDeadlock,
    };

    writeJson("artifacts/request-items-soft-delete-summary.json", summary);
    writeJson(
      "artifacts/proposal-broken-link-recovery-proof.json",
      brokenLinkProof,
    );
    writeJson(
      "artifacts/proposal-integrity-degraded-matrix.json",
      degradedMatrix,
    );

    if (status !== "GREEN") {
      throw new Error("request_items_soft_delete_verify_not_green");
    }

    console.log(
      JSON.stringify(
        {
          status,
          activePathOk,
          cancelledPathOk,
          missingContractOk,
          sourceChecksPassed,
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanupSeedBundle(activeBundle);
    await cleanupSeedBundle(cancelledBundle);
    await cleanupSeedBundle(missingBundle);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
