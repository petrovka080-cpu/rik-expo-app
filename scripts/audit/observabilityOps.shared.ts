import fs from "node:fs";
import path from "node:path";

import {
  OPS_METRIC_REGISTRY,
  OPS_RATE_LIMIT_REGISTRY,
  REQUIRED_OPS_METRIC_NAMES,
  REQUIRED_OPS_RATE_LIMIT_IDS,
  buildOpsAlertThresholds,
  containsSensitiveOpsText,
  evaluateOpsRateLimit,
  recordOpsMetric,
  recordOpsRateLimitBlock,
  resetOpsMetricEvents,
  validateOpsMetricDefinition,
  validateOpsRateLimitDefinition,
  type OpsMetricName,
  type OpsRateLimitId,
} from "../../src/lib/ops/productionOpsTelemetry";

export const OBSERVABILITY_OPS_WAVE = "S_OBSERVABILITY_OPS_RATE_LIMIT_PRODUCTION_CLOSEOUT";
export const OBSERVABILITY_OPS_GREEN_STATUS = "GREEN_OBSERVABILITY_OPS_RATE_LIMIT_READY";

const ROOT = process.cwd();
const ARTIFACT_PREFIX = "S_OBSERVABILITY";

type JsonRecord = Record<string, unknown>;

export type ObservabilityOpsReport = {
  metricsCoverage: JsonRecord;
  rateLimits: JsonRecord;
  piiAudit: JsonRecord;
  alerts: JsonRecord;
  matrix: JsonRecord;
  proof: string;
};

const REQUIRED_ARTIFACTS = [
  "metrics_coverage.json",
  "rate_limits.json",
  "pii_audit.json",
  "alerts.json",
  "matrix.json",
  "proof.md",
] as const;

const metricNames = new Set<OpsMetricName>(OPS_METRIC_REGISTRY.map((metric) => metric.name));
const rateLimitIds = new Set<OpsRateLimitId>(OPS_RATE_LIMIT_REGISTRY.map((limit) => limit.id));

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), value, "utf8");
}

function requiredMetricRows() {
  return REQUIRED_OPS_METRIC_NAMES.map((name) => {
    const definition = OPS_METRIC_REGISTRY.find((metric) => metric.name === name);
    return {
      name,
      present: Boolean(definition),
      valid: definition ? validateOpsMetricDefinition(definition) : false,
      structured_log_event: definition?.structuredLogEvent ?? null,
      alert_threshold: definition?.alertThreshold ?? null,
      pii_safe: definition?.piiSafe === true,
    };
  });
}

function requiredRateLimitRows() {
  return REQUIRED_OPS_RATE_LIMIT_IDS.map((id) => {
    const definition = OPS_RATE_LIMIT_REGISTRY.find((limit) => limit.id === id);
    const saturatedAttempts = definition
      ? Array.from({ length: definition.maxAttempts }, (_, index) => index + 1)
      : [];
    const decision = definition
      ? evaluateOpsRateLimit({
          id,
          previousAttemptTimestamps: saturatedAttempts,
          now: definition.windowMs,
        })
      : null;
    return {
      id,
      present: Boolean(definition),
      valid: definition ? validateOpsRateLimitDefinition(definition) : false,
      enabled: definition?.enabled === true,
      operation: definition?.operation ?? null,
      subject: definition?.subject ?? null,
      window_ms: definition?.windowMs ?? null,
      max_attempts: definition?.maxAttempts ?? null,
      blocks_when_saturated: decision?.blocked === true,
      pii_safe_key: definition?.piiSafeKey === true,
    };
  });
}

function buildMetricsCoverage(): JsonRecord {
  const rows = requiredMetricRows();
  const missing = REQUIRED_OPS_METRIC_NAMES.filter((name) => !metricNames.has(name));
  return {
    wave: OBSERVABILITY_OPS_WAVE,
    required_metrics: REQUIRED_OPS_METRIC_NAMES,
    metrics: rows,
    missing_metrics: missing,
    structured_logs_enabled: rows.every((row) => Boolean(row.structured_log_event)),
    core_metrics_emitted: missing.length === 0 && rows.every((row) => row.valid && row.pii_safe),
  };
}

