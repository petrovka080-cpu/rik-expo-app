import fs from "node:fs";
import path from "node:path";

import {
  listAiApprovalActionRoutes,
  scanAiApprovalRoutesForDirectExecute,
} from "../../src/features/ai/approvalRouter/aiApprovalActionRouter";

const ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("AI approval-required actions cannot execute directly", () => {
  it("keeps every approval-required audit action behind the approved ledger status gate", () => {
    const routes = listAiApprovalActionRoutes();

    expect(scanAiApprovalRoutesForDirectExecute(routes)).toEqual([]);
    expect(routes).toHaveLength(28);
    expect(routes.every((route) => route.ledgerRoute.directExecuteAllowed === false)).toBe(true);
    expect(routes.every((route) => route.executionPolicy.allowedStatuses.includes("approved"))).toBe(true);
  });

  it("does not import domain executors or direct mutation APIs in the audit router", () => {
    const routerSource = read("src/features/ai/approvalRouter/aiApprovalActionRouter.ts");
    const redactionSource = read("src/features/ai/approvalRouter/aiApprovalActionPayloadRedaction.ts");
    const evidenceSource = read("src/features/ai/approvalRouter/aiApprovalActionEvidencePolicy.ts");
    const combined = [routerSource, redactionSource, evidenceSource].join("\n");

    expect(combined).not.toContain("executeApprovedAiAction(");
    expect(combined).not.toContain("executeApprovedActionGateway(");
    expect(combined).not.toContain("createProcurementRequestExecutor(");
    expect(combined).not.toMatch(/\.(?:insert|update|upsert|delete)\s*\(/);
    expect(combined).not.toContain("@supabase/supabase-js");
  });
});
