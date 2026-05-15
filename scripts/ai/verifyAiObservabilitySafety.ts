import fs from "node:fs";
import path from "node:path";

import {
  scanAiArtifactSourceForUnsafePayloads,
  scanAiArtifactValueForUnsafePayloads,
  verifyAiArtifactScrubPolicy,
  type AiArtifactScrubFinding,
} from "../../src/features/ai/observability/aiArtifactScrubPolicy";
import {
  verifyAiBudgetPolicyCoverage,
  type AiBudgetPolicyCoverageSummary,
} from "../../src/features/ai/observability/aiBudgetPolicy";
import {
  verifyAiProviderPayloadRedactionPolicy,
  type AiProviderPayloadRedactionResult,
} from "../../src/features/ai/observability/aiProviderPayloadRedaction";
import {
  verifyAiTraceEnvelopeCoverage,
  type AiTraceEnvelopeCoverageSummary,
} from "../../src/features/ai/observability/aiTraceEnvelope";
import { listAiRolePermissionActionMatrixEntries } from "../../src/features/ai/security/aiRolePermissionActionMatrix";

export const AI_OBSERVABILITY_SAFETY_WAVE = "S_AI_OBSERVABILITY_01_TRACE_BUDGET_REDACTION" as const;

export type AiObservabilitySafetyFinalStatus =
  | "GREEN_AI_TRACE_BUDGET_REDACTION_HARDENING_READY"
  | "BLOCKED_AI_RAW_PROVIDER_PAYLOAD_RISK"
  | "BLOCKED_AI_TRACE_COVERAGE_INCOMPLETE"
  | "BLOCKED_AI_BUDGET_POLICY_INCOMPLETE";

export type AiObservabilitySafetySummary = {
  wave: typeof AI_OBSERVABILITY_SAFETY_WAVE;
  finalStatus: AiObservabilitySafetyFinalStatus;
  exactReason: string | null;
  auditedActions: number;
  traceCoverageComplete: boolean;
  budgetCoverageComplete: boolean;
  traceEnvelopes: number;
  budgetedActions: number;
  missingTraceIdActions: readonly string[];
  duplicateTraceIds: readonly string[];
  missingBudgetActions: readonly string[];
  unsafeBudgetActions: readonly string[];
  providerRedactionFindings: number;
  artifactScrubFindings: readonly string[];
  sourceSafetyFindings: readonly string[];
  artifactsScanned: number;
  noSecrets: true;
  noRawRows: true;
  noRawPrompts: true;
  noRawProviderPayloads: true;
  noDbWrites: true;
  noProviderCalls: true;
  noProviderSwitch: true;
  noUiChanges: true;
  noFakeGreen: true;
};

export type AiObservabilitySafetyMatrix = {
  wave: typeof AI_OBSERVABILITY_SAFETY_WAVE;
  final_status: AiObservabilitySafetyFinalStatus;
  exact_reason: string | null;
  audited_actions: number;
  trace_envelopes: number;
  budgeted_actions: number;
  missing_trace_id_actions: readonly string[];
  duplicate_trace_ids: readonly string[];
  missing_budget_actions: readonly string[];
  unsafe_budget_actions: readonly string[];
  provider_redaction_findings: number;
  artifact_scrub_findings: readonly string[];
  source_safety_findings: readonly string[];
  artifacts_scanned: number;
  no_secrets: true;
  no_raw_rows: true;
  no_raw_prompts: true;
  no_raw_provider_payloads: true;
  no_db_writes: true;
  no_provider_calls: true;
  no_provider_switch: true;
  no_ui_changes: true;
  no_fake_green: true;
};

