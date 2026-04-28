import { RpcValidationError } from "../../src/lib/api/queryBoundary";
import {
  issueWarehouseFreeAtomic,
  issueWarehouseRequestAtomic,
} from "../../src/screens/warehouse/warehouse.issue.repo";

const baseFreePayload = {
  p_who: "warehouseman",
  p_object_name: "object",
  p_work_name: "work",
  p_note: null,
  p_lines: [{ rik_code: "MAT-1", uom_id: "pcs", qty: 1 }],
  p_client_mutation_id: "issue-free-1",
};

const baseRequestPayload = {
  p_who: "warehouseman",
  p_note: "note",
  p_request_id: "request-1",
  p_object_name: "object",
  p_work_name: "work",
  p_lines: [{ rik_code: "MAT-1", uom_id: "pcs", qty: 1, request_item_id: "ri-1" }],
  p_client_mutation_id: "issue-request-1",
};

describe("warehouse issue rpc runtime validation", () => {
  it("passes valid free issue confirmation shapes", async () => {
    const rpc = jest.fn(async () => ({
      data: { issue_id: 42, client_mutation_id: "issue-free-1" },
      error: null,
    }));

    const result = await issueWarehouseFreeAtomic({ rpc } as never, baseFreePayload);

    expect(rpc).toHaveBeenCalledWith("wh_issue_free_atomic_v5", baseFreePayload);
    expect(result).toEqual({
      data: { issue_id: 42, client_mutation_id: "issue-free-1" },
      error: null,
    });
  });

  it("passes valid request issue confirmation shapes", async () => {
    const rpc = jest.fn(async () => ({ data: 1, error: null }));

    const result = await issueWarehouseRequestAtomic({ rpc } as never, baseRequestPayload);

    expect(rpc).toHaveBeenCalledWith("wh_issue_request_atomic_v1", baseRequestPayload);
    expect(result).toEqual({ data: 1, error: null });
  });

  it("preserves existing Supabase error path", async () => {
    const error = new Error("warehouse_rpc_failed");
    const rpc = jest.fn(async () => ({ data: { issue_id: 42 }, error }));

    const result = await issueWarehouseRequestAtomic({ rpc } as never, baseRequestPayload);

    expect(result).toEqual({ data: { issue_id: 42 }, error });
  });

  it("fails closed on malformed response without raw payload in the message", async () => {
    const rpc = jest.fn(async () => ({
      data: { buyer_email: "buyer@example.com", token: "secret-token" },
      error: null,
    }));

    const result = await issueWarehouseFreeAtomic({ rpc } as never, baseFreePayload);

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(RpcValidationError);
    expect(String((result.error as Error).message)).toContain("wh_issue_free_atomic_v5");
    expect(String((result.error as Error).message)).not.toContain("buyer@example.com");
    expect(String((result.error as Error).message)).not.toContain("secret-token");
  });
});
