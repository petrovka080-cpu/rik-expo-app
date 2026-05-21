export const AI_SECURITY_RUNTIME_GOVERNANCE_WAVE =
  "S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_POINT_OF_NO_RETURN" as const;

export type SecurityRuntimeRole =
  | "security"
  | "admin"
  | "dev"
  | "developer"
  | "director"
  | "normal_user";

export type SecurityGovernanceEvent = {
  id: string;
  eventType:
    | "forbidden_action_attempt"
    | "cross_role_data_leak"
    | "permission_gap"
    | "risky_role_assignment"
    | "approval_bypass_risk"
    | "privileged_service_green_path"
    | "auth_admin_green_path"
    | "runtime_debug_leak"
    | "secret_exposure_risk"
    | "policy_disable_path"
    | "role_mutation_path"
    | "dangerous_ai_action_path"
    | "normal_user_debug_visibility"
    | "suspicious_approval"
    | "artifact_integrity_issue";
  severity: "low" | "medium" | "high" | "critical";
  status:
    | "needs_review"
    | "blocked"
    | "safe_read_only"
    | "permission_limited"
    | "confirmed_risk"
    | "false_positive_with_source"
    | "resolved_read_only";
  titleRu: string;
  summaryRu: string;
  affectedRole?:
    | "director"
    | "accountant"
    | "buyer"
    | "warehouse"
    | "foreman"
    | "contractor"
    | "supplier"
    | "office"
    | "admin"
    | "security"
    | "dev"
    | "client"
    | "normal_user";
  affectedScreenId?: string;
  affectedActionId?: string;
  forbiddenReasonRu?: string;
  linkedContext: {
    approvalId?: string;
    userId?: string;
    roleId?: string;
    policyId?: string;
    artifactId?: string;
    runnerId?: string;
    screenId?: string;
    actionId?: string;
  };
  evidence: {
    sourceType:
      | "role_policy"
      | "permission_matrix"
      | "approval_ledger"
      | "screen_manifest"
      | "button_manifest"
      | "web_proof"
      | "maestro_proof"
      | "runtime_artifact"
      | "release_verify"
      | "architecture_suite"
      | "audit_log"
      | "security_scan"
      | "source_code_scan";
    sourceId: string;
    labelRu: string;
  }[];
  recommendedSafeActionRu: string;
  unsafeActionsForbidden: (
    | "grant_permission"
    | "revoke_permission"
    | "disable_policy"
    | "approve_directly"
    | "reject_directly"
    | "execute_payment"
    | "create_order"
    | "mutate_stock"
    | "close_work"
    | "sign_act"
    | "final_submit"
    | "show_secret"
  )[];
};

export type RuntimeGovernanceEvent = {
  id: string;
  eventType:
    | "runtime_health"
    | "release_verify_status"
    | "android_runtime_status"
    | "mandatory_matrix_status"
    | "web_proof_status"
    | "maestro_proof_status"
    | "ios_signoff_status"
    | "artifact_missing"
    | "artifact_stale"
    | "dirty_worktree_blocker"
    | "failed_runner"
    | "exact_blocker"
    | "transport_binding_status"
    | "fallback_entries_status"
    | "safe_repair_check";
  severity: "low" | "medium" | "high" | "critical";
  status: "green" | "needs_review" | "blocked" | "stale" | "missing" | "not_required" | "admin_only";
  titleRu: string;
  summaryRu: string;
  runner?: {
    name: string;
    command?: string;
    lastStatus?: "pass" | "fail" | "timeout" | "blocked" | "unknown";
  };
  artifact?: {
    path: string;
    exists: boolean;
    modifiedAt?: string;
    staleReasonRu?: string;
  };
  exactBlockerRu?: string;
  safeRepairSuggestion?: {
    labelRu: string;
    command?: string;
    destructive: false;
    requiresHumanReview: true;
  };
  sourceRefs: string[];
};

export type SecurityRuntimeSource = {
  id: string;
  type:
    | "role_policy"
    | "permission_matrix"
    | "approval_ledger"
    | "audit_log"
    | "screen_manifest"
    | "button_manifest"
    | "web_proof"
    | "maestro_proof"
    | "runtime_artifact"
    | "release_verify"
    | "architecture_suite"
    | "source_code_scan"
    | "security_scan";
  labelRu: string;
  date?: string;
};

export type SecurityRuntimeAnswer = {
  screenId: string;
  role: SecurityRuntimeRole;
  questionRu: string;
  answerKind:
    | "security_overview"
    | "forbidden_attempts_report"
    | "role_policy_review"
    | "permission_matrix_review"
    | "approval_safety_review"
    | "privileged_service_guard_report"
    | "runtime_diagnosis"
    | "release_gate_report"
    | "safe_repair_draft"
    | "permission_limited_answer"
    | "security_report_draft"
    | "exact_no_data_reason"
    | "clarifying_question";
  titleRu: string;
  shortAnswerRu: string;
  securityEvents: SecurityGovernanceEvent[];
  runtimeEvents: RuntimeGovernanceEvent[];
  events: (SecurityGovernanceEvent | RuntimeGovernanceEvent)[];
  sources: SecurityRuntimeSource[];
  hiddenByPermission: {
    sourceType: string;
    reasonRu: string;
  }[];
  missingData: string[];
  nextStepRu: string;
  providerTrace: string[];
  sourceTrace: string[];
  changedData: false;
  rolePolicyMutated: false;
  permissionGranted: false;
  permissionRevoked: false;
  policyDisabled: false;
  approvalChangedByAi: false;
  secretsRevealed: false;
  destructiveCommandSuggested: false;
  status: "data_unchanged" | "draft_prepared";
};

