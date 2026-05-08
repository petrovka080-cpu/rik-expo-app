import fs from "fs";
import path from "path";
import { supabase } from "../supabaseClient";
import { RpcValidationError } from "./queryBoundary";
import { syncRequestDraftViaRpc } from "./requestDraftSync.service";
import { mapRequestRow } from "./requests.parsers";

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

const mockSupabase = supabase as unknown as {
  auth: {
    getSession: jest.Mock;
  };
  realtime: {
    setAuth: jest.Mock;
  };
  channel: jest.Mock;
  removeChannel: jest.Mock;
  from: jest.Mock;
  rpc: jest.Mock;
};
const mockMapRequestRow = mapRequestRow as jest.Mock;
const readLocalSource = (fileName: string) =>
  fs.readFileSync(path.join(__dirname, fileName), "utf8");
const directClientCall = (method: string) => `supabase.${method}`;

type MockHandoffChannel = {
  subscribe: jest.Mock<MockHandoffChannel, [(status: string) => void]>;
  send: jest.Mock<Promise<string>, []>;
};

describe("request draft sync lifecycle boundary", () => {
  beforeEach(() => {
    mockSupabase.auth.getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "access-token" } },
    });
    mockSupabase.realtime.setAuth.mockReset().mockResolvedValue(undefined);
    mockSupabase.channel.mockReset();
    mockSupabase.removeChannel.mockReset().mockResolvedValue(undefined);
    mockSupabase.from.mockReset().mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockSupabase.rpc.mockReset();
    mockMapRequestRow.mockReset();
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

  it("throws RpcValidationError for malformed request draft sync response", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        document_type: "request_draft_sync",
        version: "v2",
        request_payload: null,
        items_payload: [],
        submitted: true,
        request_created: false,
      },
      error: null,
    });

    await expect(
      syncRequestDraftViaRpc({
        requestId: "req-1",
        lines: [],
      }),
    ).rejects.toBeInstanceOf(RpcValidationError);

    expect(mockMapRequestRow).not.toHaveBeenCalled();
  });

  it("removes the director handoff channel when broadcast subscribe fails", async () => {
    const channel = {} as MockHandoffChannel;
    channel.subscribe = jest.fn<MockHandoffChannel, [(status: string) => void]>(
      (callback) => {
        callback("CHANNEL_ERROR");
        return channel;
      },
    );
    channel.send = jest.fn<Promise<string>, []>();

    mockSupabase.channel.mockReturnValue(channel);
    mockSupabase.rpc.mockResolvedValue({
      data: {
        document_type: "request_draft_sync",
        version: "v2",
        request_payload: { id: "req-1" },
        items_payload: [],
        submitted: true,
        request_created: false,
      },
      error: null,
    });
    mockMapRequestRow.mockReturnValue({
      id: "req-1",
      display_no: "REQ-1",
      status: "submitted",
    });

    await expect(
      syncRequestDraftViaRpc({
        requestId: "req-1",
        lines: [],
        submit: true,
      }),
    ).resolves.toMatchObject({
      request: {
        id: "req-1",
      },
      submitted: true,
    });

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it("keeps request draft auth lookup behind the transport boundary", () => {
    const serviceSource = readLocalSource("requestDraftSync.service.ts");
    const transportSource = readLocalSource("requestDraftSync.auth.transport.ts");
    const syncTransportSource = readLocalSource("requestDraftSync.transport.ts");

    expect(serviceSource).toContain('from "./requestDraftSync.auth.transport"');
    expect(serviceSource).toContain('from "./requestDraftSync.transport"');
    expect(serviceSource).not.toContain("../supabaseClient");
    expect(serviceSource).not.toContain("supabase.auth.getSession");
    expect(serviceSource).not.toMatch(
      /\bsupabase\s*\.\s*(rpc|from|channel|removeChannel)\b/,
    );
    expect(transportSource).toContain("supabase.auth.getSession");
    expect(transportSource).toContain("Promise<string | null>");
    expect(syncTransportSource).toContain(
      `${directClientCall("rpc")}("request_sync_draft_v2"`,
    );
    expect(syncTransportSource).toContain(
      `${directClientCall("from")}("notifications")`,
    );
    expect(syncTransportSource).toContain(directClientCall("channel"));
    expect(syncTransportSource).toContain(directClientCall("removeChannel"));
  });
});
