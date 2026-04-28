import fs from "fs";
import path from "path";

import {
  isAccountantFinancialStateResponse,
  isDirectorApproveRequestResponse,
  isRequestItemUpdateQtyResponse,
  isRpcNonEmptyStringResponse,
  isRpcVoidResponse,
  isWarehouseIssueAtomicResponse,
  RpcValidationError,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";

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
      caller: "tests/api/rpcRuntimeValidationBatch2.contract.test",
      domain: "unknown",
    }),
  ).toThrow(RpcValidationError);
};

describe("S-RPC-2 runtime validation guards", () => {
  it("validates void RPC responses and keeps validation errors redacted", () => {
    expect(isRpcVoidResponse(null)).toBe(true);
    expect(isRpcVoidResponse(undefined)).toBe(true);

    const rawPayload = {
      email: "buyer@example.com",
      token: "secret-token",
    };

    try {
      validateRpcResponse(rawPayload, isRpcVoidResponse, {
        rpcName: "request_items_set_status",
        caller: "tests/api/rpcRuntimeValidationBatch2.contract.test",
        domain: "buyer",
      });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RpcValidationError);
      expect(String((error as Error).message)).toContain("request_items_set_status");
      expect(String((error as Error).message)).not.toContain("buyer@example.com");
      expect(String((error as Error).message)).not.toContain("secret-token");
    }
  });

  it("validates non-empty string RPC responses", () => {
    expect(isRpcNonEmptyStringResponse("tender-1")).toBe(true);
    expectInvalid(null, isRpcNonEmptyStringResponse, "buyer_rfq_create_and_publish_v1");
    expectInvalid({ tender_id: "tender-1" }, isRpcNonEmptyStringResponse, "buyer_rfq_create_and_publish_v1");
    expectInvalid(["tender-1"], isRpcNonEmptyStringResponse, "buyer_rfq_create_and_publish_v1");
  });

  it("validates warehouse issue atomic confirmation responses", () => {
    expect(isWarehouseIssueAtomicResponse(1)).toBe(true);
    expect(
      isWarehouseIssueAtomicResponse({
        issue_id: 42,
        client_mutation_id: "issue-1",
        idempotent_replay: false,
      }),
    ).toBe(true);
    expectInvalid({}, isWarehouseIssueAtomicResponse, "wh_issue_request_atomic_v1");
    expectInvalid({ issue_id: {} }, isWarehouseIssueAtomicResponse, "wh_issue_request_atomic_v1");
    expectInvalid([{ issue_id: 42 }], isWarehouseIssueAtomicResponse, "wh_issue_request_atomic_v1");
  });

  it("validates nullable director approve request responses", () => {
    expect(isDirectorApproveRequestResponse(null)).toBe(true);
    expect(isDirectorApproveRequestResponse({ ok: true, request_id: "request-1" })).toBe(true);
    expect(
      isDirectorApproveRequestResponse({
        ok: false,
        failure_code: "empty_request",
        failure_message: "Request is empty",
      }),
    ).toBe(true);
    expectInvalid({}, isDirectorApproveRequestResponse, "director_approve_request_v1");
    expectInvalid({ ok: "true" }, isDirectorApproveRequestResponse, "director_approve_request_v1");
    expectInvalid([{ ok: true }], isDirectorApproveRequestResponse, "director_approve_request_v1");
  });

  it("validates request item update quantity rows", () => {
    const validRow = {
      id: "ri-1",
      request_id: "request-1",
      qty: 3,
      name_human: "Material",
      status: "draft",
      note: null,
    };

    expect(isRequestItemUpdateQtyResponse(validRow)).toBe(true);
    expectInvalid({ ...validRow, id: null }, isRequestItemUpdateQtyResponse, "request_item_update_qty");
    expectInvalid({ ...validRow, qty: {} }, isRequestItemUpdateQtyResponse, "request_item_update_qty");
    expectInvalid([validRow], isRequestItemUpdateQtyResponse, "request_item_update_qty");
  });

  it("validates accountant financial state envelopes", () => {
    const validState = {
      proposal: {
        proposal_id: "proposal-1",
      },
      invoice: {},
      totals: {
        payable_amount: 100,
        total_paid: 20,
        outstanding_amount: 80,
      },
      eligibility: {
        approved: true,
        sent_to_accountant: true,
        payment_eligible: true,
      },
      allocation_summary: {},
      items: [],
      meta: {},
    };

    expect(isAccountantFinancialStateResponse(validState)).toBe(true);
    expectInvalid(
      { ...validState, proposal: {} },
      isAccountantFinancialStateResponse,
      "accountant_proposal_financial_state_v1",
    );
    expectInvalid(
      { ...validState, totals: { payable_amount: "bad", total_paid: 20, outstanding_amount: 80 } },
      isAccountantFinancialStateResponse,
      "accountant_proposal_financial_state_v1",
    );
    expectInvalid(
      { ...validState, items: {} },
      isAccountantFinancialStateResponse,
      "accountant_proposal_financial_state_v1",
    );
  });
});

describe("S-RPC-2 source contract", () => {
  it("validates exactly the selected runtime RPC call-sites", () => {
    const warehouseRepo = readSource("src/screens/warehouse/warehouse.issue.repo.ts");
    const buyerRepo = readSource("src/screens/buyer/buyer.actions.repo.ts");
    const directorRequest = readSource("src/screens/director/director.request.ts");
    const catalogRequest = readSource("src/lib/catalog/catalog.request.service.ts");
    const accountantApi = readSource("src/lib/api/accountant.ts");

    expect(warehouseRepo).toContain("wh_issue_free_atomic_v5");
    expect(warehouseRepo).toContain("wh_issue_request_atomic_v1");
    expect(warehouseRepo).toContain("validateWarehouseIssueAtomicResult");

    expect(buyerRepo).toContain("request_items_set_status");
    expect(buyerRepo).toContain("buyer_rfq_create_and_publish_v1");
    expect(buyerRepo).toContain("proposal_send_to_accountant_min");
    expect(buyerRepo).toContain("validateBuyerRpcResult");

    expect(directorRequest).toContain('rpcName: "reject_request_item"');
    expect(directorRequest).toContain('rpcName: "reject_request_all"');
    expect(directorRequest).toContain('rpcName: "director_approve_request_v1"');

    expect(catalogRequest).toContain('rpcName: "request_item_update_qty"');
    expect(accountantApi).toContain('rpcName: "accountant_proposal_financial_state_v1"');
  });

  it("does not reopen existing S-RPC-1 validation call-sites", () => {
    const sRpc1Proof = readSource("artifacts/S_RPC_1_runtime_validation_matrix.json");
    const sRpc1Callsites = [
      "wh_receive_apply_ui",
      "accounting_pay_invoice_v1",
      "director_approve_pipeline_v1",
      "rpc_proposal_submit_v3",
      "request_sync_draft_v2",
    ];

    for (const rpcName of sRpc1Callsites) {
      expect(sRpc1Proof).toContain(rpcName);
    }
  });
});
