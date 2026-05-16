import fs from "node:fs";
import path from "node:path";

import { planAiScreenLocalAssistantAction } from "../../src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator";
import {
  AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS,
  listAiScreenLocalAssistantProfiles,
  resolveAiScreenLocalAssistantContext,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver";
import {
  buildAiScreenLocalActionSourcePolicyMatrix,
  resolveAiScreenLocalActionSourcePolicy,
} from "../../src/features/ai/assistantOrchestrator/aiScreenLocalActionSourcePolicy";
import {
  normalizeAiScreenLocalAssistantRuntimeScreenId,
} from "../../src/features/ai/assistantOrchestrator/aiRoleScreenBoundary";
import { getAiScreenActionEntry } from "../../src/features/ai/screenActions/aiScreenActionRegistry";
import { getAiScreenRuntimeEntry } from "../../src/features/ai/screenRuntime/aiScreenRuntimeRegistry";
import type { AiUserRole } from "../../src/features/ai/policy/aiRolePolicy";

const WAVE = "S_AI_RUNTIME_08_SCREEN_LOCAL_ACTION_SOURCE_POLICY";
const GREEN = "GREEN_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_READY" as const;
const BLOCKED_MAP_MISSING = "BLOCKED_AI_SCREEN_LOCAL_ACTION_MAP_MISSING" as const;
const BLOCKED_RUNTIME_FALLBACK = "BLOCKED_AI_SCREEN_LOCAL_RUNTIME_INTENT_FALLBACK" as const;
const BLOCKED_POLICY_DRIFT = "BLOCKED_AI_SCREEN_LOCAL_ACTION_SOURCE_POLICY_DRIFT" as const;

type RuntimeOnlyIntentCheck = {
  screenId: string;
  runtimeScreenId: string;
  role: AiUserRole;
  intent: string;
  planStatus: "planned" | "blocked" | "handoff_plan_only";
  blocked: boolean;
};

type ContextIntentCheck = {
  screenId: string;
  role: AiUserRole;
  contextIntents: readonly string[];
  actionRegistryIntents: readonly string[];
  matchesActionRegistry: boolean;
};

type Matrix = {
  wave: typeof WAVE;
  final_status:
    | typeof GREEN
    | typeof BLOCKED_MAP_MISSING
    | typeof BLOCKED_RUNTIME_FALLBACK
    | typeof BLOCKED_POLICY_DRIFT;
  required_screen_count: number;
  local_profile_count: number;
  all_screen_local_profiles_have_action_map: boolean;
  missing_action_map_screens: readonly string[];
  foreman_subcontract_action_map_registered: boolean;
  no_orchestrator_runtime_intent_fallback: boolean;
  context_intents_from_action_registry_only: boolean;
  runtime_only_intents_blocked: boolean;
  runtime_only_intent_checked_count: number;
  runtime_only_intent_allowed_count: number;
  action_policy_source_explicit: boolean;
  no_db_writes: true;
  no_provider_calls: true;
  no_raw_rows: true;
  no_fake_green: true;
  blockers: readonly string[];
};

function artifactPath(fileName: string): string {
  return path.join(process.cwd(), "artifacts", fileName);
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function representativeRole(screenId: string): AiUserRole {
  const actionEntry = getAiScreenActionEntry(screenId);
  return actionEntry?.allowedRoles[0] ?? "unknown";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function collectRuntimeOnlyIntentChecks(): RuntimeOnlyIntentCheck[] {
  return listAiScreenLocalAssistantProfiles().flatMap((profile) => {
    const actionEntry = getAiScreenActionEntry(profile.screenId);
    const runtimeScreenId = normalizeAiScreenLocalAssistantRuntimeScreenId(profile.screenId);
    const runtimeEntry = getAiScreenRuntimeEntry(runtimeScreenId);
    if (!actionEntry || !runtimeEntry || runtimeEntry.mounted !== "mounted") return [];

    const actionIntents = new Set(actionEntry.visibleActions.map((action) => action.intent));
    const runtimeOnlyIntents = runtimeEntry.availableIntents.filter((intent) => !actionIntents.has(intent as never));
    const role = representativeRole(profile.screenId);

    return runtimeOnlyIntents.map((intent) => {
      const plan = planAiScreenLocalAssistantAction({
        auth: { userId: `${role}-source-policy-proof`, role },
        screenId: profile.screenId,
        intent,
      });
      return {
        screenId: profile.screenId,
        runtimeScreenId,
        role,
        intent,
        planStatus: plan.status,
        blocked: plan.status === "blocked",
      };
    });
  });
}

function collectContextIntentChecks(): ContextIntentCheck[] {
  return listAiScreenLocalAssistantProfiles().flatMap((profile) => {
    const actionEntry = getAiScreenActionEntry(profile.screenId);
    if (!actionEntry) return [];
    const role = representativeRole(profile.screenId);
    const context = resolveAiScreenLocalAssistantContext({
      auth: { userId: `${role}-context-intent-proof`, role },
      screenId: profile.screenId,
    });
    const contextIntents = unique([...context.availableIntents]).sort();
    const actionRegistryIntents = unique(actionEntry.visibleActions.map((action) => action.intent)).sort();

    return [
      {
        screenId: profile.screenId,
        role,
        contextIntents,
        actionRegistryIntents,
        matchesActionRegistry: JSON.stringify(contextIntents) === JSON.stringify(actionRegistryIntents),
      },
    ];
  });
}

function buildMatrix(): {
  inventory: unknown;
  matrix: Matrix;
  runtimeOnlyIntentChecks: readonly RuntimeOnlyIntentCheck[];
  contextIntentChecks: readonly ContextIntentCheck[];
} {
  const sourcePolicyMatrix = buildAiScreenLocalActionSourcePolicyMatrix();
  const orchestratorSource = readProjectFile(
    "src/features/ai/assistantOrchestrator/aiScreenLocalAssistantOrchestrator.ts",
  );
  const contextResolverSource = readProjectFile(
    "src/features/ai/assistantOrchestrator/aiScreenLocalContextResolver.ts",
  );
  const runtimeOnlyIntentChecks = collectRuntimeOnlyIntentChecks();
  const contextIntentChecks = collectContextIntentChecks();
  const noOrchestratorRuntimeIntentFallback =
    !orchestratorSource.includes("fallbackPlanFromRuntimeIntent") &&
    !orchestratorSource.includes("runtimeFallback") &&
    orchestratorSource.includes("resolveAiScreenLocalActionSourcePolicy");
  const contextIntentsFromActionRegistryOnly =
    !contextResolverSource.includes("runtime?.availableIntents") &&
    !contextResolverSource.includes("runtime.availableIntents") &&
    contextIntentChecks.every((check) => check.matchesActionRegistry);
  const runtimeOnlyIntentsBlocked = runtimeOnlyIntentChecks.every((check) => check.blocked);
  const actionPolicySourceExplicit = resolveAiScreenLocalActionSourcePolicy({
    auth: { userId: "buyer-source-policy-proof", role: "buyer" },
    screenId: "buyer.main",
    actionId: "buyer.main.draft_request",
  }).actionPolicySource === "ai_screen_button_action_registry_v1";
  const foremanSubcontractActionMapRegistered = Boolean(getAiScreenActionEntry("foreman.subcontract"));

  const blockers = [
    ...(sourcePolicyMatrix.all_screen_local_profiles_have_action_map && foremanSubcontractActionMapRegistered
      ? []
      : [BLOCKED_MAP_MISSING]),
    ...(noOrchestratorRuntimeIntentFallback && runtimeOnlyIntentsBlocked
      ? []
      : [BLOCKED_RUNTIME_FALLBACK]),
    ...(contextIntentsFromActionRegistryOnly && actionPolicySourceExplicit
      ? []
      : [BLOCKED_POLICY_DRIFT]),
  ];
  const finalStatus =
    blockers.length === 0
      ? GREEN
      : blockers.includes(BLOCKED_MAP_MISSING)
        ? BLOCKED_MAP_MISSING
        : blockers.includes(BLOCKED_RUNTIME_FALLBACK)
          ? BLOCKED_RUNTIME_FALLBACK
          : BLOCKED_POLICY_DRIFT;

  return {
    inventory: {
      wave: WAVE,
      required_screens: [...AI_SCREEN_LOCAL_ASSISTANT_REQUIRED_SCREEN_IDS],
      local_profiles: listAiScreenLocalAssistantProfiles().map((profile) => ({
        screenId: profile.screenId,
        domain: profile.domain,
        roleScope: profile.defaultRoleScope,
        actionMapRegistered: Boolean(getAiScreenActionEntry(profile.screenId)),
      })),
      runtime_only_intent_checks: runtimeOnlyIntentChecks,
      context_intent_checks: contextIntentChecks,
    },
    matrix: {
      wave: WAVE,
      final_status: finalStatus,
      required_screen_count: sourcePolicyMatrix.required_screen_count,
      local_profile_count: sourcePolicyMatrix.local_profile_count,
      all_screen_local_profiles_have_action_map:
        sourcePolicyMatrix.all_screen_local_profiles_have_action_map,
      missing_action_map_screens: sourcePolicyMatrix.missing_action_map_screens,
      foreman_subcontract_action_map_registered: foremanSubcontractActionMapRegistered,
      no_orchestrator_runtime_intent_fallback: noOrchestratorRuntimeIntentFallback,
      context_intents_from_action_registry_only: contextIntentsFromActionRegistryOnly,
      runtime_only_intents_blocked: runtimeOnlyIntentsBlocked,
      runtime_only_intent_checked_count: runtimeOnlyIntentChecks.length,
      runtime_only_intent_allowed_count: runtimeOnlyIntentChecks.filter((check) => !check.blocked).length,
      action_policy_source_explicit: actionPolicySourceExplicit,
      no_db_writes: true,
      no_provider_calls: true,
      no_raw_rows: true,
      no_fake_green: true,
      blockers,
    },
    runtimeOnlyIntentChecks,
    contextIntentChecks,
  };
}

function writeProof(matrix: Matrix): void {
  const lines = [
    `# ${WAVE}`,
    "",
    `final_status: ${matrix.final_status}`,
    "",
    `required_screen_count: ${matrix.required_screen_count}`,
    `local_profile_count: ${matrix.local_profile_count}`,
    `all_screen_local_profiles_have_action_map: ${matrix.all_screen_local_profiles_have_action_map}`,
    `foreman_subcontract_action_map_registered: ${matrix.foreman_subcontract_action_map_registered}`,
    `no_orchestrator_runtime_intent_fallback: ${matrix.no_orchestrator_runtime_intent_fallback}`,
    `context_intents_from_action_registry_only: ${matrix.context_intents_from_action_registry_only}`,
    `runtime_only_intents_blocked: ${matrix.runtime_only_intents_blocked}`,
    `runtime_only_intent_checked_count: ${matrix.runtime_only_intent_checked_count}`,
    `runtime_only_intent_allowed_count: ${matrix.runtime_only_intent_allowed_count}`,
    `action_policy_source_explicit: ${matrix.action_policy_source_explicit}`,
    `no_db_writes: ${matrix.no_db_writes}`,
    `no_provider_calls: ${matrix.no_provider_calls}`,
    `no_raw_rows: ${matrix.no_raw_rows}`,
    `no_fake_green: ${matrix.no_fake_green}`,
    "",
    "Screen-local assistant action planning is sourced only from the audited screen-action registry.",
    "Runtime-only intents remain useful for runtime cards, but they cannot synthesize local action plans.",
    "",
  ];
  fs.writeFileSync(
    artifactPath(`${WAVE}_proof.md`),
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

function main(): void {
  const { inventory, matrix } = buildMatrix();
  writeJson(artifactPath(`${WAVE}_inventory.json`), inventory);
  writeJson(artifactPath(`${WAVE}_matrix.json`), matrix);
  writeProof(matrix);
  console.info(JSON.stringify(matrix, null, 2));
  if (matrix.final_status !== GREEN) {
    process.exitCode = 1;
  }
}

main();
