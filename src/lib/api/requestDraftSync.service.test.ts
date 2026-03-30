jest.mock("../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    realtime: {
      setAuth: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock("./requests.parsers", () => ({
  mapRequestRow: jest.fn(),
}));

import { supabase } from "../supabaseClient";
import { syncRequestDraftViaRpc } from "./requestDraftSync.service";

const mockSupabase = supabase as unknown as {
  rpc: jest.Mock;
};

describe("request draft sync lifecycle boundary", () => {
  beforeEach(() => {
    mockSupabase.rpc.mockReset();
  });

  it("surfaces stale submitted request lifecycle errors without silent fallback", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: {
        message: "request_sync_draft_v2: stale_draft_against_submitted_request",
      },
    });

    await expect(
      syncRequestDraftViaRpc({
        requestId: "req-submitted",
        lines: [
          {
            request_item_id: "item-1",
            rik_code: "MAT-1",
            qty: 1,
          },
        ],
      }),
    ).rejects.toThrow(
      "request_sync_draft_v2 failed: request_sync_draft_v2: stale_draft_against_submitted_request",
    );
  });
});