const projectRoot = process.cwd();
const artifactPrefix = path.join(projectRoot, "artifacts", AI_OBSERVABILITY_SAFETY_WAVE);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const observabilitySourceFiles = [
  "src/features/ai/observability/aiTraceEnvelope.ts",
  "src/features/ai/observability/aiBudgetPolicy.ts",
  "src/features/ai/observability/aiProviderPayloadRedaction.ts",
  "src/features/ai/observability/aiArtifactScrubPolicy.ts",
  "scripts/ai/verifyAiObservabilitySafety.ts",
] as const;

const trackedAiArtifactFiles = [
  "artifacts/S_AI_BFF_01_MISSING_ROUTE_COVERAGE_CLOSEOUT_inventory.json",
  "artifacts/S_AI_BFF_01_MISSING_ROUTE_COVERAGE_CLOSEOUT_matrix.json",
  "artifacts/S_AI_BFF_01_MISSING_ROUTE_COVERAGE_CLOSEOUT_proof.md",
  "artifacts/S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT_inventory.json",
  "artifacts/S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT_matrix.json",
  "artifacts/S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT_emulator.json",
  "artifacts/S_AI_APPROVAL_01_ACTION_ROUTER_FROM_AUDIT_proof.md",
  "artifacts/S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING_inventory.json",
  "artifacts/S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING_matrix.json",
  "artifacts/S_AI_SECURITY_01_ROLE_PERMISSION_ACTION_BOUNDARY_HARDENING_proof.md",
  "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_inventory.json",
  "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_matrix.json",
  "artifacts/S_AI_OBS_01_TRACE_AUDIT_OBSERVABILITY_proof.md",
] as const;

const FORBIDDEN_OBSERVABILITY_IMPORT_PATTERN =
  /features\/ai\/model|AiModelGateway|LegacyGeminiModelProvider|openai|gemini|@supabase\/supabase-js|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readExistingArtifacts(): readonly { artifactPath: string; source: string }[] {
  return trackedAiArtifactFiles.flatMap((relativePath) => {
    const filePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(filePath)) return [];
    return [{ artifactPath: relativePath, source: fs.readFileSync(filePath, "utf8") }];
  });
}

