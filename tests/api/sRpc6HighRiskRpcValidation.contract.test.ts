import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  RpcValidationError,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";
import { isBuyerInboxScopeRpcResponse } from "../../src/lib/api/buyer";
import { isProposalRequestItemIntegrityRpcResponse } from "../../src/lib/api/proposalIntegrity";
import {
  isContractorFactScopeRpcResponse,
  isContractorInboxScopeRpcResponse,
} from "../../src/lib/api/contractor.scope.service";
import { isWarehouseStockScopeRpcResponse } from "../../src/screens/warehouse/warehouse.stockReports.service";
import { isBuyerSummaryBucketsScopeResponse } from "../../src/screens/buyer/buyer.fetchers.data";
import { isBuyerRequestProposalMapRpcResponse } from "../../src/screens/buyer/hooks/useBuyerRequestProposalMap";

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";

const isApprovedAiActionLedgerReadinessPatch = (file: string) =>
  file.replace(/\\/g, "/") === aiActionLedgerReadinessMigration;

const expectInvalid = (
  value: unknown,
  validator: (candidate: unknown) => boolean,
  rpcName: string,
) => {
  expect(() =>
    validateRpcResponse(value, validator as never, {
      rpcName,
      caller: "tests/api/sRpc6HighRiskRpcValidation.contract.test",
      domain: "unknown",
    }),
  ).toThrow(RpcValidationError);
};

const contractorInboxRow = {
  workItemId: "work-item-1",
  progressId: null,
  publicationState: "ready",
  identity: {
    contractorId: "contractor-1",
    contractorName: "Contractor",
    contractorInn: null,
    contractNumber: null,
    contractDate: null,
  },
  origin: {
    sourceKind: "foreman_subcontract_request",
    sourceRequestId: "request-1",
    sourceProposalId: null,
    sourceSubcontractId: "subcontract-1",
    directorApprovedAt: "2026-04-30T00:00:00.000Z",
  },
  work: {
    workItemId: "work-item-1",
    workName: "Work",
    workNameSource: "snapshot",
    quantity: 1,
    uom: "pcs",
    unitPrice: 10,
    totalAmount: 10,
    isMaterial: false,
  },
  location: {
    objectId: "object-1",
    objectName: "Object",
    systemName: null,
    zoneName: null,
    floorName: null,
    locationDisplay: "Object",
  },
  diagnostics: {
    sourceVersion: "v1",
    currentWorkState: "ready_current",
    contractorNameSource: "canonical_view",
    objectNameSource: "canonical_view",
    eligibility: {
      isApprovedWork: true,
      isCurrentVisibleWork: true,
      isLegacyHistoricalRow: false,
      hasHumanTitle: true,
      hasCurrentObjectContext: true,
    },
  },
};

const selectedCallSites = [
  {
    file: "src/screens/warehouse/warehouse.stockReports.service.ts",
    rpcName: "warehouse_stock_scope_v2",
    guard: "isWarehouseStockScopeRpcResponse",
  },
  {
    file: "src/lib/api/contractor.scope.service.ts",
    rpcName: "contractor_inbox_scope_v1",
    guard: "isContractorInboxScopeRpcResponse",
  },
  {
    file: "src/lib/api/contractor.scope.service.ts",
    rpcName: "contractor_fact_scope_v1",
    guard: "isContractorFactScopeRpcResponse",
  },
  {
    file: "src/screens/buyer/buyer.fetchers.ts",
    rpcName: "buyer_summary_buckets_scope_v1",
    guard: "isBuyerSummaryBucketsScopeResponse",
  },
  {
    file: "src/lib/api/buyer.ts",
    rpcName: "buyer_summary_inbox_scope_v1",
    guard: "isBuyerInboxScopeRpcResponse",
  },
  {
    file: "src/screens/buyer/hooks/useBuyerRequestProposalMap.ts",
    rpcName: "resolve_req_pr_map",
    guard: "isBuyerRequestProposalMapRpcResponse",
  },
  {
    file: "src/lib/api/integrity.guards.ts",
    rpcName: "proposal_request_item_integrity_v1",
    guard: "isProposalRequestItemIntegrityRpcResponse",
  },
  {
    file: "src/screens/buyer/buyer.repo.ts",
    rpcName: "proposal_request_item_integrity_v1",
    guard: "isProposalRequestItemIntegrityRpcResponse",
  },
];

