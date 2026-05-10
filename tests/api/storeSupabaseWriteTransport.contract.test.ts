import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

const functionBody = (source: string, functionName: string): string => {
  const start = source.indexOf(`export async function ${functionName}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
};

describe("store_supabase write transport boundary", () => {
  it("keeps direct RPC and write ownership out of the service facade", () => {
    const serviceSource = read("src/lib/store_supabase.ts");
    const transportSource = read("src/lib/store_supabase.write.transport.ts");

    expect(serviceSource).toContain("./store_supabase.write.transport");
    expect(serviceSource).not.toMatch(/\bsupabase\s*\./);
    expect(functionBody(serviceSource, "sendRequestToDirector")).not.toContain(".rpc(");
    expect(functionBody(serviceSource, "approvePending")).not.toContain(".rpc(");
    expect(functionBody(serviceSource, "createPoFromRequest")).not.toContain(".from(");
    expect(functionBody(serviceSource, "createPoFromRequest")).not.toContain(".insert(");

    expect(transportSource).toContain('send_request_to_director');
    expect(transportSource).toContain('approve_or_decline_request_pending');
    expect(transportSource).toMatch(/\.from\("purchases"\)/);
    expect(transportSource).toContain("STORE_PURCHASE_SELECT");
    expect(transportSource).toContain(".select(STORE_PURCHASE_SELECT)");
    expect(transportSource).toContain('supabase.from("purchase_items")');
    expect(transportSource).toContain('supabase.from("purchases_pending")');
    expect(transportSource.match(/\bsupabase\s*\.\s*rpc\s*\(/g) ?? []).toHaveLength(2);
    expect(transportSource.match(/\bsupabase\s*\.\s*from\s*\(/g) ?? []).toHaveLength(3);
  });

  it("keeps runtime validation and PO assembly behavior in the service facade", () => {
    const serviceSource = read("src/lib/store_supabase.ts");

    expect(serviceSource).toContain("validateRpcResponse");
    expect(serviceSource).toContain("isSendRequestToDirectorRpcResponse");
    expect(serviceSource).toContain("isApproveOrDeclinePendingRpcResponse");
    expect(functionBody(serviceSource, "sendRequestToDirector")).toContain("validateRpcResponse");
    expect(functionBody(serviceSource, "approvePending")).toContain("validateRpcResponse");
    expect(functionBody(serviceSource, "createPoFromRequest")).toContain("listApprovedByRequest(requestId)");
    expect(functionBody(serviceSource, "createPoFromRequest")).toContain("request_item_id: it.id");
    expect(functionBody(serviceSource, "createPoFromRequest")).toContain("pendErr.code !== '23505'");
  });
});
