import fs from "fs";
import path from "path";

import {
  isRpcArrayResponse,
  isRpcRecord,
  isRpcRowsEnvelope,
  RpcValidationError,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";
import { isDirectorPendingProposalsScopeResponse } from "../../src/screens/director/director.proposals.repo";
import {
  isSubmitJobsClaimRpcResponse,
  isSubmitJobsMarkCompletedRpcResponse,
  isSubmitJobsMarkFailedRpcResponse,
  isSubmitJobsMetricsRpcResponse,
  isSubmitJobsRecoverStuckRpcResponse,
} from "../../src/lib/infra/jobQueue";

const repoRoot = path.resolve(__dirname, "../..");
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const expectInvalid = (
  value: unknown,
  validator: (value: unknown) => boolean,
  rpcName: string,
) => {
  expect(() =>
    validateRpcResponse(value, validator as never, {
      rpcName,
      caller: "tests/api/rpcRuntimeValidationBatch3.contract.test",
      domain: "unknown",
    }),
  ).toThrow(RpcValidationError);
};

describe("S-RPC-3 runtime validation guards", () => {
  it("validates rows-envelope RPC responses and redacts invalid payload details", () => {
    expect(isRpcRowsEnvelope({ rows: [], meta: {} })).toBe(true);
    expect(isRpcRowsEnvelope({ rows: [{ id: "row-1" }] })).toBe(true);

    const rawPayload = {
      email: "buyer@example.com",
      token: "secret-token",
      rows: {},
    };

    try {
      validateRpcResponse(rawPayload, isRpcRowsEnvelope, {
        rpcName: "warehouse_issue_queue_scope_v4",
        caller: "tests/api/rpcRuntimeValidationBatch3.contract.test",
        domain: "warehouse",
      });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      expect(String((error as Error).message)).toContain("warehouse_issue_queue_scope_v4");
      expect(String((error as Error).message)).not.toContain("buyer@example.com");
      expect(String((error as Error).message)).not.toContain("secret-token");
    }
  });

  it("validates array and detail record RPC responses", () => {
    expect(isRpcArrayResponse([])).toBe(true);
    expect(isRpcArrayResponse([{ id: "listing-1" }])).toBe(true);
    expect(isRpcRecord({ id: "listing-1" })).toBe(true);

    expectInvalid({ rows: [] }, isRpcArrayResponse, "marketplace_items_scope_page_v1");
    expectInvalid([{ id: "listing-1" }], isRpcRecord, "marketplace_item_scope_detail_v1");
  });

  it("validates director pending proposal envelopes", () => {
    const valid = {
      document_type: "director_pending_proposals_scope",
      version: "v1",
      heads: [{ id: "proposal-1", submitted_at: null, pretty: "P-1", items_count: 2 }],
      meta: {},
    };

    expect(isDirectorPendingProposalsScopeResponse(valid)).toBe(true);
    expectInvalid(
      { ...valid, document_type: "unexpected" },
      isDirectorPendingProposalsScopeResponse,
      "director_pending_proposals_scope_v1",
    );
    expectInvalid(
      { ...valid, heads: {} },
      isDirectorPendingProposalsScopeResponse,
      "director_pending_proposals_scope_v1",
    );
  });

  it("validates job queue claim rows", () => {
    const validRows = [
      {
        id: "job-1",
        job_type: "buyer_submit_proposal",
        status: "pending",
        payload: {},
        retry_count: 0,
      },
    ];

    expect(isSubmitJobsClaimRpcResponse(validRows)).toBe(true);
    expectInvalid(
      [{ ...validRows[0], id: "" }],
      isSubmitJobsClaimRpcResponse,
      "submit_jobs_claim",
    );
    expectInvalid(
      [{ ...validRows[0], status: "unknown" }],
      isSubmitJobsClaimRpcResponse,
      "submit_jobs_claim",
    );
    expectInvalid({ rows: validRows }, isSubmitJobsClaimRpcResponse, "submit_jobs_claim");
  });

  it("validates job queue lifecycle RPC responses", () => {
    expect(isSubmitJobsRecoverStuckRpcResponse(2)).toBe(true);
    expect(isSubmitJobsRecoverStuckRpcResponse("2")).toBe(true);
    expect(isSubmitJobsMarkCompletedRpcResponse(null)).toBe(true);
    expect(isSubmitJobsMarkCompletedRpcResponse(undefined)).toBe(true);
    expect(isSubmitJobsMarkFailedRpcResponse({ retry_count: 1, status: "pending" })).toBe(true);
    expect(isSubmitJobsMarkFailedRpcResponse([{ retry_count: 3, status: "failed" }])).toBe(true);
    expect(isSubmitJobsMetricsRpcResponse([{ pending: 1, processing: 0, failed: 2, oldest_pending: null }])).toBe(true);

    expectInvalid({}, isSubmitJobsRecoverStuckRpcResponse, "submit_jobs_recover_stuck");
    expectInvalid({ ok: true }, isSubmitJobsMarkCompletedRpcResponse, "submit_jobs_mark_completed");
    expectInvalid({ retry_count: {}, status: "failed" }, isSubmitJobsMarkFailedRpcResponse, "submit_jobs_mark_failed");
    expectInvalid([{ pending: {}, processing: 0, failed: 0 }], isSubmitJobsMetricsRpcResponse, "submit_jobs_metrics");
  });
});

describe("S-RPC-3 source contract", () => {
  it("adds validation immediately after selected high-risk RPC responses", () => {
    const sources = [
      readSource("src/screens/warehouse/warehouse.requests.read.canonical.ts"),
      readSource("src/screens/warehouse/warehouse.incoming.repo.ts"),
      readSource("src/screens/accountant/accountant.inbox.service.ts"),
      readSource("src/screens/accountant/accountant.history.service.ts"),
      readSource("src/screens/director/director.proposals.repo.ts"),
      readSource("src/features/market/market.repository.ts"),
      readSource("src/lib/infra/jobQueue.ts"),
    ].join("\n");

    [
      "warehouse_issue_queue_scope_v4",
      "warehouse_issue_items_scope_v1",
      "warehouse_incoming_queue_scope_v1",
      "warehouse_incoming_items_scope_v1",
      "accountant_inbox_scope_v1",
      "list_accountant_payments_history_v2",
      "accountant_history_scope_v1",
      "director_pending_proposals_scope_v1",
      "marketplace_items_scope_page_v1",
      "marketplace_item_scope_detail_v1",
      "submit_jobs_claim",
      "submit_jobs_recover_stuck",
      "submit_jobs_mark_completed",
      "submit_jobs_mark_failed",
      "submit_jobs_metrics",
    ].forEach((rpcName) => {
      expect(sources).toContain(`rpcName: "${rpcName}"`);
    });
  });

  it("does not reopen S-RPC-1 or S-RPC-2 artifacts", () => {
    const status = readSource("artifacts/S_RPC_2_runtime_validation_matrix.json");
    expect(status).toContain("wh_receive_apply_ui");
    expect(status).toContain("wh_issue_free_atomic_v5");
    expect(status).toContain("request_item_update_qty");
  });
});
