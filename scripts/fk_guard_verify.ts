import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";
import {
  ensureProposalExists,
  ensureProposalRequestItemsIntegrity,
  ensureRequestExists,
  ensureRequestItemsBelongToRequest,
  filterProposalItemsByExistingRequestLinks,
  IntegrityGuardError,
} from "../src/lib/api/integrity.guards";
import { REQUEST_DRAFT_STATUS } from "../src/lib/api/requests.status";
import { createTempUser, cleanupTempUser, createVerifierAdmin, type RuntimeTestUser } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const admin = createVerifierAdmin("fk-guard-verify");

const writeJson = (relativePath: string, payload: unknown) => {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const trim = (value: unknown) => String(value ?? "").trim();

type RequestSeedRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id">;
type RequestItemSeedRow = Pick<Database["public"]["Tables"]["request_items"]["Row"], "id" | "request_id">;
type ProposalSeedRow = Pick<Database["public"]["Tables"]["proposals"]["Row"], "id" | "request_id">;

const missingRequestId = "00000000-0000-0000-0000-000000000001";
const missingProposalId = "00000000-0000-0000-0000-000000000002";
const missingRequestItemId = "00000000-0000-0000-0000-000000000003";

async function insertRequest(userId: string, marker: string): Promise<RequestSeedRow> {
  const payload: Database["public"]["Tables"]["requests"]["Insert"] = {
    created_by: userId,
    status: REQUEST_DRAFT_STATUS,
    comment: marker,
  };
  const result = await admin.from("requests").insert(payload).select("id").single<RequestSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertRequestItem(requestId: string, marker: string): Promise<RequestItemSeedRow> {
  const payload: Database["public"]["Tables"]["request_items"]["Insert"] = {
    request_id: requestId,
    rik_code: `FK-GUARD-${Date.now().toString(36)}`,
    name_human: marker,
    qty: 1,
    uom: "pcs",
    status: REQUEST_DRAFT_STATUS,
  };
  const result = await admin
    .from("request_items")
    .insert(payload)
    .select("id, request_id")
    .single<RequestItemSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function insertProposal(requestId: string, userId: string, marker: string): Promise<ProposalSeedRow> {
  const payload: Database["public"]["Tables"]["proposals"]["Insert"] = {
    request_id: requestId,
    created_by: userId,
    status: "Черновик",
    supplier: marker,
  };
  const result = await admin
    .from("proposals")
    .insert(payload)
    .select("id, request_id")
    .single<ProposalSeedRow>();
  if (result.error) throw result.error;
  return result.data;
}

async function cleanupBusinessRows(userId: string, marker: string) {
  const proposals = await admin
    .from("proposals")
    .select("id")
    .eq("created_by", userId)
    .like("supplier", `${marker}%`);
  if (proposals.error) throw proposals.error;
  const proposalIds = (proposals.data ?? []).map((row) => trim((row as { id?: unknown }).id)).filter(Boolean);
  if (proposalIds.length) {
    const deleteProposalItems = await admin.from("proposal_items").delete().in("proposal_id", proposalIds);
    if (deleteProposalItems.error) throw deleteProposalItems.error;
    const deleteProposals = await admin.from("proposals").delete().in("id", proposalIds);
    if (deleteProposals.error) throw deleteProposals.error;
  }

  const requests = await admin
    .from("requests")
    .select("id")
    .eq("created_by", userId)
    .like("comment", `${marker}%`);
  if (requests.error) throw requests.error;
  const requestIds = (requests.data ?? []).map((row) => trim((row as { id?: unknown }).id)).filter(Boolean);
  if (requestIds.length) {
    const deleteRequestItems = await admin.from("request_items").delete().in("request_id", requestIds);
    if (deleteRequestItems.error) throw deleteRequestItems.error;
    const deleteRequests = await admin.from("requests").delete().in("id", requestIds);
    if (deleteRequests.error) throw deleteRequests.error;
  }
}

const codeOf = (error: unknown) => (error instanceof IntegrityGuardError ? error.code : null);

async function main() {
  let user: RuntimeTestUser | null = null;
  const marker = `[fk-guard:${Date.now().toString(36)}]`;

  try {
    user = await createTempUser(admin, {
      role: "buyer",
      fullName: "FK Guard Verify",
      emailPrefix: "fk-guard",
      userProfile: {
        usage_market: true,
      },
    });

    const requestA = await insertRequest(user.id, `${marker}:request-a`);
    const requestB = await insertRequest(user.id, `${marker}:request-b`);
    const requestItemA = await insertRequestItem(trim(requestA.id), `${marker}:item-a`);
    const requestItemB = await insertRequestItem(trim(requestB.id), `${marker}:item-b`);
    const proposalA = await insertProposal(trim(requestA.id), user.id, `${marker}:proposal-a`);

    const requestExistsResult = await ensureRequestExists(admin, trim(requestA.id), {
      screen: "request",
      surface: "fk_guard_verify_request",
      sourceKind: "verify:request",
    });
    const proposalExistsResult = await ensureProposalExists(admin, trim(proposalA.id), {
      screen: "buyer",
      surface: "fk_guard_verify_proposal",
      sourceKind: "verify:proposal",
    });

    let missingRequestCode: string | null = null;
    try {
      await ensureRequestExists(admin, missingRequestId, {
        screen: "request",
        surface: "fk_guard_verify_request_missing",
        sourceKind: "verify:request",
      });
    } catch (error) {
      missingRequestCode = codeOf(error);
    }

    let missingProposalCode: string | null = null;
    try {
      await ensureProposalExists(admin, missingProposalId, {
        screen: "buyer",
        surface: "fk_guard_verify_proposal_missing",
        sourceKind: "verify:proposal",
      });
    } catch (error) {
      missingProposalCode = codeOf(error);
    }

    let mismatchedRequestItemsCode: string | null = null;
    try {
      await ensureRequestItemsBelongToRequest(
        admin,
        trim(requestA.id),
        [trim(requestItemB.id)],
        {
          screen: "warehouse",
          surface: "fk_guard_verify_request_items_mismatch",
          sourceKind: "verify:warehouse_issue",
        },
      );
    } catch (error) {
      mismatchedRequestItemsCode = codeOf(error);
    }

    let missingRequestItemsCode: string | null = null;
    try {
      await ensureProposalRequestItemsIntegrity(
        admin,
        trim(proposalA.id),
        [missingRequestItemId],
        {
          screen: "buyer",
          surface: "fk_guard_verify_proposal_items_missing",
          sourceKind: "verify:proposal_items",
        },
      );
    } catch (error) {
      missingRequestItemsCode = codeOf(error);
    }

    let mismatchedProposalItemsCode: string | null = null;
    try {
      await ensureProposalRequestItemsIntegrity(
        admin,
        trim(proposalA.id),
        [trim(requestItemB.id)],
        {
          screen: "buyer",
          surface: "fk_guard_verify_proposal_items_mismatch",
          sourceKind: "verify:proposal_items",
        },
      );
    } catch (error) {
      mismatchedProposalItemsCode = codeOf(error);
    }

    await ensureRequestItemsBelongToRequest(
      admin,
      trim(requestA.id),
      [trim(requestItemA.id)],
      {
        screen: "warehouse",
        surface: "fk_guard_verify_request_items_ok",
        sourceKind: "verify:warehouse_issue",
      },
    );

    await ensureProposalRequestItemsIntegrity(
      admin,
      trim(proposalA.id),
      [trim(requestItemA.id)],
      {
        screen: "buyer",
        surface: "fk_guard_verify_proposal_items_ok",
        sourceKind: "verify:proposal_items",
      },
    );

    const filteredProposalItems = await filterProposalItemsByExistingRequestLinks(
      admin,
      [
        {
          id: 1,
          request_item_id: trim(requestItemA.id),
          rik_code: "FK-VALID",
          name_human: "valid",
          uom: "pcs",
          app_code: null,
          total_qty: 1,
          price: null,
          note: null,
          supplier: null,
        },
        {
          id: 2,
          request_item_id: missingRequestItemId,
          rik_code: "FK-MISSING",
          name_human: "missing",
          uom: "pcs",
          app_code: null,
          total_qty: 1,
          price: null,
          note: null,
          supplier: null,
        },
      ],
      {
        screen: "buyer",
        surface: "fk_guard_verify_filter",
        sourceKind: "verify:proposal_items_read",
        proposalId: trim(proposalA.id),
      },
    );

    const proposalsText = fs.readFileSync(path.join(projectRoot, "src/lib/api/proposals.ts"), "utf8");
    const accountantText = fs.readFileSync(path.join(projectRoot, "src/lib/api/accountant.ts"), "utf8");
    const warehouseIssueText = fs.readFileSync(path.join(projectRoot, "src/screens/warehouse/warehouse.issue.ts"), "utf8");

    const structural = {
      proposalMutationGuardsPresent:
        proposalsText.includes("ensureProposalRequestItemsIntegrity(client, proposalIdText, requestItemIds") &&
        proposalsText.includes("surface: \"proposal_set_items_meta\""),
      proposalReadFilterPresent: proposalsText.includes("filterProposalItemsByExistingRequestLinks(client, rows"),
      accountantProposalGuardsPresent:
        accountantText.includes("surface: \"proposal_send_to_accountant\"") &&
        accountantText.includes("surface: \"add_payment\"") &&
        accountantText.includes("surface: \"return_to_buyer\""),
      warehouseRequestItemGuardsPresent:
        warehouseIssueText.includes("surface: \"issue_req_pick\"") &&
        warehouseIssueText.includes("surface: \"issue_request_item\""),
    };

    const runtime = {
      requestExistsPass: requestExistsResult === trim(requestA.id),
      proposalExistsPass:
        proposalExistsResult.proposalId === trim(proposalA.id) &&
        proposalExistsResult.requestId === trim(requestA.id),
      missingRequestRejected: missingRequestCode === "missing_request",
      missingProposalRejected: missingProposalCode === "missing_proposal",
      mismatchedRequestItemsRejected: mismatchedRequestItemsCode === "mismatched_request_items",
      missingRequestItemsRejected: missingRequestItemsCode === "missing_request_items",
      mismatchedProposalItemsRejected: mismatchedProposalItemsCode === "mismatched_request_items",
      orphanProposalRowsDropped:
        filteredProposalItems.rows.length === 1 &&
        filteredProposalItems.droppedRequestItemIds.length === 1 &&
        trim(filteredProposalItems.rows[0]?.request_item_id) === trim(requestItemA.id),
    };

    const summary = {
      status:
        Object.values(structural).every(Boolean) &&
        Object.values(runtime).every(Boolean)
          ? "GREEN"
          : "NOT GREEN",
      structural,
      runtime,
    };

    writeJson("artifacts/fk-guard-summary.json", summary);
    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "GREEN") {
      process.exitCode = 1;
    }
  } finally {
    if (user) {
      await cleanupBusinessRows(user.id, marker).catch(() => {});
    }
    await cleanupTempUser(admin, user);
  }
}

void main();
