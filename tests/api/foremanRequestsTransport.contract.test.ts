import fs from "fs";
import path from "path";
import { probeForemanRequestsHasRequestNo } from "../../src/screens/foreman/foreman.requests.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("foreman requests transport boundary", () => {
  it("keeps request_no schema probe behind the transport boundary", () => {
    const serviceSource = read("src/screens/foreman/foreman.requests.ts");
    const transportSource = read("src/screens/foreman/foreman.requests.transport.ts");

    expect(serviceSource).toContain("foreman.requests.transport");
    expect(serviceSource).toContain("probeForemanRequestsHasRequestNo");
    expect(serviceSource).not.toContain('supabase.from("requests").select("request_no")');
    expect(serviceSource).not.toContain('.select("request_no").limit(1)');
    expect(transportSource).toContain('from("requests").select("request_no").limit(1)');
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
});
