jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

import { callAssistantStoreReadBff } from "../../src/lib/assistant_store_read.bff.client";
import {
  handleAssistantStoreReadBffScope,
  type AssistantStoreReadBffPort,
} from "../../src/lib/assistant_store_read.bff.handler";
import type { AssistantStoreReadBffReadResultDto } from "../../src/lib/assistant_store_read.bff.contract";

const createPort = (): AssistantStoreReadBffPort => ({
  runAssistantStoreRead: jest.fn(async (input): Promise<AssistantStoreReadBffReadResultDto> => ({
    data: [{ row: input.operation }],
    error: null,
  })),
});

describe("assistant/store BFF handler contract", () => {
  it("returns typed read envelopes for assistant and store read operations", async () => {
    const port = createPort();

    const actor = await handleAssistantStoreReadBffScope(port, {
      operation: "assistant.actor.context",
      args: { userId: "user-redacted" },
    });
    const listings = await handleAssistantStoreReadBffScope(port, {
      operation: "assistant.market.active_listings",
      args: { pageSize: 100 },
    });
    const storeList = await handleAssistantStoreReadBffScope(port, {
      operation: "store.request_items.list",
      args: { requestId: "request-redacted", status: "draft" },
    });

    expect(actor.ok).toBe(true);
    expect(listings.ok).toBe(true);
    expect(storeList.ok).toBe(true);
    if (actor.ok) {
      expect(actor.data).toEqual(
        expect.objectContaining({
          contractId: "assistant_store_read_scope_v1",
          operation: "assistant.actor.context",
          result: { data: [{ row: "assistant.actor.context" }], error: null },
        }),
      );
    }
  });

  it("redacts invalid and upstream failures without raw error leakage", async () => {
    const invalid = await handleAssistantStoreReadBffScope(createPort(), {
      operation: "assistant.unknown",
      args: {},
    });
    expect(invalid).toEqual({
      ok: false,
      error: {
        code: "ASSISTANT_STORE_READ_BFF_INVALID_OPERATION",
        message: "Invalid assistant/store read operation",
      },
    });

    const failingPort: AssistantStoreReadBffPort = {
      async runAssistantStoreRead() {
        throw new Error("token=secretvalue user@example.test raw-row");
      },
    };
    const failed = await handleAssistantStoreReadBffScope(failingPort, {
      operation: "store.director_inbox.list",
      args: {},
    });
    expect(failed).toEqual({
      ok: false,
      error: {
        code: "ASSISTANT_STORE_READ_BFF_UPSTREAM_ERROR",
        message: "Assistant/store read upstream failed",
      },
    });
    expect(JSON.stringify(failed)).not.toContain("secretvalue");
    expect(JSON.stringify(failed)).not.toContain("user@example.test");
  });

  it("keeps mobile traffic contract-only when readonly traffic percent is zero", async () => {
    const fetchImpl = jest.fn();
    const getAccessToken = jest.fn(async () => "mobile-session-token");

    await expect(
      callAssistantStoreReadBff(
        {
          operation: "store.director_inbox.list",
          args: {},
        },
        {
          config: {
            enabled: true,
            baseUrl: "https://gox-build-staging-bff.onrender.com",
            readOnly: true,
            runtimeEnvironment: "staging",
            trafficPercent: 0,
            mutationRoutesEnabled: false,
            productionGuard: true,
          },
          getAccessToken,
          fetchImpl,
        },
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "BFF_CONTRACT_ONLY",
    });

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the approved readonly route for staging calls", async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        ok: true,
        data: {
          contractId: "assistant_store_read_scope_v1",
          documentType: "assistant_store_read_scope",
          operation: "store.director_inbox.list",
          source: "bff:assistant_store_read_scope_v1",
          result: { data: [{ row: "redacted" }], error: null },
        },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      callAssistantStoreReadBff(
        {
          operation: "store.director_inbox.list",
          args: {},
        },
        {
          config: {
            enabled: true,
            baseUrl: "https://gox-build-staging-bff.onrender.com/ignored",
            readOnly: true,
            runtimeEnvironment: "staging",
            trafficPercent: 1,
            mutationRoutesEnabled: false,
            productionGuard: true,
          },
          getAccessToken: async () => "mobile-session-token",
          fetchImpl,
        },
      ),
    ).resolves.toEqual({
      status: "ok",
      response: expect.objectContaining({
        operation: "store.director_inbox.list",
      }),
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://gox-build-staging-bff.onrender.com/api/staging-bff/read/assistant-store-read-scope",
    );
  });
});
