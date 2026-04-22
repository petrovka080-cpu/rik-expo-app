import { supabase } from "../../src/lib/supabaseClient";
import { createSubcontractDraftWithPatch } from "../../src/screens/subcontracts/subcontracts.shared";

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
};

describe("strict-null phase 2 subcontract create slice", () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
  });

  it("omits optional create args instead of sending nulls", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        path: "created",
        subcontract: {
          id: "sub-phase2",
          display_no: "SUB-2000/2026",
        },
      },
      error: null,
    });

    await expect(createSubcontractDraftWithPatch("user-1", "Foreman", {})).resolves.toEqual({
      id: "sub-phase2",
      display_no: "SUB-2000/2026",
    });

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    const [, payload] = mockSupabase.rpc.mock.calls[0] as [string, Record<string, unknown>];

    expect(payload.p_created_by).toBe("user-1");
    expect(payload.p_foreman_name).toBe("Foreman");
    expect(payload.p_contractor_org).toBeUndefined();
    expect(payload.p_contractor_inn).toBeUndefined();
    expect(payload.p_qty_planned).toBeUndefined();
    expect(payload.p_price_per_unit).toBeUndefined();
    expect(payload.p_total_price).toBeUndefined();
    expect(payload.p_foreman_comment).toBeUndefined();
  });

  it("preserves explicit optional values on the canonical create path", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        path: "created",
        subcontract: {
          id: "sub-phase2-explicit",
          display_no: "SUB-2001/2026",
        },
      },
      error: null,
    });

    await createSubcontractDraftWithPatch("user-2", "Foreman", {
      contractor_org: "Org",
      contractor_inn: "1234567890",
      qty_planned: 10,
      price_per_unit: 12.5,
      total_price: 125,
      foreman_comment: "Ready",
    });

    const [, payload] = mockSupabase.rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.p_contractor_org).toBe("Org");
    expect(payload.p_contractor_inn).toBe("1234567890");
    expect(payload.p_qty_planned).toBe(10);
    expect(payload.p_price_per_unit).toBe(12.5);
    expect(payload.p_total_price).toBe(125);
    expect(payload.p_foreman_comment).toBe("Ready");
  });
});
