import fs from "fs";
import path from "path";
import { loadCurrentForemanAuthUserId } from "../../src/screens/foreman/foreman.auth.transport";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("foreman auth transport boundary", () => {
  it("keeps foreman history auth user lookups behind the transport boundary", () => {
    const requestHistorySource = read("src/screens/foreman/hooks/useForemanHistory.ts");
    const subcontractHistorySource = read("src/screens/foreman/hooks/useForemanSubcontractHistory.ts");
    const transportSource = read("src/screens/foreman/foreman.auth.transport.ts");

    expect(requestHistorySource).toContain("foreman.auth.transport");
    expect(requestHistorySource).not.toContain("supabase.auth.getUser");
    expect(requestHistorySource).not.toContain("../../../lib/supabaseClient");
    expect(subcontractHistorySource).toContain("foreman.auth.transport");
    expect(subcontractHistorySource).not.toContain("supabase.auth.getUser");
    expect(subcontractHistorySource).not.toContain("../../../lib/supabaseClient");
    expect(transportSource).toContain("supabase.auth.getUser");
    expect(transportSource).toContain("loadCurrentForemanAuthUserId");
  });

  it("preserves current user id trimming semantics", async () => {
    await expect(
      loadCurrentForemanAuthUserId({
        readUser: async () => ({ data: { user: { id: " user-1 " } } }),
      }),
    ).resolves.toBe("user-1");

    await expect(
      loadCurrentForemanAuthUserId({
        readUser: async () => ({ data: { user: { id: " " } } }),
      }),
    ).resolves.toBeNull();
  });
});
