import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

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
  filterProposalItemsByExistingRequestLinks: jest.fn(),
}));

import { proposalAddItems, proposalSubmit } from "./proposals";
import { supabase as mockedSupabase } from "../supabaseClient";
import { classifyRpcCompatError, client } from "./_core";
import {
  ensureProposalRequestItemsIntegrity,
  filterProposalItemsByExistingRequestLinks,
} from "./integrity.guards";

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
  const mockFilterProposalItemsByExistingRequestLinks =
    filterProposalItemsByExistingRequestLinks as unknown as jest.Mock;

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
    mockFilterProposalItemsByExistingRequestLinks.mockReset().mockImplementation(
      async (_client: unknown, rows: unknown[]) => ({
        rows,
        droppedRequestItemIds: [],
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
});
