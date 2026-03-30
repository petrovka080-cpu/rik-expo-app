import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("./_core", () => {
  const actual = jest.requireActual("./_core");
  return {
    ...actual,
    client: {
      from: jest.fn(),
      rpc: jest.fn(),
    },
    normalizeUuid: jest.fn((value: unknown) => String(value ?? "").trim() || null),
    toFilterId: jest.fn((value: unknown) => String(value ?? "").trim()),
  };
});

jest.mock("./integrity.guards", () => ({
  ensureRequestExists: jest.fn(),
}));

jest.mock("./requests.parsers", () => ({
  mapRequestRow: jest.fn((row: Record<string, unknown> | null | undefined) => {
    if (!row) return null;
    return {
      id: String(row.id ?? ""),
      status: row.status ?? null,
      submitted_at: row.submitted_at ?? null,
      comment: row.comment ?? null,
      display_no: row.display_no ?? null,
    };
  }),
  parseRequestItemsByRequestRows: jest.fn((rows: unknown) => (Array.isArray(rows) ? rows : [])),
  parseRequestSubmitResultRow: jest.fn((row: Record<string, unknown> | null | undefined) => {
    if (!row) return null;
    return {
      id: String(row.id ?? ""),
      status: row.status ?? null,
      submitted_at: row.submitted_at ?? null,
    };
  }),
}));

jest.mock("./requests.read-capabilities", () => ({
  buildRequestSelectSchemaSafe: jest.fn(async () => "id,status,submitted_at"),
}));

import { supabase } from "../supabaseClient";
import { client } from "./_core";
import { ensureRequestExists } from "./integrity.guards";
import {
  clearCachedDraftRequestId,
  getOrCreateDraftRequestId,
  requestCreateDraft,
  requestSubmitMutation,
} from "./requests";

type MockResult<T> = Promise<{ data: T; error: Error | null }>;

const mockSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
    signOut: jest.Mock;
  };
  from: jest.Mock;
  rpc: jest.Mock;
};

const mockClient = client as unknown as {
  from: jest.Mock;
  rpc: jest.Mock;
};

const mockEnsureRequestExists = ensureRequestExists as unknown as jest.Mock;

const makeSelectChain = <T,>(result: MockResult<T>) => {
  const chain = {
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    limit: jest.fn(() => result),
    maybeSingle: jest.fn(() => result),
    single: jest.fn(() => result),
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    then: result.then.bind(result),
    catch: result.catch.bind(result),
    finally: result.finally.bind(result),
  };
  return chain;
};