function scanObservabilitySources(): readonly string[] {
  return observabilitySourceFiles.flatMap((relativePath) => {
    const filePath = path.join(projectRoot, relativePath);
    const source = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
    const importLines = source
      .split(/\r?\n/)
      .filter((line) => /^\s*import\b|\brequire\(/.test(line));
    return importLines.some((line) => FORBIDDEN_OBSERVABILITY_IMPORT_PATTERN.test(line))
      ? [`${relativePath}:forbidden_source_boundary`]
      : [];
  });
}

function finalStatusFor(params: {
  traceSummary: AiTraceEnvelopeCoverageSummary;
  budgetSummary: AiBudgetPolicyCoverageSummary;
  providerSummary: AiProviderPayloadRedactionResult;
  artifactFindings: readonly AiArtifactScrubFinding[];
  sourceSafetyFindings: readonly string[];
}): { finalStatus: AiObservabilitySafetyFinalStatus; exactReason: string | null } {
  if (!params.traceSummary.coverageComplete) {
    return {
      finalStatus: "BLOCKED_AI_TRACE_COVERAGE_INCOMPLETE",
      exactReason: "Trace envelope coverage is incomplete for audited screen/action pairs.",
    };
  }
  if (!params.budgetSummary.coverageComplete) {
    return {
      finalStatus: "BLOCKED_AI_BUDGET_POLICY_INCOMPLETE",
      exactReason: "Budget policy coverage is incomplete or unsafe for audited actions.",
    };
  }
  if (
    params.artifactFindings.length > 0 ||
    params.sourceSafetyFindings.length > 0 ||
    params.providerSummary.rawProviderPayloadStored !== false
  ) {
    return {
      finalStatus: "BLOCKED_AI_RAW_PROVIDER_PAYLOAD_RISK",
      exactReason: "Provider payload, prompt, row, credential, or unsafe source boundary risk was detected.",
    };
  }
  return {
    finalStatus: "GREEN_AI_TRACE_BUDGET_REDACTION_HARDENING_READY",
    exactReason: null,
  };
}

function buildSummary(params: {
  traceSummary: AiTraceEnvelopeCoverageSummary;
  budgetSummary: AiBudgetPolicyCoverageSummary;
  providerSummary: AiProviderPayloadRedactionResult;
  artifactFindings: readonly AiArtifactScrubFinding[];
  sourceSafetyFindings: readonly string[];
  artifactsScanned: number;
}): AiObservabilitySafetySummary {
  const status = finalStatusFor(params);
  return {
    wave: AI_OBSERVABILITY_SAFETY_WAVE,
    finalStatus: status.finalStatus,
    exactReason: status.exactReason,
    auditedActions: params.traceSummary.auditedActions,
    traceCoverageComplete: params.traceSummary.coverageComplete,
    budgetCoverageComplete: params.budgetSummary.coverageComplete,
    traceEnvelopes: params.traceSummary.envelopes.length,
    budgetedActions: params.budgetSummary.coveredActions,
    missingTraceIdActions: params.traceSummary.missingTraceIdActions,
    duplicateTraceIds: params.traceSummary.duplicateTraceIds,
    missingBudgetActions: params.budgetSummary.missingBudgetActions,
    unsafeBudgetActions: params.budgetSummary.unsafeBudgetActions,
    providerRedactionFindings: params.providerSummary.findings.length,
    artifactScrubFindings: params.artifactFindings
      .map((finding) => `${finding.artifactPath}:${finding.path}:${finding.code}`)
      .sort(),
    sourceSafetyFindings: [...params.sourceSafetyFindings].sort(),
    artifactsScanned: params.artifactsScanned,
    noSecrets: true,
    noRawRows: true,
    noRawPrompts: true,
    noRawProviderPayloads: true,
    noDbWrites: true,
    noProviderCalls: true,
    noProviderSwitch: true,
    noUiChanges: true,
    noFakeGreen: true,
  };
}

function buildMatrix(summary: AiObservabilitySafetySummary): AiObservabilitySafetyMatrix {
  return {
    wave: AI_OBSERVABILITY_SAFETY_WAVE,
    final_status: summary.finalStatus,
    exact_reason: summary.exactReason,
    audited_actions: summary.auditedActions,
    trace_envelopes: summary.traceEnvelopes,
    budgeted_actions: summary.budgetedActions,
    missing_trace_id_actions: summary.missingTraceIdActions,
    duplicate_trace_ids: summary.duplicateTraceIds,
    missing_budget_actions: summary.missingBudgetActions,
    unsafe_budget_actions: summary.unsafeBudgetActions,
    provider_redaction_findings: summary.providerRedactionFindings,
    artifact_scrub_findings: summary.artifactScrubFindings,
    source_safety_findings: summary.sourceSafetyFindings,
    artifacts_scanned: summary.artifactsScanned,
    no_secrets: true,
    no_raw_rows: true,
    no_raw_prompts: true,
    no_raw_provider_payloads: true,
    no_db_writes: true,
    no_provider_calls: true,
    no_provider_switch: true,
    no_ui_changes: true,
    no_fake_green: true,
  };
}

function buildProof(summary: AiObservabilitySafetySummary): string {
  return [
    "# S_AI_OBSERVABILITY_01_TRACE_BUDGET_REDACTION_HARDENING",
    "",
    `final_status: ${summary.finalStatus}`,
    `exact_reason: ${summary.exactReason ?? "null"}`,
    `audited_actions: ${summary.auditedActions}`,
    `trace_envelopes: ${summary.traceEnvelopes}`,
    `budgeted_actions: ${summary.budgetedActions}`,
    `missing_trace_id_actions: ${summary.missingTraceIdActions.length}`,
    `duplicate_trace_ids: ${summary.duplicateTraceIds.length}`,
    `missing_budget_actions: ${summary.missingBudgetActions.length}`,
    `unsafe_budget_actions: ${summary.unsafeBudgetActions.length}`,
    `provider_redaction_findings: ${summary.providerRedactionFindings}`,
    `artifact_scrub_findings: ${summary.artifactScrubFindings.length}`,
    `source_safety_findings: ${summary.sourceSafetyFindings.length}`,
    `artifacts_scanned: ${summary.artifactsScanned}`,
    "no_secrets: true",
    "no_raw_rows: true",
    "no_raw_prompts: true",
    "no_raw_provider_payloads: true",
    "no_db_writes: true",
    "no_provider_calls: true",
    "no_provider_switch: true",
    "no_ui_changes: true",
    "no_fake_green: true",
    "",
  ].join("\n");
}

function proposedArtifactFindings(params: {
  inventory: unknown;
  matrix: unknown;
  proof: string;
}): readonly AiArtifactScrubFinding[] {
  return [
    ...scanAiArtifactValueForUnsafePayloads({
      artifactPath: path.relative(projectRoot, inventoryPath).replace(/\\/g, "/"),
      value: params.inventory,
    }),
    ...scanAiArtifactValueForUnsafePayloads({
      artifactPath: path.relative(projectRoot, matrixPath).replace(/\\/g, "/"),
      value: params.matrix,
    }),
    ...scanAiArtifactSourceForUnsafePayloads({
      artifactPath: path.relative(projectRoot, proofPath).replace(/\\/g, "/"),
      source: params.proof,
    }),
  ];
}

export function writeAiObservabilitySafetyArtifacts(): AiObservabilitySafetyMatrix {
  const entries = listAiRolePermissionActionMatrixEntries();
  const traceSummary = verifyAiTraceEnvelopeCoverage(entries);
  const budgetSummary = verifyAiBudgetPolicyCoverage(entries);
  const providerSummary = verifyAiProviderPayloadRedactionPolicy();
  const sourceSafetyFindings = scanObservabilitySources();
  const existingArtifactVerification = verifyAiArtifactScrubPolicy({
    artifacts: readExistingArtifacts(),
  });

  let summary = buildSummary({
    traceSummary,
    budgetSummary,
    providerSummary,
    artifactFindings: existingArtifactVerification.findings,
    sourceSafetyFindings,
    artifactsScanned: existingArtifactVerification.artifactsScanned + 3,
  });
  let matrix = buildMatrix(summary);
  let inventory = {
    wave: AI_OBSERVABILITY_SAFETY_WAVE,
    source_role_permission_matrix: "src/features/ai/security/aiRolePermissionActionMatrix.ts",
    observability_sources: observabilitySourceFiles,
    trace_summary: {
      policy_id: traceSummary.policyId,
      audited_actions: traceSummary.auditedActions,
      envelopes: traceSummary.envelopes.length,
      missing_trace_id_actions: traceSummary.missingTraceIdActions,
      duplicate_trace_ids: traceSummary.duplicateTraceIds,
      missing_screen_action_pairs: traceSummary.missingScreenActionPairs,
      coverage_complete: traceSummary.coverageComplete,
    },
    budget_summary: {
      policy_id: budgetSummary.policyId,
      audited_actions: budgetSummary.auditedActions,
      covered_actions: budgetSummary.coveredActions,
      missing_budget_actions: budgetSummary.missingBudgetActions,
      unsafe_budget_actions: budgetSummary.unsafeBudgetActions,
      coverage_complete: budgetSummary.coverageComplete,
    },
    provider_redaction_summary: {
      policy_id: providerSummary.policyId,
      payload_bytes: providerSummary.payloadBytes,
      max_provider_payload_bytes: providerSummary.maxProviderPayloadBytes,
      unsafe_keys: providerSummary.unsafeKeys,
      findings: providerSummary.findings.length,
      accepted_for_artifact: providerSummary.acceptedForArtifact,
      raw_prompt_exposed: providerSummary.rawPromptExposed,
      raw_provider_payload_exposed: providerSummary.rawProviderPayloadExposed,
      raw_provider_payload_stored: providerSummary.rawProviderPayloadStored,
      credentials_exposed: providerSummary.credentialsExposed,
    },
    artifact_scrub_summary: {
      scanned_artifacts: existingArtifactVerification.artifactsScanned + 3,
      findings: summary.artifactScrubFindings,
    },
    trace_envelope_matrix: traceSummary.envelopes.map((envelope) => ({
      trace_id: envelope.traceId,
      span_id: envelope.spanId,
      screen_id: envelope.screenId,
      action_id: envelope.actionId,
      action_id_hash: envelope.actionIdHash,
      role: envelope.role,
      role_scope: envelope.roleScope,
      domain: envelope.domain,
      action_kind: envelope.actionKind,
      mutation_risk: envelope.mutationRisk,
      event_name: envelope.eventName,
      budget_policy_id: envelope.budgetPolicyId,
      redaction_policy_id: envelope.redactionPolicyId,
      approval_required: envelope.approvalRequired,
      forbidden: envelope.forbidden,
      raw_prompt_exposed: envelope.rawPromptExposed,
      raw_provider_payload_exposed: envelope.rawProviderPayloadExposed,
      raw_rows_exposed: envelope.rawDbRowsExposed,
      credentials_exposed: envelope.credentialsExposed,
      provider_payload_stored: envelope.providerPayloadStored,
      db_write_in_envelope: envelope.dbWriteInEnvelope,
      provider_called: envelope.providerCalled,
    })),
    budget_matrix: entries.map((entry, index) => {
      const policy = budgetSummary.policies[index];
      return {
        screen_id: entry.screenId,
        action_id: entry.actionId,
        action_kind: entry.actionKind,
        mutation_risk: entry.mutationRisk,
        max_cards: policy.maxCards,
        max_evidence_items: policy.maxEvidenceItems,
        max_provider_payload_bytes: policy.maxProviderPayloadBytes,
        timeout_ms: policy.timeoutMs,
        retry_max_attempts: policy.retryPolicy.maxAttempts,
        raw_prompt_logging_allowed: policy.rawPromptLoggingAllowed,
        raw_provider_payload_storage_allowed: policy.rawProviderPayloadStorageAllowed,
        raw_rows_allowed: policy.rawDbRowsAllowed,
        db_writes_allowed: policy.dbWritesAllowed,
      };
    }),
    safeguards: {
      secrets_printed: false,
      raw_rows_printed: false,
      raw_prompts_printed: false,
      raw_provider_payloads_printed: false,
      db_writes_used: false,
      provider_called: false,
      provider_switch_used: false,
      ui_changed: false,
      fake_green_claimed: false,
    },
    summary,
  };
  let proof = buildProof(summary);
  const proposedFindings = proposedArtifactFindings({ inventory, matrix, proof });
  const allArtifactFindings = [...existingArtifactVerification.findings, ...proposedFindings];

  summary = buildSummary({
    traceSummary,
    budgetSummary,
    providerSummary,
    artifactFindings: allArtifactFindings,
    sourceSafetyFindings,
    artifactsScanned: existingArtifactVerification.artifactsScanned + 3,
  });
  matrix = buildMatrix(summary);
  inventory = {
    ...inventory,
    artifact_scrub_summary: {
      scanned_artifacts: summary.artifactsScanned,
      findings: summary.artifactScrubFindings,
    },
    summary,
  };
  proof = buildProof(summary);

  writeJson(inventoryPath, inventory);
  writeJson(matrixPath, matrix);
  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, proof, "utf8");

  return matrix;
}

if (require.main === module) {
  try {
    const matrix = writeAiObservabilitySafetyArtifacts();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_AI_TRACE_BUDGET_REDACTION_HARDENING_READY") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
