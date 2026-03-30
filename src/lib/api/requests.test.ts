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
  parseRequestSubmitAtomicResult: jest.fn((payload: Record<string, unknown> | null | undefined) => {
    if (!payload) {
      return {
        ok: false,
        requestId: "",
        failureCode: "request_submit_failed",
        failureMessage: "missing payload",
        validation: null,
        invalidItemIds: [],
      };
    }
    if (payload.ok === false) {
      return {
        ok: false,
        requestId: String(payload.request_id ?? payload.requestId ?? ""),
        failureCode: String(payload.failure_code ?? payload.failureCode ?? "request_submit_failed"),
        failureMessage: String(payload.failure_message ?? payload.failureMessage ?? "request submit failed"),
        validation:
          payload.validation && typeof payload.validation === "object"
            ? (payload.validation as Record<string, unknown>)
            : null,
        invalidItemIds: Array.isArray(payload.invalid_item_ids ?? payload.invalidItemIds)
          ? ((payload.invalid_item_ids ?? payload.invalidItemIds) as unknown[]).map(String)
          : [],
      };
    }
    const request =
      payload.request && typeof payload.request === "object"
        ? (payload.request as Record<string, unknown>)
        : null;
    return {
      ok: true,
      requestId: String(payload.request_id ?? payload.requestId ?? request?.id ?? ""),
      submitPath: String(payload.submit_path ?? payload.submitPath ?? "rpc_submit"),
      hasPostDraftItems: payload.has_post_draft_items === true || payload.hasPostDraftItems === true,
      reconciled: payload.reconciled !== false,
      record: request
        ? {
            id: String(request.id ?? ""),
            status: request.status ?? null,
            submitted_at: request.submitted_at ?? null,
          }
        : null,
      verification:
        payload.verification && typeof payload.verification === "object"
          ? (payload.verification as Record<string, unknown>)
          : null,
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
  requestReopen,
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
      if (fn === "request_submit_atomic_v1") {
        return Promise.resolve({
          data: {
            ok: true,
            request_id: "request-1",
            submit_path: "rpc_submit",
            has_post_draft_items: false,
            reconciled: true,
            request: {
              id: "request-1",
              status: "pending",
              submitted_at: "2026-03-30T10:00:00.000Z",
            },
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
    ];

    mockClient.from.mockImplementation((table: string) => {
      if (table === "requests") {
        return {
          select: jest.fn(() =>
            makeSelectChain(Promise.resolve(requestRows.shift() ?? { data: null, error: null })),
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
    expect(mockClient.rpc).toHaveBeenNthCalledWith(2, "request_submit_atomic_v1", {
      p_request_id_text: "request-1",
    });
  });

  it("uses server reconcile path for post-draft requests without client request_items probe", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_submit_atomic_v1") {
        return Promise.resolve({
          data: {
            ok: true,
            request_id: "request-2",
            submit_path: "server_reconcile_existing",
            has_post_draft_items: true,
            reconciled: true,
            request: {
              id: "request-2",
              status: "approved",
              submitted_at: "2026-03-30T10:00:00.000Z",
            },
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
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await requestSubmitMutation("request-2");

    expect(result).toMatchObject({
      request_id: "request-2",
      path: "server_reconcile_existing",
      has_post_draft_items: true,
      reconciled: true,
    });
    expect(mockClient.from).toHaveBeenCalledTimes(1);
    expect(mockClient.from).not.toHaveBeenCalledWith("request_items");
  });

  it("fails closed when atomic submit returns controlled failure", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_submit_atomic_v1") {
        return Promise.resolve({
          data: {
            ok: false,
            request_id: "request-3",
            failure_code: "reconcile_failed",
            failure_message: "Server-side request status reconcile failed.",
            validation: {
              submit_path: "server_reconcile_existing",
              expectation_mode: "mixed_terminal",
            },
          },
          error: null,
        });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    await expect(requestSubmitMutation("request-3")).rejects.toThrow(
      "Server-side request status reconcile failed.",
    );
    expect(mockClient.from).not.toHaveBeenCalled();
  });

  it("reopens submitted request through canonical rpc boundary", async () => {
    mockClient.rpc.mockImplementation((fn: string) => {
      if (fn === "request_reopen_atomic_v1") {
        return Promise.resolve({
          data: {
            ok: true,
            request_id: "request-4",
            transition_path: "rpc_reopen",
            restored_item_count: 1,
            request: {
              id: "request-4",
              status: "Черновик",
              submitted_at: null,
            },
          },
          error: null,
        });
      }
      throw new Error(`Unexpected rpc ${fn}`);
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table === "requests") {
        return {
          select: jest.fn(() =>
            makeSelectChain(
              Promise.resolve({
                data: {
                  id: "request-4",
                  status: "Черновик",
                  submitted_at: null,
                },
                error: null,
              }),
            ),
          ),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const record = await requestReopen("request-4");

    expect(record).toMatchObject({
      id: "request-4",
      status: "Черновик",
      submitted_at: null,
    });
    expect(mockClient.rpc).toHaveBeenCalledWith("request_reopen_atomic_v1", {
      p_request_id_text: "request-4",
    });
  });
});
