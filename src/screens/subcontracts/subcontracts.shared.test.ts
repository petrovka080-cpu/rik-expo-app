import { supabase } from "../../lib/supabaseClient";
import {
  approveSubcontract,
  createSubcontractDraftWithPatch,
  rejectSubcontract,
} from "./subcontracts.shared";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

type RpcError = { message?: string; code?: string } | null;

const mockSupabase = supabase as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
};

describe("subcontracts shared boundary", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("creates subcontract draft through canonical rpc path", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        path: "created",
        subcontract: {
          id: "sub-1",
          display_no: "SUB-0001/2026",
        },
      },
      error: null,
    });

    await expect(
      createSubcontractDraftWithPatch("user-1", "Foreman", {
        contractor_org: "Org",
        contractor_inn: "1234567890",
      }),
    ).resolves.toEqual({
      id: "sub-1",
      display_no: "SUB-0001/2026",
    });

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("subcontract_create_v1", expect.objectContaining({
      p_created_by: "user-1",
      p_foreman_name: "Foreman",
      p_contractor_inn: "1234567890",
    }));
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("falls back to legacy create rpc when canonical rpc is missing", async () => {
    mockSupabase.rpc.mockImplementation((fn: string, args: Record<string, unknown>) => {
      if (fn === "subcontract_create_v1") {
        return Promise.resolve({
          data: null,
          error: {
            code: "PGRST202",
            message: "Could not find the function public.subcontract_create_v1",
          } satisfies Exclude<RpcError, null>,
        });
      }

      if (fn === "subcontract_create_draft") {
        expect(args).not.toHaveProperty("p_contractor_inn");
        return Promise.resolve({
          data: {
            id: "sub-legacy",
            display_no: "SUB-0002/2026",
          },
          error: null,
        });
      }

      throw new Error(`Unexpected rpc ${fn}`);
    });

    await expect(
      createSubcontractDraftWithPatch("user-1", "Foreman", {
        contractor_inn: "1234567890",
      }),
    ).resolves.toEqual({
      id: "sub-legacy",
      display_no: "SUB-0002/2026",
    });

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(
      "[subcontracts.shared] create.compat_legacy_rpc",
      expect.objectContaining({
        reason: "rpc_missing_or_incompatible",
      }),
    );
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when create rpc returns malformed payload", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        path: "created",
        subcontract: {
          display_no: "SUB-0003/2026",
        },
      },
      error: null,
    });

    await expect(createSubcontractDraftWithPatch("user-1", "Foreman", {})).rejects.toThrow(
      "subcontract create returned invalid payload",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[subcontracts.shared] create.invalid_payload",
      expect.objectContaining({
        operation: "create",
      }),
    );
  });

  it("surfaces create rpc transport errors without silent fallback", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied for function subcontract_create_v1",
      },
    });

    await expect(createSubcontractDraftWithPatch("user-1", "Foreman", {})).rejects.toMatchObject({
      message: "permission denied for function subcontract_create_v1",
    });

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[subcontracts.shared] create.rpc_failed",
      expect.objectContaining({
        operation: "create",
      }),
    );
  });

  it("approves subcontract through atomic rpc and keeps client-side update removed", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        mutation_path: "approved",
        subcontract: {
          id: "sub-approve",
          status: "approved",
        },
      },
      error: null,
    });

    await expect(approveSubcontract("sub-approve")).resolves.toBeUndefined();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("subcontract_approve_v1", {
      p_subcontract_id: "sub-approve",
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("treats repeated approve as idempotent success", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        mutation_path: "already_approved",
        subcontract: {
          id: "sub-approve",
          status: "approved",
        },
      },
      error: null,
    });

    await expect(approveSubcontract("sub-approve")).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalledWith(
      "[subcontracts.shared] approve.controlled_failure",
      expect.anything(),
    );
  });

  it("rejects subcontract through atomic rpc", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: true,
        mutation_path: "rejected",
        subcontract: {
          id: "sub-reject",
          status: "rejected",
          director_comment: "Need changes",
        },
      },
      error: null,
    });

    await expect(rejectSubcontract("sub-reject", "Need changes")).resolves.toBeUndefined();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("subcontract_reject_v1", {
      p_subcontract_id: "sub-reject",
      p_director_comment: "Need changes",
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("fails on competing status mutation instead of silently overwriting", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        ok: false,
        failure_code: "invalid_status",
        failure_message: "subcontract reject is only allowed from pending status",
        current_status: "approved",
        subcontract: {
          id: "sub-conflict",
          status: "approved",
        },
      },
      error: null,
    });

    await expect(rejectSubcontract("sub-conflict", "Too late")).rejects.toThrow(
      "subcontract reject is only allowed from pending status",
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "[subcontracts.shared] reject.controlled_failure",
      expect.objectContaining({
        currentStatus: "approved",
        failureCode: "invalid_status",
      }),
    );
  });
});