describe("requests mutation boundary", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;
    resetPlatformObservabilityEvents();
    clearCachedDraftRequestId();
    mockSupabase.auth.getSession.mockReset().mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
        },
      },
    });
    mockSupabase.auth.signOut.mockReset().mockResolvedValue(undefined);
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
    mockClient.from.mockReset();
    mockClient.rpc.mockReset();
    mockEnsureRequestExists.mockReset().mockResolvedValue(undefined);
  });

  it("reuses eligible empty draft before inserting a new request draft", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_find_reusable_empty_draft_v1") {
        return Promise.resolve({ data: "draft-1", error: null });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    const updatedRow = {
      id: "draft-1",
      status: "draft",
      comment: "reused comment",
      submitted_at: null,
    };

    mockClient.from.mockImplementation((table: string) => {
      if (table !== "requests") throw new Error(`Unexpected table ${table}`);
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              maybeSingle: jest.fn<MockResult<typeof updatedRow>, []>(() =>
                Promise.resolve({ data: updatedRow, error: null }),
              ),
            })),
          })),
        })),
      };
    });

    const created = await requestCreateDraft({ comment: "reused comment" });

    expect(created).toMatchObject({
      id: "draft-1",
      comment: "reused comment",
    });
    expect(mockClient.rpc).toHaveBeenCalledWith("request_find_reusable_empty_draft_v1", {
      p_user_id: "user-1",
    });
    expect(mockClient.from).toHaveBeenCalledWith("requests");
    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "draft_reused_existing" &&
          event.result === "success" &&
          event.extra?.requestId === "draft-1",
      ),
    ).toBe(true);
  });

  it("reuses the cached draft id when it is still valid", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_find_reusable_empty_draft_v1") {
        return Promise.resolve({ data: "draft-cached", error: null });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table !== "requests") throw new Error(`Unexpected table ${table}`);
      return {
        select: jest.fn(() =>
          makeSelectChain(
            Promise.resolve({
              data: {
                id: "draft-cached",
                status: "draft",
                created_by: "user-1",
                submitted_at: null,
              },
              error: null,
            }),
          ),
        ),
      };
    });

    const first = await getOrCreateDraftRequestId();
    const second = await getOrCreateDraftRequestId();

    expect(first).toBe("draft-cached");
    expect(second).toBe("draft-cached");
    expect(mockClient.rpc).toHaveBeenCalledTimes(1);
  });

  it("verifies rpc submit path and clears cached draft id after success", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_find_reusable_empty_draft_v1") {
        return Promise.resolve({ data: "request-1", error: null });
      }
      if (fn === "request_submit") {
        return Promise.resolve({
          data: {
            id: "request-1",
            status: "pending",
            submitted_at: "2026-03-30T10:00:00.000Z",
          },
          error: null,
        });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    const requestRows = [
      {
        data: {
          id: "request-1",
          status: "pending",
          submitted_at: "2026-03-30T10:00:00.000Z",
        },
        error: null,
      },
      {
        data: {
          id: "request-1",
          status: "pending",
          submitted_at: "2026-03-30T10:00:00.000Z",
        },
        error: null,
      },
    ];

    mockClient.from.mockImplementation((table: string) => {
      if (table === "requests") {
        return {
          select: jest.fn(() =>
            makeSelectChain(Promise.resolve(requestRows.shift() ?? { data: null, error: null })),
          ),
        };
      }
      if (table === "request_items") {
        return {
          select: jest.fn(() =>
            makeSelectChain(
              Promise.resolve({
                data: [{ id: "ri-1", status: "pending" }],
                error: null,
              }),
            ),
          ),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const cachedId = await getOrCreateDraftRequestId();
    expect(cachedId).toBe("request-1");

    const result = await requestSubmitMutation("request-1");

    expect(result).toMatchObject({
      request_id: "request-1",
      path: "rpc_submit",
      reconciled: true,
      request_items_pending_synced: false,
    });
    expect(result.record).toMatchObject({
      id: "request-1",
      status: "pending",
    });

    const afterSubmit = await getOrCreateDraftRequestId();
    expect(afterSubmit).toBe("request-1");
    expect(mockClient.rpc).toHaveBeenNthCalledWith(2, "request_submit", {
      p_request_id: "request-1",
    });
  });

  it("fails closed when submit verification finds request items still in draft", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_submit") {
        return Promise.resolve({
          data: {
            id: "request-2",
            status: "pending",
            submitted_at: "2026-03-30T10:00:00.000Z",
          },
          error: null,
        });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    const requestRows = [
      {
        data: {
          id: "request-2",
          status: "pending",
          submitted_at: "2026-03-30T10:00:00.000Z",
        },
        error: null,
      },
    ];

    mockClient.from.mockImplementation((table: string) => {
      if (table === "requests") {
        return {
          select: jest.fn(() =>
            makeSelectChain(Promise.resolve(requestRows.shift() ?? { data: null, error: null })),
          ),
        };
      }
      if (table === "request_items") {
        return {
          select: jest.fn(() =>
            makeSelectChain(
              Promise.resolve({
                data: [{ id: "ri-draft", status: "draft" }],
                error: null,
              }),
            ),
          ),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    await expect(requestSubmitMutation("request-2")).rejects.toThrow(
      "request items not transitioned from draft",
    );
  });
});
