import {
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../screenAudit/aiScreenButtonRoleActionRegistry";
import type { AiScreenButtonActionKind } from "../screenAudit/aiScreenButtonRoleActionTypes";
import { getAiBffRouteCoverageEntry } from "../bffCoverage/aiBffRouteCoverageRegistry";
import {
  AI_ROLE_MAGIC_REQUIRED_ROLE_IDS,
  getAiRoleMagicBlueprint,
  listAiRoleMagicBlueprints,
} from "./aiRoleMagicBlueprintRegistry";
import type { AiRoleMagicRoleId } from "./aiRoleMagicBlueprintTypes";

export type AiRoleMagicButtonActionPlan = {
  roleId: AiRoleMagicRoleId;
  screenId: string;
  actionId: string;
  label: string;
  actionKind: AiScreenButtonActionKind;
  routeDisposition: "covered" | "documented_missing" | "forbidden_no_route_allowed";
  mountedRoutes: readonly string[];
  documentedMissingRoutes: readonly string[];
  forbiddenRouteSentinels: readonly string[];
  userFacingBlockedReason: string | null;
  approvalRequired: boolean;
};

export type AiRoleMagicButtonCoveragePlan = {
  roleId: AiRoleMagicRoleId;
  actions: readonly AiRoleMagicButtonActionPlan[];
  missingActionIds: readonly string[];
  safeReadActions: number;
  draftOnlyActions: number;
  approvalRequiredActions: number;
  forbiddenActions: number;
};

function plannedActionIdsForScreen(screen: {
  safeReadActions: readonly string[];
  draftOnlyActions: readonly string[];
  approvalRequiredActions: readonly string[];
  forbiddenActions: readonly string[];
}): string[] {
  return [
    ...screen.safeReadActions,
    ...screen.draftOnlyActions,
    ...screen.approvalRequiredActions,
    ...screen.forbiddenActions,
  ].sort();
}

function routeDisposition(params: {
  actionKind: AiScreenButtonActionKind;
  mountedRoutes: readonly string[];
  documentedMissingRoutes: readonly string[];
  forbiddenRouteSentinels: readonly string[];
}): AiRoleMagicButtonActionPlan["routeDisposition"] {
  if (params.actionKind === "forbidden" || params.forbiddenRouteSentinels.length > 0) {
    return "forbidden_no_route_allowed";
  }
  if (params.mountedRoutes.length === 0 || params.documentedMissingRoutes.length > 0) {
    return "documented_missing";
  }
  return "covered";
}

export function buildAiRoleMagicButtonCoveragePlan(roleId: AiRoleMagicRoleId): AiRoleMagicButtonCoveragePlan {
  const blueprint = getAiRoleMagicBlueprint(roleId);
  if (!blueprint) {
    return {
      roleId,
      actions: [],
      missingActionIds: [`role_missing:${roleId}`],
      safeReadActions: 0,
      draftOnlyActions: 0,
      approvalRequiredActions: 0,
      forbiddenActions: 0,
    };
  }

  const actions: AiRoleMagicButtonActionPlan[] = [];
  const missingActionIds: string[] = [];

  for (const screen of blueprint.screenCoverage) {
    const auditedEntries = listAiScreenButtonRoleActionEntriesForScreen(screen.screenId);
    const auditedByActionId = new Map(auditedEntries.map((entry) => [entry.actionId, entry]));
    for (const actionId of plannedActionIdsForScreen(screen)) {
      const auditEntry = auditedByActionId.get(actionId);
      if (!auditEntry) {
        missingActionIds.push(`${screen.screenId}:${actionId}`);
        continue;
      }

      const bff = getAiBffRouteCoverageEntry(actionId);
      const mountedRoutes = bff?.mountedBffRoutes ?? auditEntry.existingBffRoutes;
      const documentedMissingRoutes = bff?.documentedMissingBffRoutes ?? auditEntry.missingBffRoutes.filter((route) => !route.startsWith("NO_ROUTE_ALLOWED:"));
      const forbiddenRouteSentinels = bff?.forbiddenRouteSentinels ?? auditEntry.missingBffRoutes.filter((route) => route.startsWith("NO_ROUTE_ALLOWED:"));

      actions.push({
        roleId,
        screenId: screen.screenId,
        actionId,
        label: auditEntry.label,
        actionKind: auditEntry.actionKind,
        routeDisposition: routeDisposition({
          actionKind: auditEntry.actionKind,
          mountedRoutes,
          documentedMissingRoutes,
          forbiddenRouteSentinels,
        }),
        mountedRoutes,
        documentedMissingRoutes,
        forbiddenRouteSentinels,
        userFacingBlockedReason: auditEntry.actionKind === "forbidden" ? auditEntry.forbiddenReason ?? null : null,
        approvalRequired: auditEntry.actionKind === "approval_required",
      });
    }
  }

  return {
    roleId,
    actions,
    missingActionIds,
    safeReadActions: actions.filter((action) => action.actionKind === "safe_read").length,
    draftOnlyActions: actions.filter((action) => action.actionKind === "draft_only").length,
    approvalRequiredActions: actions.filter((action) => action.actionKind === "approval_required").length,
    forbiddenActions: actions.filter((action) => action.actionKind === "forbidden").length,
  };
}

export function listAiRoleMagicButtonCoveragePlans(): AiRoleMagicButtonCoveragePlan[] {
  return AI_ROLE_MAGIC_REQUIRED_ROLE_IDS.map(buildAiRoleMagicButtonCoveragePlan);
}

export function listAiRoleMagicBlueprintButtonLabels(): string[] {
  return listAiRoleMagicBlueprints()
    .flatMap((blueprint) => blueprint.screenCoverage.flatMap((screen) => screen.buttonsThatMustWork))
    .sort();
}
