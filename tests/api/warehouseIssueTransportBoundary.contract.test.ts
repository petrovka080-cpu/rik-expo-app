import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("S_AUDIT_BATTLE_97_WAREHOUSE_ISSUE_TRANSPORT_BOUNDARY", () => {
  it("keeps warehouse issue validation in repo while routing RPC execution through transport", () => {
    const repo = read("src/screens/warehouse/warehouse.issue.repo.ts");
    const transport = read("src/screens/warehouse/warehouse.issue.transport.ts");

    expect(repo).toContain("validateWarehouseIssueAtomicResult");
    expect(repo).toContain("issueWarehouseFreeAtomicTransport");
    expect(repo).toContain("issueWarehouseRequestAtomicTransport");
    expect(repo).not.toContain(".rpc(");

    expect(transport).toContain("supabase.rpc(\"wh_issue_free_atomic_v5\"");
    expect(transport).toContain("supabase.rpc(\"wh_issue_request_atomic_v1\"");
  });
});
