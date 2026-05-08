import fs from "fs";
import path from "path";
import {
  patchForemanRequestLinkRow,
  probeForemanRequestsHasRequestNo,
} from "../../src/screens/foreman/foreman.requests.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("foreman requests transport boundary", () => {
  it("keeps request_no schema probe and link patch behind the transport boundary", () => {
    const serviceSource = read("src/screens/foreman/foreman.requests.ts");
    const transportSource = read("src/screens/foreman/foreman.requests.transport.ts");

    expect(serviceSource).toContain("foreman.requests.transport");
    expect(serviceSource).toContain("probeForemanRequestsHasRequestNo");
    expect(serviceSource).toContain("patchForemanRequestLinkRow");
    expect(serviceSource).not.toContain('supabase.from("requests").select("request_no")');
    expect(serviceSource).not.toContain('.select("request_no").limit(1)');
    expect(serviceSource).not.toContain('supabase.from("requests").update(patch).eq("id", requestId)');
    expect(transportSource).toContain('from("requests").select("request_no").limit(1)');
    expect(transportSource).toContain('from("requests").update(params.patch).eq("id", params.requestId)');
    expect(transportSource).not.toContain("errText");
  });

  it("preserves positive and error probe semantics", async () => {
    const successClient = {
      from: () => ({
        select: () => ({
          limit: async () => ({ error: null }),
        }),
      }),
    };
    const failure = new Error("missing column");
    const failureClient = {
      from: () => ({
        select: () => ({
          limit: async () => ({ error: failure }),
        }),
      }),
    };

    await expect(
      probeForemanRequestsHasRequestNo({ client: successClient }),
    ).resolves.toBe(true);
    await expect(
      probeForemanRequestsHasRequestNo({ client: failureClient }),
    ).rejects.toBe(failure);
  });

  it("preserves request link patch transport semantics", async () => {
    const patch = {
      subcontract_id: "subcontract-1",
      contractor_job_id: "job-1",
      object_name: "Object A",
    };
    const patchEq = jest.fn(async () => ({ error: null }));
    const patchUpdate = jest.fn(() => ({ eq: patchEq }));
    const client = {
      from: jest.fn(() => ({ update: patchUpdate })),
    };

    await expect(
      patchForemanRequestLinkRow({
        requestId: "request-1",
        patch,
        client,
      }),
    ).resolves.toEqual({ error: null });

    expect(client.from).toHaveBeenCalledWith("requests");
    expect(patchUpdate).toHaveBeenCalledWith(patch);
    expect(patchEq).toHaveBeenCalledWith("id", "request-1");
  });
});