function buildRateLimits(): JsonRecord {
  const rows = requiredRateLimitRows();
  return {
    wave: OBSERVABILITY_OPS_WAVE,
    required_rate_limits: REQUIRED_OPS_RATE_LIMIT_IDS,
    rate_limits: rows,
    missing_rate_limits: REQUIRED_OPS_RATE_LIMIT_IDS.filter((id) => !rateLimitIds.has(id)),
    ai_rate_limit_enabled: rows.find((row) => row.id === "ai_questions_per_user_hour")?.enabled === true,
    media_rate_limit_enabled: rows.find((row) => row.id === "media_uploads_per_user_hour")?.enabled === true,
    publish_rate_limit_enabled: rows.find((row) => row.id === "marketplace_publish_attempts_per_hour")?.enabled === true,
    b2c_send_rate_limit_enabled: rows.find((row) => row.id === "b2c_marketplace_send_attempts_per_hour")?.enabled === true,
    pdf_generation_rate_limit_enabled: rows.find((row) => row.id === "pdf_generation_attempts_per_hour")?.enabled === true,
    auth_sensitive_rate_limit_enabled: rows.find((row) => row.id === "auth_sensitive_actions_per_hour")?.enabled === true,
    all_required_rate_limits_enabled: rows.every((row) => row.present && row.valid && row.enabled && row.blocks_when_saturated),
  };
}

function buildAlerts(): JsonRecord {
  const thresholds = buildOpsAlertThresholds();
  const rows = REQUIRED_OPS_METRIC_NAMES.map((name) => ({
    metric: name,
    threshold: thresholds[name],
    defined: typeof thresholds[name] === "number" && thresholds[name] > 0,
  }));
  return {
    wave: OBSERVABILITY_OPS_WAVE,
    thresholds,
    alerts: rows,
    alert_thresholds_defined: rows.every((row) => row.defined),
  };
}

function scanArtifactText(relativePath: string): JsonRecord[] {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return [];
  const text = fs.readFileSync(fullPath, "utf8");
  return containsSensitiveOpsText(text)
    ? [{ file: relativePath, finding: "sensitive_artifact_text" }]
    : [];
}

function buildPiiAudit(): JsonRecord {
  resetOpsMetricEvents();
  const sampleMetric = recordOpsMetric({
    name: "api_request_duration_ms",
    value: 42,
    attributes: {
      email: "person@example.test",
      phone: "+996 555 123 456",
      credential: "Bearer secret-token",
      adminSecret: "service_role secret",
      nested: {
        providerPayload: { rawPrompt: "call me +996 700 111 222" },
      },
    },
  });
  const blockMetric = recordOpsRateLimitBlock("ai_questions_per_user_hour", {
    actor: "user@example.test",
    phone: "+996 555 000 111",
  });
  const sampleJson = JSON.stringify([sampleMetric, blockMetric]);
  const sampleFindings = containsSensitiveOpsText(sampleJson)
    ? [{ file: "runtime_sample", finding: "sample_metric_redaction_failed" }]
    : [];
  const artifactFindings = REQUIRED_ARTIFACTS.flatMap((name) =>
    scanArtifactText(`artifacts/${ARTIFACT_PREFIX}_${name}`),
  );
  return {
    wave: OBSERVABILITY_OPS_WAVE,
    runtime_sample_redacted: sampleFindings.length === 0,
    artifacts_scanned: REQUIRED_ARTIFACTS.map((name) => `${ARTIFACT_PREFIX}_${name}`),
    findings: [...sampleFindings, ...artifactFindings],
    pii_in_logs_found: sampleFindings.length > 0,
    pii_in_artifacts_found: artifactFindings.length > 0,
  };
}

function getGateFlag(name: string): boolean {
  return process.env[name] === "1";
}

