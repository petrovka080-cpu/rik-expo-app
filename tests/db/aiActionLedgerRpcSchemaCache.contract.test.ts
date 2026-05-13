import fs from "node:fs";
import path from "node:path";

import {
  parseAiActionLedgerRpcOpenApiVisibility,
  verifyAiActionLedgerRpcSchemaCache,
} from "../../scripts/db/verifyAiActionLedgerRpcSchemaCache";

describe("AI action ledger RPC schema cache verification", () => {
  it("parses PostgREST OpenAPI visibility for every required ledger RPC", () => {
    const source = [
      "/rpc/ai_action_ledger_submit_for_approval_v1",
      "/rpc/ai_action_ledger_get_status_v1",
      "/rpc/ai_action_ledger_approve_v1",
      "/rpc/ai_action_ledger_reject_v1",
      "/rpc/ai_action_ledger_execute_approved_v1",
      "/rpc/ai_action_ledger_verify_apply_v1",
    ].join("\n");

    expect(parseAiActionLedgerRpcOpenApiVisibility(source)).toMatchObject({
      postgrestSchemaCacheRpcVisible: true,
      submitForApprovalRpcVisible: true,
      getStatusRpcVisible: true,
      approveRpcVisible: true,
      rejectRpcVisible: true,
      executeApprovedRpcVisible: true,
      verifyApplyRpcVisible: true,
    });
  });

  it("blocks before schema-cache verification when direct DB inspection cannot run", async () => {
    const result = await verifyAiActionLedgerRpcSchemaCache({}, process.cwd());

    expect(result).toMatchObject({
      status: "BLOCKED_DB_URL_NOT_APPROVED",
      noRpcExecuted: true,
      rawRowsPrinted: false,
      secretsPrinted: false,
      databaseUrlValuePrinted: false,
      credentialsPrinted: false,
    });
  });

  it("uses OpenAPI metadata instead of executing mutating RPCs", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/verifyAiActionLedgerRpcSchemaCache.ts"),
      "utf8",
    );

    expect(source).toContain("/rest/v1/");
    expect(source).not.toMatch(/\.rpc\s*\(/);
    expect(source).not.toContain("submitForApproval(");
    expect(source).not.toContain("approve(");
    expect(source).not.toContain("reject(");
  });
});