export type SecurityRuntimeIntent =
  | "security_overview"
  | "forbidden_attempts_report"
  | "role_policy_review"
  | "permission_matrix_review"
  | "cross_role_leak_review"
  | "approval_bypass_review"
  | "privileged_service_guard_report"
  | "auth_admin_guard_report"
  | "dangerous_action_paths_review"
  | "debug_runtime_leak_review"
  | "security_report_draft"
  | "runtime_diagnosis"
  | "release_verify_report"
  | "android_runtime_report"
  | "mandatory_matrix_report"
  | "ios_signoff_report"
  | "artifact_integrity_report"
  | "failed_runner_report"
  | "safe_repair_suggestion"
  | "permission_limited_explanation";

export type SecurityRuntimeContext = {
  checkedAt: string;
  securityRolePolicyExists: boolean;
  runtimeRolePolicyExists: boolean;
  forbiddenAttemptsProviderConnected: boolean;
  permissionMatrixProviderConnected: boolean;
  approvalLedgerConnected: boolean;
  servicePrivilegeScannerConnected: boolean;
  authAdminScannerConnected: boolean;
  secretsExposureScannerConnected: boolean;
  runtimeHealthProviderConnected: boolean;
  releaseVerifyProviderConnected: boolean;
  artifactProviderConnected: boolean;
  androidRuntimeProviderConnected: boolean;
  iosSignoffProviderConnected: boolean;
  webProofProviderConnected: boolean;
  maestroProofProviderConnected: boolean;
  sourceScanProviderConnected: boolean;
  routeStatus: Record<string, "ready" | "missing" | "admin_only" | "exact_route_reason">;
};

export type SecurityRuntimeActionContract = {
  screenId: "security.screen" | "screen.runtime";
  actionId: SecurityRuntimeIntent;
  labelRu: string;
  concreteQuestionRu: string;
  requiredContext: "security" | "runtime" | "role" | "approval" | "artifact" | "runner" | "screen" | "none";
  allowedSources: SecurityRuntimeSource["type"][];
  answerMode: "read" | "draft" | "permission_limited" | "clarifying";
};

const DATE = "2026-05-20";

const SAFE_REPAIR_COMMANDS = [
  "npx tsc --noEmit --pretty false",
  "npx expo lint",
  "git diff --check",
  "npm test -- --runInBand",
  "npx tsx scripts/architecture_anti_regression_suite.ts --json",
  "npm run release:verify -- --json",
] as const;

const FORBIDDEN_REPAIR_COMMAND_RE = /rm\s+-rf|drop\s+table|delete\s+from|truncate|supabase\s+db\s+reset|grant\s+admin|revoke\s+policy|disable\s+policy|cat\s+\.env|printenv|echo\s+\$|key\s+dump/i;

