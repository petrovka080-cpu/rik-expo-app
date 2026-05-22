import fs from "fs";
import path from "path";
import {
  approveDirectorRequestRpc,
  rejectDirectorRequestAllRpc,
  rejectDirectorRequestItemRpc,
} from "../../src/screens/director/director.request.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("director request transport boundary", () => {
  it("keeps director request mutation RPC calls behind the transport boundary", () => {
    const screenSource = read("src/screens/director/director.request.ts");
    const boundarySource = read("src/screens/director/director.request.boundary.ts");
    const transportSource = read("src/screens/director/director.request.transport.ts");

    expect(screenSource).toContain("director.request.boundary");
    expect(screenSource).not.toContain("director.request.transport");
    expect(screenSource).not.toContain("supabase.rpc(");

    expect(boundarySource).toContain("director.request.transport");
    expect(boundarySource).not.toContain("supabase.rpc(");
    expect(boundarySource).toContain('rpcName: "reject_request_item"');
    expect(boundarySource).toContain('rpcName: "reject_request_all"');
    expect(boundarySource).toContain('rpcName: "director_approve_request_v1"');

    expect(transportSource).toContain("callRateLimitedSupabaseRpc");
    expect(transportSource).toContain('"reject_request_item"');
    expect(transportSource).toContain('"reject_request_all"');
    expect(transportSource).toContain('"director_approve_request_v1"');
  });

  it("preserves reject item RPC payload semantics", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const result = await rejectDirectorRequestItemRpc({ rpc }, "ri-1");

    expect(result).toEqual({ data: null, error: null });
    expect(rpc).toHaveBeenCalledWith("reject_request_item", {
      request_item_id: "ri-1",
      reason: null,
    });
  });

  it("preserves reject all RPC payload semantics", async () => {
    const rpc = jest.fn(async () => ({ data: null, error: null }));
    const result = await rejectDirectorRequestAllRpc({ rpc }, "req-1");

    expect(result).toEqual({ data: null, error: null });
    expect(rpc).toHaveBeenCalledWith("reject_request_all", {
      p_request_id: "req-1",
      p_reason: null,
    });
  });

  it("preserves approve request RPC payload semantics", async () => {
    const rpc = jest.fn(async () => ({ data: { ok: true }, error: null }));
    const result = await approveDirectorRequestRpc(
      { rpc },
      { requestId: "req-1", clientMutationId: "cm-1" },
    );

    expect(result).toEqual({ data: { ok: true }, error: null });
    expect(rpc).toHaveBeenCalledWith("director_approve_request_v1", {
      p_request_id: "req-1",
      p_client_mutation_id: "cm-1",
    });
  });
});
