import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

import {
  RpcValidationError,
  isRpcBooleanOrVoidResponse,
  isRpcIgnoredMutationResponse,
  isRpcNonEmptyStringResponse,
  isRpcNumberLikeResponse,
  validateRpcResponse,
} from "../../src/lib/api/queryBoundary";
import { isDeveloperOverrideContextRpcResponse } from "../../src/lib/developerOverride";

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";

const isApprovedAiActionLedgerReadinessPatch = (file: string) =>
  file.replace(/\\/g, "/") === aiActionLedgerReadinessMigration;

const expectInvalid = (
  value: unknown,
  validator: (candidate: unknown) => boolean,
  rpcName: string,
) => {
  expect(() =>
    validateRpcResponse(value, validator as never, {
      rpcName,
      caller: "tests/api/sRpc7MutationResultEnvelopes.contract.test",
      domain: "unknown",
    }),
  ).toThrow(RpcValidationError);
};

const selectedCallSites = [
  {
    file: "src/lib/api/proposals.ts",
    rpcNames: [
      "proposal_submit_text_v1",
      "proposal_submit",
      "proposal_add_items",
      "proposal_items_snapshot",
    ],
    guards: [
      "isProposalIgnoredMutationRpcResponse",
      "isProposalAddItemsRpcResponse",
    ],
  },
  {
    file: "src/lib/api/director.ts",
    rpcNames: ["approve_one", "reject_one"],
    guards: ["isDirectorLegacyDecisionRpcResponse"],
  },
  {
    file: "src/lib/api/profile.ts",
    rpcNames: ["ensure_my_profile", "get_my_role"],
    guards: ["isEnsureMyProfileRpcResponse", "isGetMyRoleRpcResponse"],
  },
  {
    file: "src/screens/warehouse/warehouse.nameMap.ui.ts",
    rpcNames: ["warehouse_refresh_name_map_ui"],
    guards: ["isWarehouseRefreshNameMapUiRpcResponse"],
  },
  {
    file: "src/lib/developerOverride.ts",
    rpcNames: [
      "developer_override_context_v1",
      "developer_set_effective_role_v1",
      "developer_clear_effective_role_v1",
    ],
    guards: ["isDeveloperOverrideContextRpcResponse"],
  },
  {
    file: "src/lib/api/accountant.ts",
    rpcNames: ["proposal_send_to_accountant_min"],
    guards: ["isRpcIgnoredMutationResponse"],
  },
];

const developerOverrideContext = {
  actorUserId: "user-1",
  isEnabled: true,
  isActive: true,
  allowedRoles: ["buyer", "director"],
  activeEffectiveRole: "buyer",
  canAccessAllOfficeRoutes: true,
  canImpersonateForMutations: true,
  expiresAt: "2026-05-16T00:00:00.000Z",
  reason: "runtime verification",
};

describe("S-RPC-7 mutation result envelopes", () => {
  it("guards selected mutation call-sites with result validation", () => {
    for (const callSite of selectedCallSites) {
      const source = read(callSite.file);
      expect(source).toContain("validateRpcResponse");
      for (const rpcName of callSite.rpcNames) {
        expect(source).toContain(rpcName);
      }
      for (const guard of callSite.guards) {
        expect(source).toContain(guard);
      }
    }
  });

  it("preserves ignored/void compatibility while rejecting malformed envelopes", () => {
    expect(isRpcIgnoredMutationResponse(null)).toBe(true);
    expect(isRpcIgnoredMutationResponse(undefined)).toBe(true);
    expect(isRpcIgnoredMutationResponse(true)).toBe(true);
    expect(isRpcIgnoredMutationResponse(1)).toBe(true);
    expect(isRpcIgnoredMutationResponse("1")).toBe(true);
    expect(isRpcIgnoredMutationResponse({ ok: true })).toBe(true);
    expect(isRpcIgnoredMutationResponse({ success: false })).toBe(true);

    expectInvalid({ error: true }, isRpcIgnoredMutationResponse, "proposal_submit_text_v1");
    expectInvalid([], isRpcIgnoredMutationResponse, "proposal_items_snapshot");
    expectInvalid("done", isRpcIgnoredMutationResponse, "proposal_send_to_accountant_min");
  });

  it("validates mutation outputs that drive user-visible state", () => {
    expect(isRpcNumberLikeResponse(3)).toBe(true);
    expect(isRpcNumberLikeResponse("3")).toBe(true);
    expect(isRpcBooleanOrVoidResponse(true)).toBe(true);
    expect(isRpcBooleanOrVoidResponse(false)).toBe(true);
    expect(isRpcBooleanOrVoidResponse(null)).toBe(true);
    expect(isRpcNonEmptyStringResponse("director")).toBe(true);
    expect(isDeveloperOverrideContextRpcResponse(developerOverrideContext)).toBe(true);

    expectInvalid({ count: 3 }, isRpcNumberLikeResponse, "proposal_add_items");
    expectInvalid(1, isRpcBooleanOrVoidResponse, "approve_one");
    expectInvalid("", isRpcNonEmptyStringResponse, "get_my_role");
    expectInvalid(
      { ...developerOverrideContext, allowedRoles: "buyer" },
      isDeveloperOverrideContextRpcResponse,
      "developer_set_effective_role_v1",
    );
  });

  it("keeps previous RPC waves closed and forbidden surfaces untouched", () => {
    const previous = [
      "artifacts/S_RPC_1_runtime_validation_matrix.json",
      "artifacts/S_RPC_2_runtime_validation_matrix.json",
      "artifacts/S_RPC_3_runtime_validation_matrix.json",
      "artifacts/S_RPC_4_runtime_validation_matrix.json",
      "artifacts/S_RPC_5_runtime_validation_matrix.json",
      "artifacts/S_RPC_6_high_risk_rpc_validation_matrix.json",
    ].map((file) => JSON.parse(read(file)));

    expect(previous[0].selectedRpcCount).toBe(5);
    expect(previous[1].validatedRpcCallsites).toBe(10);
    expect(previous[2].validatedRpcCallsites).toBe(18);
    expect(previous[3].result.validatedCallSites).toBe(15);
    expect(previous[4].result.validatedCallSites).toBe(15);
    expect(previous[5].result.validatedRpcNames).toBe(7);

    const changedSource = selectedCallSites.map((callSite) => read(callSite.file)).join("\n");
    expect(changedSource).not.toMatch(/payload:\s*(data|rpc\.data|rawPayload)/);
    expect(changedSource).not.toMatch(/console\.(log|warn|error)\([^)]*rpc\.data/);

    const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => !isApprovedAiActionLedgerReadinessPatch(file));

    expect(changedFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(supabase\/migrations|android\/|ios\/|maestro\/)/),
      ]),
    );
  });

  it("keeps S-RPC-7 artifacts valid", () => {
    expect(existsSync(join(root, "artifacts/S_RPC_7_mutation_result_envelopes_matrix.json"))).toBe(true);
    expect(existsSync(join(root, "artifacts/S_RPC_7_mutation_result_envelopes_proof.md"))).toBe(true);

    const matrix = JSON.parse(read("artifacts/S_RPC_7_mutation_result_envelopes_matrix.json"));
    expect(matrix.status).toBe("GREEN_MUTATION_RPC_ENVELOPES_VALIDATED");
    expect(matrix.result.validatedMutationRpcNames).toBeGreaterThanOrEqual(5);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.pdfReportExportSemanticsChanged).toBe(false);
    expect(matrix.safety.rawPayloadLogged).toBe(false);
  });
});
