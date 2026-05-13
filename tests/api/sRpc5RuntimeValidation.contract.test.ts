import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  RpcValidationError,
  isRpcVoidResponse,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";
import {
  isAccountantInboxLegacyRpcResponse,
} from "../../src/lib/api/accountant";
import {
  isDirectorInboxRpcResponse,
} from "../../src/lib/api/director";
import {
  isProposalCreateRpcResponse,
  isProposalItemsForWebRpcResponse,
  isProposalPendingRowsRpcResponse,
} from "../../src/lib/api/proposals";
import {
  isDirectorFinancePanelScopeRpcResponse,
  isDirectorFinancePanelScopeV2RpcResponse,
  isDirectorFinancePanelScopeV3RpcResponse,
  isDirectorFinancePanelScopeV4RpcResponse,
  isDirectorFinanceSummaryRpcResponse,
  isDirectorFinanceSummaryV2RpcResponse,
  isDirectorFinanceSupplierScopeRpcResponse,
} from "../../src/screens/director/director.finance.rpc";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";
const aiActionLedgerApplyMigration =
  "supabase/migrations/20260513230000_ai_action_ledger_apply.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [sLoadFix6WarehouseIssueExplainPatch, aiActionLedgerReadinessMigration, aiActionLedgerApplyMigration].includes(
    file.replace(/\\/g, "/"),
  );

const expectInvalid = (
  value: unknown,
  validator: (candidate: unknown) => boolean,
  rpcName: string,
) => {
  expect(() =>
    validateRpcResponse(value, validator as never, {
      rpcName,
      caller: "tests/api/sRpc5RuntimeValidation.contract.test",
      domain: "unknown",
    }),
  ).toThrow(RpcValidationError);
};

const selectedCallSites = [
  {
    file: "src/screens/director/director.finance.rpc.ts",
    rpcNames: [
      "director_finance_fetch_summary_v1",
      "director_finance_summary_v2",
      "director_finance_panel_scope_v1",
      "director_finance_panel_scope_v2",
      "director_finance_panel_scope_v3",
      "director_finance_panel_scope_v4",
      "director_finance_supplier_scope_v1",
      "director_finance_supplier_scope_v2",
    ],
  },
  {
    file: "src/lib/api/proposals.ts",
    rpcNames: [
      "proposal_create",
      "proposal_items_for_web",
      "list_director_proposals_pending",
    ],
  },
  {
    file: "src/lib/api/director.ts",
    rpcNames: ["director_return_min_auto", "list_director_inbox"],
  },
  {
    file: "src/lib/api/accountant.ts",
    rpcNames: ["list_accountant_inbox_fact", "list_accountant_inbox"],
  },
];