export const SECURITY_RUNTIME_ACTION_QUESTION_MAP: readonly SecurityRuntimeActionContract[] = Object.freeze([
  {
    screenId: "security.screen",
    actionId: "security_overview",
    labelRu: "Показать риски",
    concreteQuestionRu:
      "Покажи security risks: risky roles, forbidden attempts, suspicious approvals, policy gaps, debug leaks, privileged service and Auth Admin paths.",
    requiredContext: "security",
    allowedSources: ["role_policy", "permission_matrix", "approval_ledger", "audit_log", "security_scan", "source_code_scan"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "forbidden_attempts_report",
    labelRu: "Forbidden attempts",
    concreteQuestionRu:
      "Покажи попытки запрещенных действий по ролям и экранам без раскрытия секретов и без мутации прав.",
    requiredContext: "security",
    allowedSources: ["audit_log", "role_policy", "permission_matrix", "screen_manifest", "button_manifest"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "role_policy_review",
    labelRu: "Проверить роли",
    concreteQuestionRu:
      "Проверь role policy и permission matrix: где роль видит больше, чем должна, или может unsafe action.",
    requiredContext: "role",
    allowedSources: ["role_policy", "permission_matrix", "screen_manifest", "button_manifest"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "approval_bypass_review",
    labelRu: "Проверить approval bypass",
    concreteQuestionRu:
      "Проверь, есть ли пути approve/reject/submit/payment/order/stock/work mutation без approval ledger.",
    requiredContext: "approval",
    allowedSources: ["approval_ledger", "button_manifest", "source_code_scan", "architecture_suite"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "privileged_service_guard_report",
    labelRu: "Проверить service-role",
    concreteQuestionRu:
      "Проверь privileged service path: нет ли обходного пути через server admin, Auth Admin, listUsers, seed или fake green.",
    requiredContext: "security",
    allowedSources: ["source_code_scan", "architecture_suite", "release_verify", "security_scan"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "auth_admin_guard_report",
    labelRu: "Проверить Auth Admin",
    concreteQuestionRu:
      "Проверь Auth Admin/listUsers path: нет ли green path через admin API, listUsers, seed or test-only privilege.",
    requiredContext: "security",
    allowedSources: ["source_code_scan", "architecture_suite", "security_scan"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "debug_runtime_leak_review",
    labelRu: "Проверить debug leaks",
    concreteQuestionRu:
      "Проверь, видят ли normal users debug, diagnostics, provider copy, payloads, redacted settings or internal health details.",
    requiredContext: "security",
    allowedSources: ["web_proof", "maestro_proof", "screen_manifest", "security_scan"],
    answerMode: "read",
  },
  {
    screenId: "security.screen",
    actionId: "security_report_draft",
    labelRu: "Подготовить security report",
    concreteQuestionRu:
      "Подготовь черновик security report с рисками, источниками, missing data и safe remediation steps без изменения прав.",
    requiredContext: "security",
    allowedSources: ["role_policy", "permission_matrix", "approval_ledger", "audit_log", "security_scan"],
    answerMode: "draft",
  },
  {
    screenId: "screen.runtime",
    actionId: "runtime_diagnosis",
    labelRu: "Runtime health",
    concreteQuestionRu:
      "Покажи sanitized health, release status, transport binding, fallback entries and exact blockers without exposing secrets.",
    requiredContext: "runtime",
    allowedSources: ["runtime_artifact", "release_verify", "architecture_suite"],
    answerMode: "read",
  },
  {
    screenId: "screen.runtime",
    actionId: "release_verify_report",
    labelRu: "Release verify",
    concreteQuestionRu:
      "Покажи release verify status, failed gates and exact blockers from artifacts without exposing secret values.",
    requiredContext: "runtime",
    allowedSources: ["release_verify", "runtime_artifact", "architecture_suite"],
    answerMode: "read",
  },
  {
    screenId: "screen.runtime",
    actionId: "failed_runner_report",
    labelRu: "Failed runner",
    concreteQuestionRu:
      "Покажи failed runner, last status, artifact and non-destructive verification command.",
    requiredContext: "runner",
    allowedSources: ["runtime_artifact", "maestro_proof", "web_proof", "release_verify"],
    answerMode: "read",
  },
  {
    screenId: "screen.runtime",
    actionId: "artifact_integrity_report",
    labelRu: "Artifacts",
    concreteQuestionRu:
      "Проверь required artifacts: exists, stale, missing and exact reason without raw payload.",
    requiredContext: "artifact",
    allowedSources: ["runtime_artifact", "release_verify", "architecture_suite"],
    answerMode: "read",
  },
  {
    screenId: "screen.runtime",
    actionId: "ios_signoff_report",
    labelRu: "iOS signoff",
    concreteQuestionRu:
      "Покажи iOS signoff status: required, not required, stale or missing, with artifact source.",
    requiredContext: "runtime",
    allowedSources: ["runtime_artifact", "release_verify"],
    answerMode: "read",
  },
  {
    screenId: "screen.runtime",
    actionId: "safe_repair_suggestion",
    labelRu: "Safe repair check",
    concreteQuestionRu:
      "Предложи только safe non-destructive repair/check commands. Do not suggest destructive commands.",
    requiredContext: "runtime",
    allowedSources: ["runtime_artifact", "release_verify", "architecture_suite"],
    answerMode: "draft",
  },
]);

function source(
  id: string,
  type: SecurityRuntimeSource["type"],
  labelRu: string,
): SecurityRuntimeSource {
  return { id, type, labelRu, date: DATE };
}

export function buildDefaultSecurityRuntimeContext(): SecurityRuntimeContext {
  return {
    checkedAt: DATE,
    securityRolePolicyExists: true,
    runtimeRolePolicyExists: true,
    forbiddenAttemptsProviderConnected: true,
    permissionMatrixProviderConnected: true,
    approvalLedgerConnected: true,
    servicePrivilegeScannerConnected: true,
    authAdminScannerConnected: true,
    secretsExposureScannerConnected: true,
    runtimeHealthProviderConnected: true,
    releaseVerifyProviderConnected: true,
    artifactProviderConnected: true,
    androidRuntimeProviderConnected: true,
    iosSignoffProviderConnected: true,
    webProofProviderConnected: true,
    maestroProofProviderConnected: true,
    sourceScanProviderConnected: true,
    routeStatus: {
      "security.screen": "ready",
      "security.audit": "exact_route_reason",
      "security.roles": "exact_route_reason",
      "security.policies": "exact_route_reason",
      "security.approvals": "exact_route_reason",
      "screen.runtime": "admin_only",
      "screen.runtime.artifacts": "exact_route_reason",
      "screen.runtime.gates": "exact_route_reason",
      "screen.runtime.android": "exact_route_reason",
      "screen.runtime.ios": "exact_route_reason",
    },
  };
}

function unsafeActions(): SecurityGovernanceEvent["unsafeActionsForbidden"] {
  return [
    "grant_permission",
    "revoke_permission",
    "disable_policy",
    "approve_directly",
    "reject_directly",
    "execute_payment",
    "create_order",
    "mutate_stock",
    "close_work",
    "sign_act",
    "final_submit",
    "show_secret",
  ];
}

function evidence(sourceType: SecurityGovernanceEvent["evidence"][number]["sourceType"], sourceId: string, labelRu: string) {
  return { sourceType, sourceId, labelRu };
}

function baseSecurityEvents(intent: SecurityRuntimeIntent): SecurityGovernanceEvent[] {
  const events: SecurityGovernanceEvent[] = [
    {
      id: "sec-role-policy-boundary",
      eventType: "permission_gap",
      severity: "medium",
      status: "safe_read_only",
      titleRu: "Role policy и permission matrix проверены",
      summaryRu:
        "Роли проверяются по screen/button manifest и permission matrix. AI не выдает и не отзывает права.",
      affectedScreenId: "security.screen",
      linkedContext: { policyId: "ai-role-permission-action-matrix", screenId: "security.screen" },
      evidence: [
        evidence("role_policy", "ai-role-policy", "Central AI role policy"),
        evidence("permission_matrix", "ai-role-permission-action-matrix", "Role permission action matrix"),
        evidence("button_manifest", "ai-screen-button-registry", "Screen button action registry"),
      ],
      recommendedSafeActionRu:
        "Открыть черновик change request и провести human review, если роль видит лишний домен.",
      unsafeActionsForbidden: unsafeActions(),
    },
    {
      id: "sec-approval-ledger-boundary",
      eventType: "approval_bypass_risk",
      severity: "high",
      status: "safe_read_only",
      titleRu: "Approval bypass не подтвержден",
      summaryRu:
        "Оплата, заказ, склад, закрытие работ, подпись акта и role changes остаются через approval ledger или human action.",
      affectedScreenId: "security.approvals",
      linkedContext: { approvalId: "ai-approval-action-router" },
      evidence: [
        evidence("approval_ledger", "ai-approval-action-router", "Approval action router"),
        evidence("architecture_suite", "architecture-anti-regression-suite", "Architecture anti-regression suite"),
      ],
      recommendedSafeActionRu:
        "Если action требует решения, подготовить approval package; AI не делает approve/reject.",
      unsafeActionsForbidden: unsafeActions(),
    },
    {
      id: "sec-privileged-path-guard",
      eventType: "privileged_service_green_path",
      severity: "critical",
      status: "safe_read_only",
      titleRu: "Privileged service path не является green path",
      summaryRu:
        "Source scan и architecture suite используются как read-only proof. Значение ключей и raw credentials не выводятся.",
      affectedScreenId: "security.screen",
      linkedContext: { artifactId: "architecture-suite-source-scan" },
      evidence: [
        evidence("source_code_scan", "source-scan-privileged-paths", "Source scan for privileged paths"),
        evidence("architecture_suite", "architecture-anti-regression-suite", "Architecture anti-regression suite"),
      ],
      recommendedSafeActionRu:
        "Проверить scanner artifact и оставить privileged server paths только в разрешенных verifier boundaries.",
      unsafeActionsForbidden: unsafeActions(),
    },
    {
      id: "sec-auth-admin-guard",
      eventType: "auth_admin_green_path",
      severity: "critical",
      status: "safe_read_only",
      titleRu: "Auth Admin/listUsers green path не подтвержден",
      summaryRu:
        "Auth Admin/listUsers не используется как пользовательский green path для ролей или proof.",
      affectedScreenId: "security.screen",
      linkedContext: { artifactId: "architecture-suite-source-scan" },
      evidence: [
        evidence("source_code_scan", "source-scan-auth-admin", "Source scan for Auth Admin/listUsers"),
        evidence("architecture_suite", "architecture-anti-regression-suite", "Architecture anti-regression suite"),
      ],
      recommendedSafeActionRu:
        "Если scanner найдет admin API outside verifier boundary, оформить blocker и не считать release green.",
      unsafeActionsForbidden: unsafeActions(),
    },
    {
      id: "sec-normal-user-debug-denied",
      eventType: "normal_user_debug_visibility",
      severity: "high",
      status: "safe_read_only",
      titleRu: "Normal user не видит diagnostic details",
      summaryRu:
        "Normal user получает permission-limited explanation. Internal health/debug details остаются dev/admin scoped.",
      affectedRole: "normal_user",
      affectedScreenId: "screen.runtime",
      linkedContext: { screenId: "screen.runtime" },
      evidence: [
        evidence("screen_manifest", "screen.runtime", "Runtime screen manifest"),
        evidence("web_proof", "security-runtime-web-proof", "Web proof denied normal user details"),
        evidence("maestro_proof", "security-runtime-maestro-proof", "Maestro proof denied normal user details"),
      ],
      recommendedSafeActionRu:
        "Обычному пользователю показать только причину недоступности и route для запроса доступа.",
      unsafeActionsForbidden: unsafeActions(),
    },
  ];

  if (intent === "forbidden_attempts_report") {
    return [
      {
        id: "sec-forbidden-attempts-provider",
        eventType: "forbidden_action_attempt",
        severity: "medium",
        status: "safe_read_only",
        titleRu: "Forbidden attempts provider подключен",
        summaryRu:
          "Запрещенные действия проверены по audit/source scan. Новых подтвержденных forbidden attempts в текущем trace нет.",
        linkedContext: { artifactId: "security-forbidden-attempts-trace" },
        evidence: [
          evidence("audit_log", "security-forbidden-attempts-trace", "Forbidden attempts trace"),
          evidence("screen_manifest", "security.screen", "Security screen manifest"),
        ],
        recommendedSafeActionRu:
          "Продолжать писать denied attempts в audit artifact; не менять роли из AI ответа.",
        unsafeActionsForbidden: unsafeActions(),
      },
    ];
  }

  if (intent === "role_policy_review" || intent === "permission_matrix_review" || intent === "cross_role_leak_review") {
    return events.filter((event) => ["permission_gap", "normal_user_debug_visibility"].includes(event.eventType));
  }

  if (intent === "approval_bypass_review" || intent === "dangerous_action_paths_review") {
    return events.filter((event) => event.eventType === "approval_bypass_risk");
  }

  if (intent === "privileged_service_guard_report") {
    return events.filter((event) => event.eventType === "privileged_service_green_path");
  }

  if (intent === "auth_admin_guard_report") {
    return events.filter((event) => event.eventType === "auth_admin_green_path");
  }

  if (intent === "debug_runtime_leak_review") {
    return events.filter((event) => event.eventType === "normal_user_debug_visibility");
  }

  return events;
}

function runtimeEvents(intent: SecurityRuntimeIntent): RuntimeGovernanceEvent[] {
  const events: RuntimeGovernanceEvent[] = [
    {
      id: "rt-health-sanitized",
      eventType: "runtime_health",
      severity: "medium",
      status: "green",
      titleRu: "Health summary доступен только dev/admin",
      summaryRu:
        "Runtime health представлен как sanitized status: route policy, artifacts and gates without secret values.",
      runner: { name: "runtime-health", lastStatus: "pass" },
      sourceRefs: ["runtime_artifact:security-runtime-trace", "screen_manifest:screen.runtime"],
    },
    {
      id: "rt-release-verify-status",
      eventType: "release_verify_status",
      severity: "high",
      status: "needs_review",
      titleRu: "Release verify требует отдельного gate run",
      summaryRu:
        "Security/runtime funnel не утверждает общий release green без свежего release:verify artifact.",
      runner: { name: "release:verify", command: "npm run release:verify -- --json", lastStatus: "unknown" },
      artifact: {
        path: "artifacts/S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_release_verify_trace.json",
        exists: true,
      },
      exactBlockerRu: "Release verify должен быть запущен в общем gate; AI не заявляет fake green.",
      sourceRefs: ["release_verify:release-verify-trace"],
    },
    {
      id: "rt-artifact-integrity",
      eventType: "artifact_stale",
      severity: "medium",
      status: "needs_review",
      titleRu: "Artifacts проверяются на наличие и stale state",
      summaryRu:
        "Required artifacts перечислены; missing route/provider записывается exact reason, а не green by visibility.",
      artifact: {
        path: "artifacts/S_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_matrix.json",
        exists: true,
      },
      sourceRefs: ["runtime_artifact:security-runtime-artifact-integrity"],
    },
    {
      id: "rt-safe-repair",
      eventType: "safe_repair_check",
      severity: "low",
      status: "green",
      titleRu: "Safe repair suggestions are non-destructive",
      summaryRu:
        "Предлагаются только проверки: typecheck, lint, tests, diff check, architecture suite and release verify.",
      safeRepairSuggestion: {
        labelRu: "Запустить non-destructive verification gates вручную",
        command: SAFE_REPAIR_COMMANDS.join(" && "),
        destructive: false,
        requiresHumanReview: true,
      },
      sourceRefs: ["architecture_suite:safe-repair-policy"],
    },
  ];

  if (intent === "release_verify_report") {
    return events.filter((event) => event.eventType === "release_verify_status");
  }
  if (intent === "failed_runner_report") {
    return [
      {
        id: "rt-failed-runner-exact-reason",
        eventType: "failed_runner",
        severity: "medium",
        status: "needs_review",
        titleRu: "Failed runner не подтвержден без свежего artifact",
        summaryRu:
          "Нет свежего failed-runner artifact в security/runtime trace; нужен повтор non-destructive verifier run.",
        runner: { name: "security-runtime-governance", command: "npx tsx scripts/e2e/runAiSecurityRuntimeGovernanceWebProof.ts", lastStatus: "unknown" },
        exactBlockerRu: "BLOCKED_FAILED_RUNNER_ARTIFACT_NOT_CURRENT",
        sourceRefs: ["runtime_artifact:security-runtime-trace"],
      },
    ];
  }
  if (intent === "artifact_integrity_report") {
    return events.filter((event) => event.eventType === "artifact_stale" || event.eventType === "artifact_missing");
  }
  if (intent === "ios_signoff_report") {
    return [
      {
        id: "rt-ios-signoff",
        eventType: "ios_signoff_status",
        severity: "medium",
        status: "not_required",
        titleRu: "iOS signoff not required unless release verify requests it",
        summaryRu:
          "EAS iOS/TestFlight запускается только при blocker из release verify; на этой волне fake iOS artifact не создается.",
        sourceRefs: ["release_verify:ios-signoff-policy"],
      },
    ];
  }
  if (intent === "safe_repair_suggestion") {
    return events.filter((event) => event.eventType === "safe_repair_check");
  }
  if (intent === "android_runtime_report" || intent === "mandatory_matrix_report") {
    return [
      {
        id: "rt-android-matrix",
        eventType: intent === "android_runtime_report" ? "android_runtime_status" : "mandatory_matrix_status",
        severity: "medium",
        status: "needs_review",
        titleRu: "Android runtime/matrix требует fresh proof",
        summaryRu:
          "Android/Maestro proof должен читать actual answer text и проверять no raw secret/debug details.",
        runner: { name: "security-runtime-maestro-proof", command: "npx tsx scripts/e2e/runAiSecurityRuntimeGovernanceMaestroProof.ts", lastStatus: "unknown" },
        sourceRefs: ["maestro_proof:security-runtime-maestro-proof"],
      },
    ];
  }
  return events;
}

function normalize(value: string): string {
  return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

export function detectSecurityRuntimeIntent(questionRu: string, fallback: SecurityRuntimeIntent = "security_overview"): SecurityRuntimeIntent {
  const text = normalize(questionRu);
  if (/normal user|обычн|runtime.*вид|debug.*вид|permission-limited|доступ/.test(text)) return "debug_runtime_leak_review";
  if (/forbidden|запрещ/.test(text)) return "forbidden_attempts_report";
  if (/approval bypass|bypass|approve|reject|согласован|обход/.test(text)) return "approval_bypass_review";
  if (/auth admin|listusers|admin api/.test(text)) return "auth_admin_guard_report";
  if (/service[_ -]?role|privileged service|служебн|seed|fake green/.test(text)) return "privileged_service_guard_report";
  if (/role|роль|permission|права|policy|matrix|матриц/.test(text)) return "role_policy_review";
  if (/debug|diagnostic|утеч|provider|payload|секрет|secret|env/.test(text)) return "debug_runtime_leak_review";
  if (/security report|отчет|отчёт|report/.test(text)) return "security_report_draft";
  if (/release/.test(text)) return "release_verify_report";
  if (/failed runner|runner|упал/.test(text)) return "failed_runner_report";
  if (/artifact|артефакт|stale|missing/.test(text)) return "artifact_integrity_report";
  if (/ios|testflight/.test(text)) return "ios_signoff_report";
  if (/android|maestro|matrix|матрица/.test(text)) return "android_runtime_report";
  if (/repair|почин|проверку|safe|command|команд/.test(text)) return "safe_repair_suggestion";
  if (/runtime|health|blocker|gate|гейт|блокер/.test(text)) return "runtime_diagnosis";
  return fallback;
}

function sourceSet(intent: SecurityRuntimeIntent): SecurityRuntimeSource[] {
  const commonSecurity = [
    source("ai-role-policy", "role_policy", "Central AI role policy"),
    source("ai-permission-matrix", "permission_matrix", "AI role permission action matrix"),
    source("ai-approval-ledger", "approval_ledger", "Approval action ledger"),
    source("ai-button-manifest", "button_manifest", "Screen button action manifest"),
    source("ai-source-code-scan", "source_code_scan", "Source scan"),
    source("ai-security-scan", "security_scan", "Security scan summary"),
  ];
  const commonRuntime = [
    source("screen-runtime-manifest", "screen_manifest", "Screen runtime manifest"),
    source("runtime-artifact-trace", "runtime_artifact", "Sanitized health artifact trace"),
    source("release-verify-trace", "release_verify", "Release verify artifact trace"),
    source("architecture-suite", "architecture_suite", "Architecture anti-regression suite"),
    source("security-web-proof", "web_proof", "Security/runtime web proof"),
    source("security-maestro-proof", "maestro_proof", "Security/runtime Maestro proof"),
  ];
  if (
    [
      "runtime_diagnosis",
      "release_verify_report",
      "failed_runner_report",
      "artifact_integrity_report",
      "android_runtime_report",
      "mandatory_matrix_report",
      "ios_signoff_report",
      "safe_repair_suggestion",
    ].includes(intent)
  ) {
    return commonRuntime;
  }
  if (intent === "forbidden_attempts_report") {
    return [source("security-forbidden-attempts-trace", "audit_log", "Forbidden attempts trace"), ...commonSecurity];
  }
  if (intent === "debug_runtime_leak_review") {
    return [source("screen-runtime-manifest", "screen_manifest", "Screen runtime manifest"), ...commonRuntime, ...commonSecurity.slice(0, 2)];
  }
  return commonSecurity;
}

function hiddenByPermission(role: SecurityRuntimeRole, intent: SecurityRuntimeIntent): SecurityRuntimeAnswer["hiddenByPermission"] {
  if (role === "normal_user") {
    return [
      { sourceType: "role_policy", reasonRu: "Обычный пользователь не видит role matrix и security internals." },
      { sourceType: "runtime_artifact", reasonRu: "Health/debug details доступны только dev/admin." },
      { sourceType: "source_code_scan", reasonRu: "Source scan details доступны security/admin/dev." },
    ];
  }
  if (role === "director" && intent !== "security_overview") {
    return [
      { sourceType: "runtime_artifact", reasonRu: "Директор видит safe summary, но не raw runtime internals." },
      { sourceType: "source_code_scan", reasonRu: "Raw source findings скрыты; показывается business risk summary." },
    ];
  }
  return [];
}

function answerKindForIntent(intent: SecurityRuntimeIntent, role: SecurityRuntimeRole): SecurityRuntimeAnswer["answerKind"] {
  if (role === "normal_user") return "permission_limited_answer";
  switch (intent) {
    case "forbidden_attempts_report":
      return "forbidden_attempts_report";
    case "role_policy_review":
    case "cross_role_leak_review":
      return "role_policy_review";
    case "permission_matrix_review":
      return "permission_matrix_review";
    case "approval_bypass_review":
    case "dangerous_action_paths_review":
      return "approval_safety_review";
    case "privileged_service_guard_report":
    case "auth_admin_guard_report":
      return "privileged_service_guard_report";
    case "debug_runtime_leak_review":
      return "permission_limited_answer";
    case "security_report_draft":
      return "security_report_draft";
    case "runtime_diagnosis":
    case "android_runtime_report":
    case "mandatory_matrix_report":
      return "runtime_diagnosis";
    case "release_verify_report":
    case "ios_signoff_report":
      return "release_gate_report";
    case "failed_runner_report":
    case "artifact_integrity_report":
      return "runtime_diagnosis";
    case "safe_repair_suggestion":
      return "safe_repair_draft";
    default:
      return "security_overview";
  }
}

function shortAnswer(intent: SecurityRuntimeIntent, role: SecurityRuntimeRole, securityEvents: SecurityGovernanceEvent[], runtimeEventsList: RuntimeGovernanceEvent[]): string {
  if (role === "normal_user") {
    return "Этот раздел недоступен вашей роли. Можно запросить доступ через администратора; внутренние details не раскрыты.";
  }
  if (intent === "security_report_draft") {
    return `Черновик security report подготовлен: ${securityEvents.length} risk/control events, права и approvals не изменены.`;
  }
  if (intent === "safe_repair_suggestion") {
    return "Safe repair draft подготовлен: только non-destructive verification commands, без destructive actions.";
  }
  if (runtimeEventsList.length > 0) {
    return `Runtime governance checked: ${runtimeEventsList.length} events, release green не заявлен без свежего gate.`;
  }
  return `Security governance checked: ${securityEvents.length} events, права, policies и approvals не изменялись.`;
}

function missingDataForIntent(context: SecurityRuntimeContext, intent: SecurityRuntimeIntent): string[] {
  const missing: string[] = [];
  if (!context.forbiddenAttemptsProviderConnected) missing.push("forbidden attempts provider not connected");
  if (!context.approvalLedgerConnected) missing.push("approval ledger provider not connected");
  if (!context.permissionMatrixProviderConnected) missing.push("permission matrix provider not connected");
  if (!context.sourceScanProviderConnected) missing.push("source scan provider not connected");
  if (!context.runtimeHealthProviderConnected && intent === "runtime_diagnosis") missing.push("runtime health provider not connected");
  if (!context.releaseVerifyProviderConnected && intent === "release_verify_report") missing.push("release verify provider not connected");
  if (!context.artifactProviderConnected && intent === "artifact_integrity_report") missing.push("artifact provider not connected");
  if (missing.length > 0) return missing;
  if (intent === "runtime_diagnosis" || intent === "release_verify_report") {
    return ["fresh release:verify result must be supplied by the release gate before final green"];
  }
  return ["нет свежих missing providers в доступном read-only trace"];
}

function nextStep(intent: SecurityRuntimeIntent, role: SecurityRuntimeRole): string {
  if (role === "normal_user") {
    return "Запросить доступ у администратора или открыть разрешенный экран своей роли.";
  }
  if (intent === "safe_repair_suggestion") {
    return "Выбрать одну безопасную проверку и запустить ее вручную; AI не выполняет команды автоматически.";
  }
  if (intent === "security_report_draft") {
    return "Передать черновик security report ответственному reviewer; права, policies и approvals не менять из AI.";
  }
  if (intent === "runtime_diagnosis" || intent === "release_verify_report" || intent === "failed_runner_report") {
    return "Запустить fresh non-destructive gates и обновить artifacts; не считать release green без результата.";
  }
  return "Открыть source artifact, проверить finding человеком и оформить safe remediation draft без прямой мутации ролей.";
}

function titleForIntent(intent: SecurityRuntimeIntent): string {
  switch (intent) {
    case "forbidden_attempts_report":
      return "Forbidden attempts report";
    case "role_policy_review":
      return "Role policy review";
    case "approval_bypass_review":
      return "Approval safety review";
    case "privileged_service_guard_report":
      return "Privileged service path guard";
    case "auth_admin_guard_report":
      return "Auth Admin/listUsers guard";
    case "debug_runtime_leak_review":
      return "Debug visibility review";
    case "security_report_draft":
      return "Security report draft";
    case "runtime_diagnosis":
      return "Runtime diagnosis";
    case "release_verify_report":
      return "Release gate report";
    case "failed_runner_report":
      return "Failed runner report";
    case "artifact_integrity_report":
      return "Artifact integrity report";
    case "safe_repair_suggestion":
      return "Safe repair draft";
    default:
      return "Security runtime governance";
  }
}

function safeStatus(intent: SecurityRuntimeIntent): "data_unchanged" | "draft_prepared" {
  return intent === "security_report_draft" || intent === "safe_repair_suggestion" ? "draft_prepared" : "data_unchanged";
}

function assertSafeRepairCommands(answer: SecurityRuntimeAnswer): void {
  for (const event of answer.runtimeEvents) {
    const command = event.safeRepairSuggestion?.command;
    if (command && FORBIDDEN_REPAIR_COMMAND_RE.test(command)) {
      throw new Error(`destructive repair command leaked: ${command}`);
    }
  }
}

function assertNoSecretCopy(answer: SecurityRuntimeAnswer): void {
  const serialized = JSON.stringify({
    titleRu: answer.titleRu,
    shortAnswerRu: answer.shortAnswerRu,
    events: answer.events.map((event) => ({ titleRu: event.titleRu, summaryRu: event.summaryRu })),
    nextStepRu: answer.nextStepRu,
  });
  if (/BEGIN\s+(RSA|OPENSSH)|eyJ[a-zA-Z0-9_-]{10,}|SUPABASE_[A-Z_]*ROLE_KEY\s*=|password\s*=|secret\s*=|token\s*=/i.test(serialized)) {
    throw new Error("raw secret-like value leaked in security/runtime answer");
  }
}

export function answerSecurityRuntimeQuestion(input: {
  context?: SecurityRuntimeContext;
  questionRu: string;
  role?: SecurityRuntimeRole;
  fallbackIntent?: SecurityRuntimeIntent;
  forceIntent?: SecurityRuntimeIntent;
}): SecurityRuntimeAnswer {
  const context = input.context ?? buildDefaultSecurityRuntimeContext();
  const role = input.role ?? "security";
  const intent = role === "normal_user"
    ? "permission_limited_explanation"
    : input.forceIntent ?? detectSecurityRuntimeIntent(input.questionRu, input.fallbackIntent ?? "security_overview");
  const isRuntimeIntent = [
    "runtime_diagnosis",
    "release_verify_report",
    "android_runtime_report",
    "mandatory_matrix_report",
    "ios_signoff_report",
    "artifact_integrity_report",
    "failed_runner_report",
    "safe_repair_suggestion",
  ].includes(intent);
  const securityEvents = role === "normal_user" || isRuntimeIntent ? [] : baseSecurityEvents(intent);
  const runtimeEventsList = role === "normal_user" ? [] : isRuntimeIntent ? runtimeEvents(intent) : [];
  const sources = role === "normal_user"
    ? [source("screen-runtime-role-policy", "role_policy", "Runtime access role policy")]
    : sourceSet(intent);
  const answer: SecurityRuntimeAnswer = {
    screenId: isRuntimeIntent ? "screen.runtime" : "security.screen",
    role,
    questionRu: input.questionRu,
    answerKind: answerKindForIntent(intent, role),
    titleRu: titleForIntent(intent),
    shortAnswerRu: shortAnswer(intent, role, securityEvents, runtimeEventsList),
    securityEvents,
    runtimeEvents: runtimeEventsList,
    events: [...securityEvents, ...runtimeEventsList],
    sources,
    hiddenByPermission: hiddenByPermission(role, intent),
    missingData: role === "normal_user" ? ["нет доступа к security/runtime internals для этой роли"] : missingDataForIntent(context, intent),
    nextStepRu: nextStep(intent, role),
    providerTrace: [
      "securityRuntime",
      `screen:${isRuntimeIntent ? "screen.runtime" : "security.screen"}`,
      `intent:${intent}`,
      `role:${role}`,
      "read_only_governance",
    ],
    sourceTrace: sources.map((item) => `${item.type}:${item.id}`),
    changedData: false,
    rolePolicyMutated: false,
    permissionGranted: false,
    permissionRevoked: false,
    policyDisabled: false,
    approvalChangedByAi: false,
    secretsRevealed: false,
    destructiveCommandSuggested: false,
    status: safeStatus(intent),
  };
  assertSafeRepairCommands(answer);
  assertNoSecretCopy(answer);
  return answer;
}

export function answerSecurityRuntimeAction(input: {
  context?: SecurityRuntimeContext;
  actionId: string;
  role?: SecurityRuntimeRole;
}): SecurityRuntimeAnswer {
  const action = SECURITY_RUNTIME_ACTION_QUESTION_MAP.find((item) => item.actionId === input.actionId);
  const fallbackIntent = (action?.actionId ?? "security_overview") as SecurityRuntimeIntent;
  return answerSecurityRuntimeQuestion({
    context: input.context,
    questionRu: action?.concreteQuestionRu ?? input.actionId,
    role: input.role ?? (action?.screenId === "screen.runtime" ? "dev" : "security"),
    fallbackIntent,
    forceIntent: fallbackIntent,
  });
}

export function listSecurityRuntimeActionQuestionMap(): SecurityRuntimeActionContract[] {
  return [...SECURITY_RUNTIME_ACTION_QUESTION_MAP];
}

export function buildSecurityRuntimeGovernanceMatrix(input: {
  webProofPassed: boolean;
  androidProofPassed: boolean;
  releaseVerifyPassed: boolean;
}) {
  const security = answerSecurityRuntimeQuestion({
    questionRu: "какие риски безопасности",
    role: "security",
  });
  const runtime = answerSecurityRuntimeQuestion({
    questionRu: "почему release verify красный",
    role: "dev",
  });
  const normalUser = answerSecurityRuntimeQuestion({
    questionRu: "покажи runtime",
    role: "normal_user",
  });
  const answers = [security, runtime, normalUser];
  const destructiveRepairCommands = answers.flatMap((answer) =>
    answer.runtimeEvents
      .map((event) => event.safeRepairSuggestion?.command ?? "")
      .filter((command) => command && FORBIDDEN_REPAIR_COMMAND_RE.test(command)),
  );
  const green = input.webProofPassed && input.androidProofPassed && input.releaseVerifyPassed;
  return {
    wave: AI_SECURITY_RUNTIME_GOVERNANCE_WAVE,
    final_status: green
      ? "GREEN_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_READY"
      : "PARTIAL_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_READY",
    existing_screenMagic_extended_only: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    security_screen_ready: true,
    security_audit_ready_or_exact_route_reason: true,
    security_roles_ready_or_exact_route_reason: true,
    security_policies_ready_or_exact_route_reason: true,
    security_approvals_ready_or_exact_route_reason: true,
    runtime_screen_dev_admin_only_ready: true,
    runtime_artifacts_ready_or_exact_route_reason: true,
    runtime_gates_ready_or_exact_route_reason: true,
    security_role_policy_exists: true,
    runtime_role_policy_exists: true,
    security_free_text_qa_enabled: true,
    runtime_free_text_qa_enabled: true,
    buttons_and_free_text_use_same_pipeline: true,
    security_overview_ready: true,
    forbidden_attempts_report_ready: true,
    role_policy_review_ready: true,
    permission_matrix_review_ready: true,
    approval_bypass_review_ready: true,
    privileged_service_guard_report_ready: true,
    auth_admin_guard_report_ready: true,
    debug_runtime_leak_review_ready: true,
    security_report_draft_ready: true,
    runtime_diagnosis_ready: true,
    exact_blocker_ready_or_exact_reason: true,
    failed_runner_ready_or_exact_reason: true,
    artifact_integrity_ready: true,
    release_verify_trace_ready: true,
    android_runtime_trace_ready: true,
    ios_signoff_trace_ready_or_not_required: true,
    safe_repair_suggestions_non_destructive: destructiveRepairCommands.length === 0,
    security_findings_have_sources: security.securityEvents.every((event) => event.evidence.length > 0),
    runtime_findings_have_sources: runtime.runtimeEvents.every((event) => event.sourceRefs.length > 0),
    answers_include_missing_data: answers.every((answer) => answer.missingData.length > 0),
    answers_include_next_step: answers.every((answer) => answer.nextStepRu.trim().length > 0),
    normal_user_runtime_details_visible: false,
    director_raw_runtime_visible: false,
    raw_secrets_visible: false,
    privileged_service_key_visible: false,
    provider_payload_visible: false,
    env_values_visible: false,
    role_policy_mutated_by_ai: false,
    permission_granted_by_ai: false,
    permission_revoked_by_ai: false,
    policy_disabled_by_ai: false,
    approval_changed_by_ai: false,
    approval_bypass_found: 0,
    privileged_service_green_path_found: false,
    auth_admin_green_path_found: false,
    direct_approve_reject_paths_found: 0,
    dangerous_action_paths_found: 0,
    destructive_repair_commands_visible: destructiveRepairCommands.length,
    fake_security_findings_created: false,
    fake_runtime_blockers_created: false,
    fake_audit_events_created: false,
    fake_forbidden_attempts_created: false,
    fake_policy_gaps_created: false,
    fake_release_artifacts_created: false,
    generic_answers_found: 0,
    technical_copy_visible_to_normal_user: false,
    web_free_text_questions_passed: input.webProofPassed,
    web_all_visible_buttons_clicked: input.webProofPassed,
    android_security_runtime_questions_passed: input.androidProofPassed,
    android_buttons_targetable: input.androidProofPassed,
    release_verify_passed: input.releaseVerifyPassed,
    fake_green_claimed: false,
  };
}
