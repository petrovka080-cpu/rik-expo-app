import fs from "fs";
import path from "path";
import { supabase } from "../../lib/supabaseClient";
import { RpcValidationError } from "../../lib/api/queryBoundary";
import {
  SUBCONTRACT_COLLECT_ALL_MAX_PAGES,
  SUBCONTRACT_COLLECT_ALL_MAX_ROWS,
  SUBCONTRACT_MAX_PAGE_SIZE,
  approveSubcontract,
  countDirectorSubcontracts,
  createSubcontractDraftWithPatch,
  listDirectorSubcontractsPage,
  listSubcontractItems,
  mergeSubcontractPages,
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

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

const makeSubcontractRow = (id: string, status: string = "pending") => ({
  id,
  status,
  created_at: "2026-01-01T00:00:00.000Z",
});

const makeSubcontractItemRow = (id: string) => ({
  id,
  subcontract_id: "sub-1",
  created_at: "2026-01-01T00:00:00.000Z",
  created_by: "user-1",
  source: "catalog",
  name: `item-${id}`,
  qty: 1,
  status: "draft",
});

const createRangeBuilder = (result: { data?: unknown; error?: unknown }) => {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.range.mockResolvedValue({
    data: result.data ?? [],
    error: result.error ?? null,
  });
  return builder;
};

const createDynamicRangeBuilder = (
  loadRange: (from: number, to: number) => { data?: unknown; error?: unknown },
) => {
  const builder: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    order: jest.fn(),
    range: jest.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.range.mockImplementation(async (from: number, to: number) => {
    const result = loadRange(from, to);
    return {
      data: result.data ?? [],
      error: result.error ?? null,
    };
  });
  return builder;
};

const createCountBuilder = (result: { count?: number; error?: unknown }) => {
  const builder: Record<string, unknown> = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    then: undefined as unknown,
  };
  (builder.select as jest.Mock).mockReturnValue(builder);
  (builder.eq as jest.Mock).mockReturnValue(builder);
  (builder.not as jest.Mock).mockReturnValue(builder);
  builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve({
      count: result.count ?? 0,
      error: result.error ?? null,
    }).then(resolve, reject);
  return builder;
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

  it("keeps subcontract RPC provider calls behind the typed transport boundary", () => {
    const serviceSource = readSource("src/screens/subcontracts/subcontracts.shared.ts");
    const transportSource = readSource("src/screens/subcontracts/subcontracts.shared.transport.ts");

    expect(serviceSource).toContain('from "./subcontracts.shared.transport"');
    expect(serviceSource).toContain("callSubcontractCreateRpc");
    expect(serviceSource).toContain("callSubcontractCreateDraftRpc");
    expect(serviceSource).toContain("callSubcontractStatusMutationRpc");
    expect(serviceSource).not.toContain("supabase.rpc(");
    expect(transportSource).toContain('supabase.rpc("subcontract_create_v1"');
    expect(transportSource).toContain('supabase.rpc("subcontract_create_draft"');
    expect(transportSource).toContain("supabase.rpc(rpcName, args)");
    expect(transportSource).not.toContain("validateRpcResponse");
    expect(transportSource).not.toContain("SubcontractMutationError");
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

    await expect(createSubcontractDraftWithPatch("user-1", "Foreman", {})).rejects.toBeInstanceOf(
      RpcValidationError,
    );

    expect(warnSpy).not.toHaveBeenCalledWith(
      "[subcontracts.shared] create.invalid_payload",
      expect.objectContaining({ payload: expect.anything() }),
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

  it("clamps subcontract page size and returns hasMore metadata", async () => {
    const builder = createRangeBuilder({
      data: Array.from({ length: SUBCONTRACT_MAX_PAGE_SIZE + 1 }, (_, idx) =>
        makeSubcontractRow(`sub-${idx + 1}`),
      ),
    });
    mockSupabase.from.mockReturnValue(builder);

    const page = await listDirectorSubcontractsPage({
      status: "pending",
      offset: 0,
      pageSize: 999,
    });

    expect(builder.range).toHaveBeenCalledWith(0, SUBCONTRACT_MAX_PAGE_SIZE);
    expect(builder.eq).toHaveBeenCalledWith("status", "pending");
    expect(page.items).toHaveLength(SUBCONTRACT_MAX_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
    expect(page.nextOffset).toBe(SUBCONTRACT_MAX_PAGE_SIZE);
    expect(page.pageSize).toBe(SUBCONTRACT_MAX_PAGE_SIZE);
  });

  it("keeps director pending count on the server-side count path", async () => {
    const builder = createCountBuilder({ count: 27 });
    mockSupabase.from.mockReturnValue(builder);

    await expect(countDirectorSubcontracts("pending")).resolves.toBe(27);
    expect((builder.select as jest.Mock)).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect((builder.eq as jest.Mock)).toHaveBeenCalledWith("status", "pending");
  });

  it("preserves full subcontract item reads via bounded page loop", async () => {
    const firstPage = createRangeBuilder({
      data: Array.from({ length: SUBCONTRACT_MAX_PAGE_SIZE + 1 }, (_, idx) =>
        makeSubcontractItemRow(`item-${idx + 1}`),
      ),
    });
    const secondPage = createRangeBuilder({
      data: [makeSubcontractItemRow(`item-${SUBCONTRACT_MAX_PAGE_SIZE + 2}`)],
    });
    mockSupabase.from
      .mockReturnValueOnce(firstPage)
      .mockReturnValueOnce(secondPage);

    const rows = await listSubcontractItems("sub-1");

    expect(firstPage.range).toHaveBeenCalledWith(0, SUBCONTRACT_MAX_PAGE_SIZE);
    expect(secondPage.range).toHaveBeenCalledWith(SUBCONTRACT_MAX_PAGE_SIZE, SUBCONTRACT_MAX_PAGE_SIZE * 2);
    expect(rows).toHaveLength(SUBCONTRACT_MAX_PAGE_SIZE + 1);
    expect(rows[0]?.id).toBe("item-1");
    expect(rows[rows.length - 1]?.id).toBe(`item-${SUBCONTRACT_MAX_PAGE_SIZE + 2}`);
  });

  it("fails closed when subcontract item collection exceeds the max row ceiling", async () => {
    const builder = createDynamicRangeBuilder((from, to) => ({
      data: Array.from({ length: to - from + 1 }, (_, idx) =>
        makeSubcontractItemRow(`item-${from + idx + 1}`),
      ),
    }));
    mockSupabase.from.mockReturnValue(builder);

    await expect(listSubcontractItems("sub-1")).rejects.toThrow("max row ceiling");

    expect(builder.range).toHaveBeenCalledTimes(SUBCONTRACT_COLLECT_ALL_MAX_PAGES);
    expect(builder.range).toHaveBeenLastCalledWith(
      SUBCONTRACT_COLLECT_ALL_MAX_ROWS - SUBCONTRACT_MAX_PAGE_SIZE,
      SUBCONTRACT_COLLECT_ALL_MAX_ROWS,
    );
  });

  it("dedupes appended subcontract pages by id", () => {
    const merged = mergeSubcontractPages(
      [makeSubcontractRow("sub-1"), makeSubcontractRow("sub-2")],
      [makeSubcontractRow("sub-2"), makeSubcontractRow("sub-3")],
    );

    expect(merged.map((row) => row.id)).toEqual(["sub-1", "sub-2", "sub-3"]);
  });
});
