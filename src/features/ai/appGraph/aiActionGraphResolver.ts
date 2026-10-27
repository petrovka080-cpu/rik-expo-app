import { getAiButtonActionEntry, listAiButtonActionEntriesForScreen } from "./aiButtonActionRegistry";
import {
  buildAiButtonActionEvidence,
  buildAiScreenActionEvidence,
  hasAiActionGraphEvidence,
  toAiActionGraphEvidenceIds,
} from "./aiActionGraphEvidence";
import { getAiScreenActionEntry } from "./aiScreenActionRegistry";
import type {
  AiActionGraphBlockedReason,
  AiActionGraphResolveInput,
  AiActionGraphResolveResult,
  AiAppGraphActionDto,
  AiAppGraphScreenDto,
  AiButtonActionEntry,
  AiScreenActionEntry,
} from "./aiAppActionTypes";

function blockedResult(params: {
  input: AiActionGraphResolveInput;
  screen: AiScreenActionEntry | null;
  button: AiButtonActionEntry | null;
  evidenceRefs?: readonly string[];
  blockedReason: AiActionGraphBlockedReason;
  reason: string;
}): AiActionGraphResolveResult {
  return {
    status: "blocked",
    role: params.input.role,
    screenId: params.input.screenId,
    buttonId: params.input.buttonId ?? null,
    screen: params.screen,
    button: params.button,
    domain: params.button?.domain ?? params.screen?.domain ?? "unknown",
    intent: params.button?.intent ?? null,
    riskLevel: params.button?.riskLevel ?? "forbidden",
    evidenceRefs: params.evidenceRefs ?? [],
    approvalRequired: params.button?.approvalRequired ?? false,
    directExecutionAllowed: false,
    mutationCount: 0,
    providerCalled: false,
    dbAccessedDirectly: false,
    rawRowsExposed: false,
    rawPromptStored: false,
    reason: params.reason,
    blockedReason: params.blockedReason,
  };
}

function roleAllowed(role: string, roles: readonly string[]): boolean {
  return role !== "unknown" && roles.includes(role);
}

export function resolveAiActionGraph(input: AiActionGraphResolveInput): AiActionGraphResolveResult {
  if (input.role === "unknown") {
    return blockedResult({
      input,
      screen: null,
      button: null,
      blockedReason: "unknown_role",
      reason: "Unknown AI role is denied by default.",
    });
  }

  const screen = getAiScreenActionEntry(input.screenId);
  if (!screen) {
    return blockedResult({
      input,
      screen: null,
      button: null,
      blockedReason: "unknown_screen",
      reason: "AI screen is not registered in the app action graph.",
    });
  }

  const screenEvidence = toAiActionGraphEvidenceIds(buildAiScreenActionEvidence(screen));
  if (!roleAllowed(input.role, screen.allowedRoles)) {
    return blockedResult({
      input,
      screen,
      button: null,
      evidenceRefs: screenEvidence,
      blockedReason: "screen_role_denied",
      reason: "AI role cannot use this screen action graph.",
    });
  }

  if (!input.buttonId) {
    return {
      status: "allowed",
      role: input.role,
      screenId: input.screenId,
      buttonId: null,
      screen,
      button: null,
      domain: screen.domain,
      intent: null,
      riskLevel: screen.approvalBoundary === "none" ? "safe_read" : screen.approvalBoundary,
      evidenceRefs: screenEvidence,
      approvalRequired: screen.approvalBoundary === "approval_required",
      directExecutionAllowed: false,
      mutationCount: 0,
      providerCalled: false,
      dbAccessedDirectly: false,
      rawRowsExposed: false,
      rawPromptStored: false,
      reason: "Screen action graph resolved inside role and evidence policy.",
      blockedReason: null,
    };
  }

  const button = getAiButtonActionEntry(input.buttonId);
  if (!button) {
    return blockedResult({
      input,
      screen,
      button: null,
      evidenceRefs: screenEvidence,
      blockedReason: "unknown_button",
      reason: "AI button is not registered in the app action graph.",
    });
  }

  const evidenceRefs = [
    ...screenEvidence,
    ...toAiActionGraphEvidenceIds(buildAiButtonActionEvidence(button)),
    ...(input.evidenceRefs ?? []),
  ];

  if (button.screenId !== screen.screenId) {
    return blockedResult({
      input,
      screen,
      button,
      evidenceRefs,
      blockedReason: "button_screen_mismatch",
      reason: "AI button does not belong to the requested screen.",
    });
  }

  if (button.riskLevel === "forbidden") {
    return blockedResult({
      input,
      screen,
      button,
      evidenceRefs,
      blockedReason: "forbidden_action",
      reason: "AI action is forbidden and has no tool execution path.",
    });
  }

  if (!roleAllowed(input.role, button.allowedRoles)) {
    return blockedResult({
      input,
      screen,
      button,
      evidenceRefs,
      blockedReason: "button_role_denied",
      reason: "AI role cannot use this button action.",
    });
  }

  if (button.evidenceRequired && !hasAiActionGraphEvidence(evidenceRefs)) {
    return blockedResult({
      input,
      screen,
      button,
      evidenceRefs,
      blockedReason: "missing_evidence",
      reason: "AI action requires evidence before it can be planned.",
    });
  }

  return {
    status: "allowed",
    role: input.role,
    screenId: input.screenId,
    buttonId: input.buttonId,
    screen,
    button,
    domain: button.domain,
    intent: button.intent,
    riskLevel: button.riskLevel,
    evidenceRefs,
    approvalRequired: button.approvalRequired,
    directExecutionAllowed: false,
    mutationCount: 0,
    providerCalled: false,
    dbAccessedDirectly: false,
    rawRowsExposed: false,
    rawPromptStored: false,
    reason: "Button action graph resolved inside role, risk, and evidence policy.",
    blockedReason: null,
  };
}

export function getAiAppGraphScreenDto(params: {
  role: AiActionGraphResolveInput["role"];
  screenId: string;
}): AiAppGraphScreenDto | null {
  const decision = resolveAiActionGraph({
    role: params.role,
    screenId: params.screenId,
  });
  if (decision.status !== "allowed" || !decision.screen) return null;
  return {
    screen: decision.screen,
    buttons: listAiButtonActionEntriesForScreen(params.screenId).filter((button) =>
      roleAllowed(params.role, button.allowedRoles),
    ),
    evidenceRefs: decision.evidenceRefs,
    mutationCount: 0,
    readOnly: true,
  };
}

export function getAiAppGraphActionDto(params: {
  role: AiActionGraphResolveInput["role"];
  screenId: string;
  buttonId: string;
}): AiAppGraphActionDto | null {
  const decision = resolveAiActionGraph(params);
  if (decision.status !== "allowed" || !decision.button) return null;
  return {
    action: decision.button,
    evidenceRefs: decision.evidenceRefs,
    mutationCount: 0,
    readOnly: true,
  };
}
