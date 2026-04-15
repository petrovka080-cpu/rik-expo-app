import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

import { proposalAddItems, proposalItems, proposalSubmit } from "./proposals";
import { supabase as mockedSupabase } from "../supabaseClient";
import { classifyRpcCompatError, client } from "./_core";
import {
  classifyProposalItemsByRequestItemIntegrity,
  ensureActiveProposalRequestItemsIntegrity,
  ensureProposalRequestItemsIntegrity,
} from "./integrity.guards";

jest.mock("../supabaseClient", () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

jest.mock("./_core", () => ({
  client: {
    rpc: jest.fn(),
    from: jest.fn(),
  },
  classifyRpcCompatError: jest.fn(),
}));

jest.mock("./integrity.guards", () => ({
  ensureProposalRequestItemsIntegrity: jest.fn(),
  ensureActiveProposalRequestItemsIntegrity: jest.fn(),
  classifyProposalItemsByRequestItemIntegrity: jest.fn(),
}));

describe("proposals silent catch discipline", () => {
  let consoleErrorSpy: jest.SpyInstance;

  const mockSupabase = mockedSupabase as unknown as {
    rpc: jest.Mock;
  };
  const mockClient = client as unknown as {
    rpc: jest.Mock;
    from: jest.Mock;
  };
  const mockClassifyRpcCompatError = classifyRpcCompatError as unknown as jest.Mock;
  const mockEnsureProposalRequestItemsIntegrity =
    ensureProposalRequestItemsIntegrity as unknown as jest.Mock;
  const mockEnsureActiveProposalRequestItemsIntegrity =
    ensureActiveProposalRequestItemsIntegrity as unknown as jest.Mock;
  const mockClassifyProposalItemsByRequestItemIntegrity =
    classifyProposalItemsByRequestItemIntegrity as unknown as jest.Mock;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase.rpc.mockReset();
    mockClient.rpc.mockReset();
    mockClient.from.mockReset();
    mockClassifyRpcCompatError.mockReset();
    mockEnsureProposalRequestItemsIntegrity.mockReset().mockResolvedValue(undefined);
    mockEnsureActiveProposalRequestItemsIntegrity.mockReset().mockResolvedValue(undefined);
    mockClassifyProposalItemsByRequestItemIntegrity.mockReset().mockImplementation(
      async (_client: unknown, rows: unknown[]) => ({
        rows,
        degradedRequestItemIds: [],
        cancelledRequestItemIds: [],
        missingRequestItemIds: [],
      }),
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("records degraded fallback when proposal item RPC fails but fallback insert succeeds", async () => {
    mockClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("proposal_add_items rpc failed"),
    });

    mockClient.from.mockImplementation((table: string) => {
      if (table !== "proposal_items") throw new Error(`Unexpected table ${table}`);
      return {
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 1 }, { id: 2 }],
            error: null,
          }),
        })),
      };
    });

    const inserted = await proposalAddItems("proposal-1", ["ri-1", "ri-2"]);
    expect(inserted).toBe(2);
    expect(mockEnsureActiveProposalRequestItemsIntegrity).toHaveBeenCalledWith(
      expect.anything(),
      "proposal-1",
      ["ri-1", "ri-2"],
      expect.objectContaining({
        surface: "proposal_add_items",
      }),
    );

    const events = getPlatformObservabilityEvents();
    expect(events.some((event) => event.event === "proposal_add_items_rpc_failed")).toBe(true);
    expect(
      events.some(
        (event) =>
          event.event === "add_proposal_items" &&
          event.result === "success" &&
          event.fallbackUsed === true,
      ),
    ).toBe(true);
  });

  it("surfaces submit failures through observability and rethrows them", async () => {
    mockClassifyRpcCompatError.mockReturnValue({
      kind: "permission",
      allowNextVariant: false,
      reason: "permission_denied",
    });
    mockClient.rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("submit denied"),
    });

    await expect(proposalSubmit("proposal-2")).rejects.toThrow("submit denied");

    const submitError = getPlatformObservabilityEvents().find(
      (event) => event.event === "submit_proposal" && event.result === "error",
    );
    expect(submitError).toBeTruthy();
    expect(submitError?.sourceKind).toBe("rpc:proposal_submit_text_v1");
  });

  it("preserves degraded proposal rows instead of silently dropping them", async () => {
    mockClient.from.mockImplementation((table: string) => {
      if (table === "proposal_snapshot_items") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 1,
                    request_item_id: "ri-missing",
                    rik_code: "MAT-1",
                    name_human: "Broken line",
                    uom: "pcs",
                    app_code: "APP-1",
                    total_qty: 2,
                    price: 10,
                    note: null,
                    supplier: null,
                  },
                ],
                error: null,
              }),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockClassifyProposalItemsByRequestItemIntegrity.mockResolvedValue({
      rows: [
        {
          id: 1,
          request_item_id: "ri-missing",
          rik_code: "MAT-1",
          name_human: "Broken line",
          uom: "pcs",
          app_code: "APP-1",
          total_qty: 2,
          price: 10,
          note: null,
          supplier: null,
          request_item_integrity_state: "source_missing",
          request_item_integrity_reason: "request_item_missing",
          request_item_source_status: null,
          request_item_cancelled_at: null,
        },
      ],
      degradedRequestItemIds: ["ri-missing"],
      cancelledRequestItemIds: [],
      missingRequestItemIds: ["ri-missing"],
    });

    const rows = await proposalItems("proposal-degraded");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      request_item_id: "ri-missing",
      request_item_integrity_state: "source_missing",
      request_item_integrity_reason: "request_item_missing",
    });
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.event === "load_proposal_items" &&
          event.result === "success" &&
          event.extra?.publishState === "degraded",
      ),
    ).toBe(true);
  });

  it("maps integrity degraded submit failures to explicit recoverable error", async () => {
    mockClassifyRpcCompatError.mockReturnValue({
      kind: "integrity_guard",
      allowNextVariant: false,
      reason: "integrity_guard_block",
    });
    mockClient.rpc.mockResolvedValueOnce({
      data: null,
      error: {
        message: "proposal_request_item_integrity_degraded",
        details: JSON.stringify({
          proposal_id: "proposal-3",
          total_items: 2,
          degraded_items: 1,
          cancelled_items: 1,
          missing_items: 0,
          request_item_ids: ["ri-cancelled"],
        }),
      },
    });

    await expect(proposalSubmit("proposal-3")).rejects.toMatchObject({
      name: "ProposalRequestItemIntegrityDegradedError",
      code: "proposal_request_item_integrity_degraded",
      summary: expect.objectContaining({
        proposalId: "proposal-3",
        cancelledItems: 1,
        requestItemIds: ["ri-cancelled"],
      }),
    });
  });
});
