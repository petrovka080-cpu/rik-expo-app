import fs from "node:fs";
import path from "node:path";

import {
  classifyAiActionLedgerPostgrestRpcProbe,
  parseAiActionLedgerPostgrestOpenApiVisibility,
  verifyAiActionLedgerPostgrestRpcVisibility,
} from "../../scripts/db/verifyAiActionLedgerPostgrestRpcVisibility";

describe("AI action ledger PostgREST RPC visibility verifier", () => {
  it("parses OpenAPI visibility for every required ledger RPC", () => {
    const source = [
      "/rpc/ai_action_ledger_submit_for_approval_v1",
      "/rpc/ai_action_ledger_get_status_v1",
      "/rpc/ai_action_ledger_approve_v1",
      "/rpc/ai_action_ledger_reject_v1",
      "/rpc/ai_action_ledger_execute_approved_v1",
      "/rpc/ai_action_ledger_verify_apply_v1",
    ].join("\n");

    expect(parseAiActionLedgerPostgrestOpenApiVisibility(source)).toMatchObject({
      postgrestRpcVisible: true,
      submitForApprovalRpcVisible: true,
      getStatusRpcVisible: true,
      approveRpcVisible: true,
      rejectRpcVisible: true,
      executeApprovedRpcVisible: true,
      verifyApplyRpcVisible: true,
    });
  });

  it("classifies PGRST202 as stale schema cache rather than SQL deployment failure", () => {
    expect(classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: 404,
      postgrestErrorCode: "PGRST202",
      message: "Could not find the function public.ai_action_ledger_get_status_v1 in the schema cache",
    })).toMatchObject({
      status: "BLOCKED_POSTGREST_SCHEMA_CACHE_STALE",
      postgrestRpcVisible: false,
      postgrestRpcCallable: false,
    });
  });

  it("treats HTTP auth blockers as PostgREST visibility, not stale cache", () => {
    expect(classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: 401,
      postgrestErrorCode: "PGRST301",
      message: "JWT is missing",
    })).toMatchObject({
      status: "GREEN_RPC_VISIBLE_AUTH_REQUIRED",
      postgrestRpcVisible: true,
      postgrestAuthRequired: true,
    });

    expect(classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: 403,
      postgrestErrorCode: "42501",
      message: "permission denied for function ai_action_ledger_get_status_v1",
    })).toMatchObject({
      status: "BLOCKED_POSTGREST_RPC_PERMISSION_DENIED",
      postgrestRpcVisible: true,
      postgrestPermissionDenied: true,
    });
  });

  it("treats HTTP 400 argument mismatch as visible RPC surface", () => {
    expect(classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: 400,
      postgrestErrorCode: "PGRST102",
      message: "Function argument signature did not match the request parameters",
    })).toMatchObject({
      status: "GREEN_RPC_VISIBLE_SIGNATURE_MISMATCH_ONLY",
      postgrestRpcVisible: true,
      postgrestRpcCallable: false,
    });
  });

  it("classifies PGRST203 as obsolete overload ambiguity", () => {
    expect(classifyAiActionLedgerPostgrestRpcProbe({
      httpStatus: 300,
      postgrestErrorCode: "PGRST203",
      message: "Could not choose the best candidate function between overloaded signatures",
    })).toMatchObject({
      status: "BLOCKED_POSTGREST_RPC_AMBIGUOUS_OVERLOAD",
      postgrestRpcVisible: false,
      pgrst203: true,
    });
  });

  it("blocks when PostgREST URL/key are missing and never prints secrets", async () => {
    const result = await verifyAiActionLedgerPostgrestRpcVisibility(
      {},
      path.join(process.cwd(), "artifacts", "missing-postgrest-env-contract"),
    );

    expect(result).toMatchObject({
      status: "BLOCKED_POSTGREST_URL_OR_KEY_MISSING",
      rawRowsPrinted: false,
      secretsPrinted: false,
      databaseUrlValuePrinted: false,
      credentialsPrinted: false,
      mutatingRpcExecuted: false,
    });
    expect(JSON.stringify(result)).not.toContain("postgres://");
  });

  it("uses authenticated signature-aware HTTP probes without service credentials", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/db/verifyAiActionLedgerPostgrestRpcVisibility.ts"),
      "utf8",
    );

    expect(source).toContain("/rest/v1");
    expect(source).toContain("/rpc/${params.fn}");
    expect(source).toContain("AI_ACTION_LEDGER_RPC_FUNCTIONS.getStatus");
    expect(source).toContain("AI_ACTION_LEDGER_RPC_FUNCTIONS.verifyApply");
    expect(source).toContain("signatureAwarePayload");
    expect(source).toContain("all_6_rpc_signature_aware_probe_ok");
    expect(source).toContain("pgrst203");
    expect(source).toContain("old_stub_overloads");
    expect(source).toContain("authenticated_execute_grant_ok");
    expect(source).not.toMatch(/\.rpc\s*\(/);
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/i);
  });
});
