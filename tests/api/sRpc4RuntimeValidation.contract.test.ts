import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  RpcValidationError,
  isRpcNonEmptyStringResponse,
  isRpcNullableNonEmptyStringResponse,
  isRpcRecordArray,
  isRpcVoidResponse,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [sLoadFix6WarehouseIssueExplainPatch, aiActionLedgerReadinessMigration].includes(
    file.replace(/\\/g, "/"),
  );

const selectedCallSites = [
  {
    file: "src/screens/subcontracts/subcontracts.shared.ts",
    rpcNames: [
      "subcontract_create_v1",
      "subcontract_create_draft",
      "subcontract_approve_v1",
      "subcontract_reject_v1",
    ],
  },
  {
    file: "src/lib/api/requests.ts",
    rpcNames: [
      "request_find_reusable_empty_draft_v1",
      "request_items_by_request",
      "request_item_add_or_inc",
      "request_submit_atomic_v1",
      "request_reopen_atomic_v1",
    ],
  },
  {
    file: "src/lib/api/proposalAttachmentEvidence.api.ts",
    rpcNames: ["proposal_attachment_evidence_attach_v1"],
  },
  {
    file: "src/lib/api/proposalAttachments.service.ts",
    rpcNames: ["proposal_attachment_evidence_scope_v1"],
  },
  {
    file: "src/lib/store_supabase.ts",
    rpcNames: ["send_request_to_director", "approve_or_decline_request_pending"],
  },
  {
    file: "src/screens/accountant/accountant.return.service.ts",
    rpcNames: ["acc_return_min_auto", "proposal_return_to_buyer_min"],
  },
];

describe("S-RPC-4 runtime validation contract", () => {
  it("guards every selected S-RPC-4 call-site with validateRpcResponse", () => {
    for (const callSite of selectedCallSites) {
      const source = read(callSite.file);
      expect(source).toContain("validateRpcResponse");
      for (const rpcName of callSite.rpcNames) {
        expect(source).toContain(rpcName);
      }
    }

    expect(read("src/lib/api/requests.ts")).toContain("isRequestSubmitAtomicRpcResponse");
    expect(read("src/lib/api/requests.ts")).toContain("isRequestReopenAtomicRpcResponse");
    expect(read("src/screens/subcontracts/subcontracts.shared.ts")).toContain("isSubcontractCreateRpcResponse");
    expect(read("src/lib/store_supabase.ts")).toContain("isSendRequestToDirectorRpcResponse");
    expect(read("src/lib/store_supabase.ts")).toContain("isApproveOrDeclinePendingRpcResponse");
  });

  it("fails closed on invalid shapes while allowing valid S-RPC-4 primitives", () => {
    expect(
      validateRpcResponse("request-1", isRpcNonEmptyStringResponse, {
        rpcName: "request_item_add_or_inc",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "proposal",
      }),
    ).toBe("request-1");

    expect(
      validateRpcResponse(null, isRpcNullableNonEmptyStringResponse, {
        rpcName: "request_find_reusable_empty_draft_v1",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "proposal",
      }),
    ).toBeNull();

    expect(
      validateRpcResponse(undefined, isRpcVoidResponse, {
        rpcName: "acc_return_min_auto",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "accountant",
      }),
    ).toBeUndefined();

    expect(
      validateRpcResponse([{ attachment_id: "att-1" }], isRpcRecordArray, {
        rpcName: "proposal_attachment_evidence_scope_v1",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "proposal",
      }),
    ).toEqual([{ attachment_id: "att-1" }]);

    const rawPayload = {
      token: "secret-token-should-not-leak",
      email: "private@example.test",
    };

    expect(() =>
      validateRpcResponse(rawPayload, isRpcNonEmptyStringResponse, {
        rpcName: "request_item_add_or_inc",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "proposal",
      }),
    ).toThrow(RpcValidationError);

    try {
      validateRpcResponse(rawPayload, isRpcNonEmptyStringResponse, {
        rpcName: "request_item_add_or_inc",
        caller: "sRpc4RuntimeValidation.contract",
        domain: "proposal",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("request_item_add_or_inc");
      expect(message).not.toContain("secret-token-should-not-leak");
      expect(message).not.toContain("private@example.test");
    }
  });

  it("keeps S-RPC-1, S-RPC-2, and S-RPC-3 call-sites closed", () => {
    const previousProofs = [
      "artifacts/S_RPC_1_runtime_validation_matrix.json",
      "artifacts/S_RPC_2_runtime_validation_matrix.json",
      "artifacts/S_RPC_3_runtime_validation_matrix.json",
    ].map((file) => JSON.parse(read(file)));

    expect(previousProofs[0].selectedRpcCount).toBe(5);
    expect(previousProofs[1].validatedRpcCallsites).toBe(10);
    expect(previousProofs[2].validatedRpcCallsites).toBe(18);

    expect(read("src/screens/warehouse/hooks/useWarehouseReceiveApply.ts")).toContain("validateRpcResponse");
    expect(read("src/screens/warehouse/warehouse.issue.repo.ts")).toContain("validateRpcResponse");
    expect(read("src/lib/infra/jobQueue.ts")).toContain("validateRpcResponse");
  });

  it("does not add raw payload logging or forbidden file changes", () => {
    const changedSource = selectedCallSites.map((callSite) => read(callSite.file)).join("\n");
    expect(changedSource).not.toMatch(/payload:\s*(data|rpc\.data|rawPayload)/);
    expect(changedSource).not.toMatch(/console\.(log|warn|error)\([^)]*rpc\.data/);

    const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => !isApprovedSLoadFix6WarehouseIssuePatch(file));

    expect(changedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(supabase\/migrations|android\/|ios\/|maestro\/)/),
      ]),
    );
    expect(changedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
      ]),
    );
  });

  it("keeps S-RPC-4 artifacts valid JSON", () => {
    const matrixPath = "artifacts/S_RPC_4_runtime_validation_matrix.json";
    expect(existsSync(join(root, matrixPath))).toBe(true);
    const matrix = JSON.parse(read(matrixPath));

    expect(matrix.wave).toBe("S-RPC-4");
    expect(matrix.result.validatedCallSites).toBe(15);
    expect(matrix.safety.sqlRpcImplementationChanged).toBe(false);
    expect(matrix.safety.rawPayloadLogged).toBe(false);
    expect(matrix.safety.playMarketTouched).toBe(false);
  });
});