export function buildObservabilityOpsReport(options?: {
  fullJestPassed?: boolean;
  releaseVerifyPassed?: boolean;
}): ObservabilityOpsReport {
  const metricsCoverage = buildMetricsCoverage();
  const rateLimits = buildRateLimits();
  const alerts = buildAlerts();
  const piiAudit = buildPiiAudit();
  const fullJestPassed = options?.fullJestPassed ?? getGateFlag("OBSERVABILITY_FULL_JEST_PASSED");
  const releaseVerifyPassed =
    options?.releaseVerifyPassed ?? getGateFlag("OBSERVABILITY_RELEASE_VERIFY_PASSED");

  const matrix = {
    final_status: OBSERVABILITY_OPS_GREEN_STATUS,
    structured_logs_enabled: metricsCoverage.structured_logs_enabled === true,
    pii_in_logs_found: piiAudit.pii_in_logs_found === true,
    pii_in_artifacts_found: piiAudit.pii_in_artifacts_found === true,
    core_metrics_emitted: metricsCoverage.core_metrics_emitted === true,
    ai_rate_limit_enabled: rateLimits.ai_rate_limit_enabled === true,
    media_rate_limit_enabled: rateLimits.media_rate_limit_enabled === true,
    publish_rate_limit_enabled: rateLimits.publish_rate_limit_enabled === true,
    b2c_send_rate_limit_enabled: rateLimits.b2c_send_rate_limit_enabled === true,
    pdf_generation_rate_limit_enabled: rateLimits.pdf_generation_rate_limit_enabled === true,
    auth_sensitive_rate_limit_enabled: rateLimits.auth_sensitive_rate_limit_enabled === true,
    alert_thresholds_defined: alerts.alert_thresholds_defined === true,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };

  const blockers = Object.entries(matrix)
    .filter(([key, value]) => {
      if (key === "final_status" || key === "fake_green_claimed") return false;
      if (key === "pii_in_logs_found" || key === "pii_in_artifacts_found") return value !== false;
      return value !== true;
    })
    .map(([key]) => key);

  const finalMatrix = {
    ...matrix,
    final_status: blockers.length === 0 ? OBSERVABILITY_OPS_GREEN_STATUS : "BLOCKED_OBSERVABILITY_OPS_GATES",
    blockers,
  };

  const proof = [
    `# ${OBSERVABILITY_OPS_WAVE}`,
    "",
    `Status: ${finalMatrix.final_status}`,
    "",
    "## Metrics",
    `- Required metrics present: ${metricsCoverage.core_metrics_emitted}`,
    `- Structured logs enabled: ${metricsCoverage.structured_logs_enabled}`,
    "",
    "## Rate Limits",
    `- Required limits enabled: ${rateLimits.all_required_rate_limits_enabled}`,
    `- AI questions: ${rateLimits.ai_rate_limit_enabled}`,
    `- Media uploads: ${rateLimits.media_rate_limit_enabled}`,
    `- Marketplace publish: ${rateLimits.publish_rate_limit_enabled}`,
    `- B2C marketplace send: ${rateLimits.b2c_send_rate_limit_enabled}`,
    `- PDF generation: ${rateLimits.pdf_generation_rate_limit_enabled}`,
    "",
    "## PII Safety",
    `- PII in logs found: ${piiAudit.pii_in_logs_found}`,
    `- PII in artifacts found: ${piiAudit.pii_in_artifacts_found}`,
    "",
    "## Gates",
    `- Full Jest passed: ${finalMatrix.full_jest_passed}`,
    `- release:verify passed: ${finalMatrix.release_verify_passed}`,
    "",
  ].join("\n");

  return {
    metricsCoverage,
    rateLimits,
    piiAudit,
    alerts,
    matrix: finalMatrix,
    proof,
  };
}

export function writeObservabilityOpsArtifacts(report = buildObservabilityOpsReport()): void {
  writeJson("metrics_coverage.json", report.metricsCoverage);
  writeJson("rate_limits.json", report.rateLimits);
  writeJson("alerts.json", report.alerts);
  const finalReport = {
    ...report,
    piiAudit: buildPiiAudit(),
  };
  const refreshed = buildObservabilityOpsReport({
    fullJestPassed: finalReport.matrix.full_jest_passed === true,
    releaseVerifyPassed: finalReport.matrix.release_verify_passed === true,
  });
  writeJson("pii_audit.json", refreshed.piiAudit);
  writeJson("matrix.json", refreshed.matrix);
  writeProof(refreshed.proof);
}

export function runObservabilityOpsAudit(kind: "metrics" | "rate_limits" | "pii"): void {
  const report = buildObservabilityOpsReport();
  writeObservabilityOpsArtifacts(report);
  const payload =
    kind === "metrics" ? report.metricsCoverage : kind === "rate_limits" ? report.rateLimits : report.piiAudit;
  console.log(JSON.stringify(payload, null, 2));
  const matrix = buildObservabilityOpsReport().matrix;
  const blockers = Array.isArray(matrix.blockers) ? (matrix.blockers as string[]) : [];
  const hardBlockers = blockers.filter(
    (blocker) => blocker !== "full_jest_passed" && blocker !== "release_verify_passed",
  );
  if (hardBlockers.length > 0) {
    process.exitCode = 1;
  }
}