describe("S-RPC-5 runtime validation contract", () => {
  it("guards the selected S-RPC-5 call-sites with validateRpcResponse", () => {
    for (const callSite of selectedCallSites) {
      const source = read(callSite.file);
      expect(source).toContain("validateRpcResponse");
      for (const rpcName of callSite.rpcNames) {
        expect(source).toContain(rpcName);
      }
    }

    expect(read("src/screens/director/director.finance.rpc.ts")).toContain(
      "isDirectorFinancePanelScopeV4RpcResponse",
    );
    expect(read("src/lib/api/proposals.ts")).toContain("isProposalCreateRpcResponse");
    expect(read("src/lib/api/director.ts")).toContain("isDirectorInboxRpcResponse");
    expect(read("src/lib/api/accountant.ts")).toContain("isAccountantInboxLegacyRpcResponse");
  });

  it("allows known director finance shapes and fails closed on malformed finance payloads", () => {
    const summaryV1 = {
      summary: {},
      report: { suppliers: [] },
    };
    const summaryV2 = {
      total_amount: 0,
      total_paid: 0,
      total_debt: 0,
      overdue_amount: 0,
      by_supplier: [],
    };
    const panelV1 = {
      ...summaryV1,
      spend: {},
    };
    const panelV2 = {
      ...panelV1,
      rows: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    };
    const panelV3 = {
      ...panelV2,
      summary_v3: {},
      supplier_rows: [],
    };
    const panelV4 = {
      document_type: "director_finance_panel_scope",
      version: "v4",
      canonical: {
        summary: {},
        suppliers: [],
        objects: [],
        spend: {},
      },
      rows: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    };

    expect(isDirectorFinanceSummaryRpcResponse(summaryV1)).toBe(true);
    expect(isDirectorFinanceSummaryV2RpcResponse(summaryV2)).toBe(true);
    expect(isDirectorFinancePanelScopeRpcResponse(panelV1)).toBe(true);
    expect(isDirectorFinancePanelScopeV2RpcResponse(panelV2)).toBe(true);
    expect(isDirectorFinancePanelScopeV3RpcResponse(panelV3)).toBe(true);
    expect(isDirectorFinancePanelScopeV4RpcResponse(panelV4)).toBe(true);
    expect(isDirectorFinanceSupplierScopeRpcResponse({ supplier: "ACME", invoices: [] })).toBe(true);
    expect(isDirectorFinanceSupplierScopeRpcResponse({ supplierName: "ACME", summary: {}, invoices: [] })).toBe(true);

    const rawPayload = {
      token: "secret-token-should-not-leak",
      email: "private@example.test",
      rows: {},
    };

    try {
      validateRpcResponse(rawPayload, isDirectorFinancePanelScopeV4RpcResponse, {
        rpcName: "director_finance_panel_scope_v4",
        caller: "tests/api/sRpc5RuntimeValidation.contract.test",
        domain: "director",
      });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("director_finance_panel_scope_v4");
      expect(message).not.toContain("secret-token-should-not-leak");
      expect(message).not.toContain("private@example.test");
    }
  });

  it("validates proposal, director, and accountant legacy shapes without changing empty-list behavior", () => {
    expect(isProposalCreateRpcResponse("proposal-1")).toBe(true);
    expect(isProposalCreateRpcResponse({ id: 12 })).toBe(true);
    expect(isProposalItemsForWebRpcResponse(null)).toBe(true);
    expect(isProposalItemsForWebRpcResponse([{ id: 1, name_human: "Cement", total_qty: 2 }])).toBe(true);
    expect(isProposalPendingRowsRpcResponse([])).toBe(true);
    expect(isProposalPendingRowsRpcResponse([{ id: "p-1", submitted_at: null }])).toBe(true);
    expect(isDirectorInboxRpcResponse(null)).toBe(true);
    expect(isDirectorInboxRpcResponse([{ id: "p-1", kind: "proposal" }])).toBe(true);
    expect(isAccountantInboxLegacyRpcResponse(null)).toBe(true);
    expect(isAccountantInboxLegacyRpcResponse([{ id: "p-1" }])).toBe(true);
    expect(isRpcVoidResponse(undefined)).toBe(true);

    expectInvalid({}, isProposalCreateRpcResponse, "proposal_create");
    expectInvalid(["bad-row"], isProposalItemsForWebRpcResponse, "proposal_items_for_web");
    expectInvalid([{ submitted_at: "2026-01-01" }], isProposalPendingRowsRpcResponse, "list_director_proposals_pending");
    expectInvalid({ rows: [] }, isDirectorInboxRpcResponse, "list_director_inbox");
    expectInvalid({ rows: [] }, isAccountantInboxLegacyRpcResponse, "list_accountant_inbox_fact");
    expectInvalid({ ok: true }, isRpcVoidResponse, "director_return_min_auto");
  });

  it("keeps previous S-RPC waves closed and leaves report/PDF/export-adjacent RPCs untouched", () => {
    const previousProofs = [
      "artifacts/S_RPC_1_runtime_validation_matrix.json",
      "artifacts/S_RPC_2_runtime_validation_matrix.json",
      "artifacts/S_RPC_3_runtime_validation_matrix.json",
      "artifacts/S_RPC_4_runtime_validation_matrix.json",
    ].map((file) => JSON.parse(read(file)));

    expect(previousProofs[0].selectedRpcCount).toBe(5);
    expect(previousProofs[1].validatedRpcCallsites).toBe(10);
    expect(previousProofs[2].validatedRpcCallsites).toBe(18);
    expect(previousProofs[3].result.validatedCallSites).toBe(15);

    const changedSource = selectedCallSites.map((callSite) => read(callSite.file)).join("\n");
    expect(changedSource).not.toMatch(/payload:\s*(data|rpc\.data|rawPayload)/);
    expect(changedSource).not.toMatch(/console\.(log|warn|error)\([^)]*rpc\.data/);

    expect(read("src/lib/api/directorPdfSource.service.ts")).not.toContain("S_RPC_5");
    expect(read("src/screens/warehouse/warehouse.api.repo.ts")).not.toContain("S_RPC_5");
  });

  it("keeps S-RPC-5 proof files and forbidden surfaces clean", () => {
    expect(existsSync(join(root, "artifacts/S_RPC_5_runtime_validation_matrix.json"))).toBe(true);
    expect(existsSync(join(root, "artifacts/S_RPC_5_runtime_validation_proof.md"))).toBe(true);

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
});