describe("S-RPC-6 high-risk RPC validation", () => {
  it("guards the selected new high-risk call-sites without reopening S-RPC-1..5", () => {
    for (const callSite of selectedCallSites) {
      const source = read(callSite.file);
      expect(source).toContain("validateRpcResponse");
      expect(source).toContain(callSite.rpcName);
      expect(source).toContain(callSite.guard);
    }

    const previous = [
      "artifacts/S_RPC_1_runtime_validation_matrix.json",
      "artifacts/S_RPC_2_runtime_validation_matrix.json",
      "artifacts/S_RPC_3_runtime_validation_matrix.json",
      "artifacts/S_RPC_4_runtime_validation_matrix.json",
      "artifacts/S_RPC_5_runtime_validation_matrix.json",
    ].map((file) => JSON.parse(read(file)));

    expect(previous[0].selectedRpcCount).toBe(5);
    expect(previous[1].validatedRpcCallsites).toBe(10);
    expect(previous[2].validatedRpcCallsites).toBe(18);
    expect(previous[3].result.validatedCallSites).toBe(15);
    expect(previous[4].result.validatedCallSites).toBe(15);
  });

  it("accepts valid read/list envelopes and fails closed on malformed payloads", () => {
    expect(
      isWarehouseStockScopeRpcResponse({
        document_type: "warehouse_stock_scope",
        version: "v2",
        rows: [{ material_id: "mat-1", code: "A-1", qty_on_hand: 1 }],
        meta: { row_count: 1, has_more: false },
      }),
    ).toBe(true);
    expect(
      isContractorInboxScopeRpcResponse({
        document_type: "contractor_inbox_scope",
        version: "v1",
        rows: [contractorInboxRow],
        meta: {
          rowsSource: "rpc_scope_v1",
          candidateView: "v_contractor_publication_candidates_v1",
        },
      }),
    ).toBe(true);
    expect(
      isContractorFactScopeRpcResponse({
        document_type: "contractor_fact_scope",
        version: "v1",
        row: contractorInboxRow,
        warehouseIssuesPanel: {
          status: "empty",
          messageCode: "not_found",
          linkedRequestCards: [],
        },
        meta: {},
      }),
    ).toBe(true);
    expect(
      isBuyerSummaryBucketsScopeResponse({
        document_type: "buyer_summary_buckets_scope_v1",
        version: "1",
        pending: [{ id: "proposal-1", status: "pending" }],
        approved: [],
        rejected: [],
        meta: {
          pending_count: 1,
          approved_count: 0,
          rejected_count: 0,
        },
      }),
    ).toBe(true);
    expect(
      isBuyerSummaryBucketsScopeResponse({
        document_type: "buyer_summary_buckets_scope",
        version: "v1",
        pending: [],
        approved: [],
        rejected: [],
        meta: {
          pending_count: 0,
          approved_count: 0,
          rejected_count: 0,
        },
      }),
    ).toBe(true);
    expect(
      isBuyerInboxScopeRpcResponse({
        document_type: "buyer_summary_inbox_scope_v1",
        version: "1",
        rows: [{ request_id: "req-1", request_item_id: "item-1" }],
        meta: {
          total_group_count: 1,
          returned_group_count: 1,
          has_more: false,
        },
      }),
    ).toBe(true);
    expect(
      isBuyerRequestProposalMapRpcResponse([
        { request_id: "req-1", proposal_no: "PR-1" },
      ]),
    ).toBe(true);
    expect(
      isProposalRequestItemIntegrityRpcResponse([
        {
          proposal_id: "proposal-1",
          proposal_item_id: 1,
          request_item_id: "item-1",
          integrity_state: "active",
          integrity_reason: null,
          request_item_exists: true,
        },
      ]),
    ).toBe(true);

    expectInvalid(
      { rows: [] },
      isWarehouseStockScopeRpcResponse,
      "warehouse_stock_scope_v2",
    );
    expectInvalid(
      { document_type: "contractor_inbox_scope", rows: [] },
      isContractorInboxScopeRpcResponse,
      "contractor_inbox_scope_v1",
    );
    expectInvalid(
      { document_type: "contractor_fact_scope", row: contractorInboxRow },
      isContractorFactScopeRpcResponse,
      "contractor_fact_scope_v1",
    );
    expectInvalid(
      { document_type: "buyer_summary_buckets_scope_v1", pending: [] },
      isBuyerSummaryBucketsScopeResponse,
      "buyer_summary_buckets_scope_v1",
    );
    expectInvalid(
      { rows: [] },
      isBuyerInboxScopeRpcResponse,
      "buyer_summary_inbox_scope_v1",
    );
    expectInvalid(
      { rows: [] },
      isBuyerRequestProposalMapRpcResponse,
      "resolve_req_pr_map",
    );
    expectInvalid(
      [{ integrity_state: "unexpected" }],
      isProposalRequestItemIntegrityRpcResponse,
      "proposal_request_item_integrity_v1",
    );
  });

  it("keeps validation errors redacted and forbidden surfaces untouched", () => {
    const rawPayload = {
      token: "secret-token-should-not-leak",
      email: "private@example.test",
      rows: {},
    };

    try {
      validateRpcResponse(rawPayload, isWarehouseStockScopeRpcResponse, {
        rpcName: "warehouse_stock_scope_v2",
        caller: "tests/api/sRpc6HighRiskRpcValidation.contract.test",
        domain: "warehouse",
      });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("warehouse_stock_scope_v2");
      expect(message).not.toContain("secret-token-should-not-leak");
      expect(message).not.toContain("private@example.test");
    }

    const changedSource = selectedCallSites
      .map((callSite) => read(callSite.file))
      .join("\n");
    expect(changedSource).not.toMatch(/payload:\s*(data|rpc\.data|rawPayload)/);
    expect(changedSource).not.toMatch(
      /console\.(log|warn|error)\([^)]*rpc\.data/,
    );

    const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => !isApprovedAiActionLedgerReadinessPatch(file));

    expect(changedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^(supabase\/migrations|android\/|ios\/|maestro\/)/,
        ),
      ]),
    );
  });

  it("keeps S-RPC-6 artifacts valid", () => {
    expect(
      existsSync(
        join(root, "artifacts/S_RPC_6_high_risk_rpc_validation_matrix.json"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(root, "artifacts/S_RPC_6_high_risk_rpc_validation_proof.md"),
      ),
    ).toBe(true);

    const matrix = JSON.parse(
      read("artifacts/S_RPC_6_high_risk_rpc_validation_matrix.json"),
    );
    expect(matrix.status).toBe("GREEN_RPC_VALIDATION_EXTENDED");
    expect(matrix.result.validatedRpcNames).toBeGreaterThanOrEqual(5);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.pdfReportExportSemanticsChanged).toBe(false);
    expect(matrix.safety.rawPayloadLogged).toBe(false);
  });
});
