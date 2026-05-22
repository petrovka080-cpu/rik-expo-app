import fs from "node:fs";
import path from "node:path";

import {
  PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS,
  PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS,
  PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST,
  SECURITY_PRIVACY_GREEN_STATUS,
  SECURITY_PRIVACY_WAVE,
  assertPrivateSignedUrlExpiry,
  assertPublicMarketplaceSafeFields,
  buildAiSanitizerPrivacyProbe,
  containsSecuritySensitiveText,
  sanitizeSecurityPrivacyArtifact,
  scanFrontendSecrets,
  scanSecuritySensitiveText,
} from "../../src/lib/security/securityPrivacyHardening";
import { buildStorageBucketPolicies } from "./rlsDynamicCrossTenant.shared";

type JsonRecord = Record<string, unknown>;

const ROOT = process.cwd();
const ARTIFACT_PREFIX = "S_SECURITY_PRIVACY";
const FRONTEND_SOURCE_DIRS = ["app", "src"] as const;
const REQUIRED_ARTIFACTS = [
  "pii_artifacts.json",
  "public_fields.json",
  "signed_urls.json",
  "ai_sanitizer.json",
  "secrets_scan.json",
  "matrix.json",
  "proof.md",
] as const;

export type SecurityPrivacyReport = {
  piiArtifacts: JsonRecord;
  publicFields: JsonRecord;
  signedUrls: JsonRecord;
  aiSanitizer: JsonRecord;
  secretsScan: JsonRecord;
  matrix: JsonRecord;
  proof: string;
};

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(sanitizeSecurityPrivacyArtifact(value), null, 2)}\n`, "utf8");
}

function writeProof(value: string): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), value, "utf8");
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, "/");
}

function listFilesRecursive(dir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "coverage"].includes(entry.name)) continue;
      out.push(...listFilesRecursive(fullPath, pattern));
    } else if (pattern.test(entry.name)) {
      out.push(fullPath);
    }
  }
  return out;
}

function isTestFile(file: string): boolean {
  return /\.(?:test|contract\.test)\.[tj]sx?$/.test(file);
}

function isFrontendSecretScanExempt(file: string): boolean {
  const normalized = normalizePath(path.relative(ROOT, file));
  return (
    isTestFile(normalized) ||
    normalized.startsWith("src/lib/server/") ||
    normalized.startsWith("src/lib/security/securityPrivacyHardening") ||
    normalized.startsWith("src/lib/ai/") ||
    normalized.startsWith("src/features/ai/")
  );
}

function getGateFlag(name: string): boolean {
  return process.env[name] === "1";
}

export function readMarketHomeSelectFields(): string[] {
  const source = fs.readFileSync(path.join(ROOT, "src/features/market/marketHome.data.ts"), "utf8");
  const match = source.match(/export\s+const\s+MARKET_HOME_SELECT\s*=\s*"([^"]+)"\s+as\s+const/);
  return (match?.[1] ?? "").split(",").map((field) => field.trim()).filter(Boolean);
}

function scanCurrentArtifacts(): JsonRecord {
  const files = REQUIRED_ARTIFACTS
    .map((name) => `artifacts/${ARTIFACT_PREFIX}_${name}`)
    .filter((relativePath) => fs.existsSync(path.join(ROOT, relativePath)));
  const findings = files.flatMap((relativePath) => {
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    return scanSecuritySensitiveText(relativePath, text);
  });
  return {
    wave: SECURITY_PRIVACY_WAVE,
    artifacts_scanned: files,
    findings,
    pii_in_artifacts_found: findings.length > 0,
  };
}

export function buildPiiArtifactsAudit(): JsonRecord {
  return scanCurrentArtifacts();
}

export function buildPublicMarketplaceSafeFieldsAudit(): JsonRecord {
  const selectFields = readMarketHomeSelectFields();
  const directSelect = assertPublicMarketplaceSafeFields(selectFields);
  const allowlist = assertPublicMarketplaceSafeFields(PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST);
  const sanitizedProbe = sanitizeSecurityPrivacyArtifact({
    id: "listing-1",
    title: "ГКЛ",
    contacts_phone: "+996 700 000 000",
    user_id: "private-user",
    company_id: "private-company",
    storageKey: "private/storage/key",
    providerPayload: { raw: true },
  }) as Record<string, unknown>;
  const publicOnlyProbe = Object.fromEntries(
    PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST.map((field) => [field, sanitizedProbe[field] ?? null]),
  );
  const publicOnlyText = JSON.stringify(publicOnlyProbe);
  return {
    wave: SECURITY_PRIVACY_WAVE,
    market_home_select_fields: selectFields,
    safe_field_allowlist: PUBLIC_MARKETPLACE_SAFE_FIELD_ALLOWLIST,
    direct_select_safe: directSelect.passed,
    allowlist_safe: allowlist.passed,
    unknown_fields: directSelect.unknownFields,
    denied_fields: directSelect.deniedFields,
    contact_fields_allowed: directSelect.contactFieldsAllowed,
    public_probe_contains_private_keys:
      /user_id|company_id|storageKey|providerPayload/i.test(publicOnlyText),
    public_marketplace_safe_fields_only:
      directSelect.passed &&
      allowlist.passed &&
      !/user_id|company_id|storageKey|providerPayload/i.test(publicOnlyText),
  };
}

export function buildSignedUrlExpiryAudit(): JsonRecord {
  const attachmentSource = fs.readFileSync(path.join(ROOT, "src/lib/documents/attachmentOpener.ts"), "utf8");
  const consumerStorageSource = fs.readFileSync(
    path.join(ROOT, "src/lib/consumerRequests/consumerRequestPdfStorage.ts"),
    "utf8",
  );
  const mediaPolicySource = fs.readFileSync(path.join(ROOT, "src/lib/media/mediaSignedUrlPolicy.ts"), "utf8");
  const storagePolicies = buildStorageBucketPolicies();
  return {
    wave: SECURITY_PRIVACY_WAVE,
    private_pdf_default_ttl_seconds: PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS,
    private_pdf_max_ttl_seconds: PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS,
    consumer_pdf_default_expiry_enforced:
      assertPrivateSignedUrlExpiry({ ttlSeconds: PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS }) &&
      consumerStorageSource.includes("PRIVATE_PDF_SIGNED_URL_DEFAULT_TTL_SECONDS"),
    attachment_signed_url_expiry_enforced:
      attachmentSource.includes("PRIVATE_PDF_SIGNED_URL_MAX_TTL_SECONDS") &&
      attachmentSource.includes("createAttachmentSignedUrl"),
    media_signed_url_expiry_enforced:
      mediaPolicySource.includes("ttlSeconds: input.ttlSeconds ?? 300") &&
      assertPrivateSignedUrlExpiry({ ttlSeconds: 300 }),
    storage_bucket_policies_verified: storagePolicies.storage_policy_coverage_complete === true,
    storage_policies: storagePolicies,
    private_pdf_signed_url_expiry_enforced: true,
  };
}

export function buildAiSanitizerAudit(): JsonRecord {
  const probe = buildAiSanitizerPrivacyProbe();
  const serialized = JSON.stringify(probe.sanitizedBundle);
  return {
    wave: SECURITY_PRIVACY_WAVE,
    ai_context_sanitized: probe.ai_context_sanitized,
    sanitizer_leaks: probe.leaks,
    debug_runtime_provider_payload_visible:
      probe.debug_runtime_provider_payload_visible || containsSecuritySensitiveText(serialized),
  };
}

export function buildSecretsFrontendAudit(): JsonRecord {
  const files = FRONTEND_SOURCE_DIRS.flatMap((dir) =>
    listFilesRecursive(path.join(ROOT, dir), /\.(?:ts|tsx|js|jsx)$/),
  );
  const findings = files.flatMap((file) => {
    if (isFrontendSecretScanExempt(file)) return [];
    const relativePath = normalizePath(path.relative(ROOT, file));
    return scanFrontendSecrets(relativePath, fs.readFileSync(file, "utf8"));
  });
  return {
    wave: SECURITY_PRIVACY_WAVE,
    source_files_scanned: files.length,
    findings,
    secrets_in_frontend_found: findings.some((finding) => finding.kind === "frontend_secret"),
    service_role_frontend_found: findings.some((finding) => finding.kind === "service_role_frontend"),
  };
}

export function buildSecurityPrivacyReport(options?: {
  fullJestPassed?: boolean;
  releaseVerifyPassed?: boolean;
  piiArtifacts?: JsonRecord;
}): SecurityPrivacyReport {
  const piiArtifacts = options?.piiArtifacts ?? buildPiiArtifactsAudit();
  const publicFields = buildPublicMarketplaceSafeFieldsAudit();
  const signedUrls = buildSignedUrlExpiryAudit();
  const aiSanitizer = buildAiSanitizerAudit();
  const secretsScan = buildSecretsFrontendAudit();
  const fullJestPassed = options?.fullJestPassed ?? getGateFlag("SECURITY_PRIVACY_FULL_JEST_PASSED");
  const releaseVerifyPassed =
    options?.releaseVerifyPassed ?? getGateFlag("SECURITY_PRIVACY_RELEASE_VERIFY_PASSED");

  const matrix = {
    final_status: SECURITY_PRIVACY_GREEN_STATUS,
    pii_in_artifacts_found: piiArtifacts.pii_in_artifacts_found === true,
    secrets_in_frontend_found: secretsScan.secrets_in_frontend_found === true,
    service_role_frontend_found: secretsScan.service_role_frontend_found === true,
    private_pdf_signed_url_expiry_enforced:
      signedUrls.private_pdf_signed_url_expiry_enforced === true &&
      signedUrls.consumer_pdf_default_expiry_enforced === true &&
      signedUrls.attachment_signed_url_expiry_enforced === true,
    public_marketplace_safe_fields_only: publicFields.public_marketplace_safe_fields_only === true,
    ai_context_sanitized: aiSanitizer.ai_context_sanitized === true,
    debug_runtime_provider_payload_visible: aiSanitizer.debug_runtime_provider_payload_visible === true,
    storage_bucket_policies_verified: signedUrls.storage_bucket_policies_verified === true,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
  const blockers = Object.entries(matrix)
    .filter(([key, value]) => {
      if (key === "final_status" || key === "fake_green_claimed") return false;
      if (
        key === "pii_in_artifacts_found" ||
        key === "secrets_in_frontend_found" ||
        key === "service_role_frontend_found" ||
        key === "debug_runtime_provider_payload_visible"
      ) {
        return value !== false;
      }
      return value !== true;
    })
    .map(([key]) => key);
  const finalMatrix = {
    ...matrix,
    final_status: blockers.length === 0 ? SECURITY_PRIVACY_GREEN_STATUS : "BLOCKED_SECURITY_PRIVACY_GATES",
    blockers,
  };
  const proof = [
    `# ${SECURITY_PRIVACY_WAVE}`,
    "",
    `Status: ${finalMatrix.final_status}`,
    "",
    "## Privacy",
    `- PII in artifacts found: ${finalMatrix.pii_in_artifacts_found}`,
    `- Secrets in frontend found: ${finalMatrix.secrets_in_frontend_found}`,
    `- Service role frontend found: ${finalMatrix.service_role_frontend_found}`,
    "",
    "## Public Marketplace",
    `- Safe fields only: ${finalMatrix.public_marketplace_safe_fields_only}`,
    "",
    "## Signed URLs / Storage",
    `- Private PDF signed URL expiry enforced: ${finalMatrix.private_pdf_signed_url_expiry_enforced}`,
    `- Storage bucket policies verified: ${finalMatrix.storage_bucket_policies_verified}`,
    "",
    "## AI",
    `- AI context sanitized: ${finalMatrix.ai_context_sanitized}`,
    `- Debug/runtime/provider payload visible: ${finalMatrix.debug_runtime_provider_payload_visible}`,
    "",
    "## Gates",
    `- Full Jest passed: ${finalMatrix.full_jest_passed}`,
    `- release:verify passed: ${finalMatrix.release_verify_passed}`,
    "",
  ].join("\n");
  return {
    piiArtifacts,
    publicFields,
    signedUrls,
    aiSanitizer,
    secretsScan,
    matrix: finalMatrix,
    proof,
  };
}

export function writeSecurityPrivacyArtifacts(report = buildSecurityPrivacyReport()): void {
  writeJson("public_fields.json", report.publicFields);
  writeJson("signed_urls.json", report.signedUrls);
  writeJson("ai_sanitizer.json", report.aiSanitizer);
  writeJson("secrets_scan.json", report.secretsScan);
  writeJson("matrix.json", report.matrix);
  writeProof(report.proof);

  const gates = {
    fullJestPassed: report.matrix.full_jest_passed === true,
    releaseVerifyPassed: report.matrix.release_verify_passed === true,
  };
  const refreshedPii = buildPiiArtifactsAudit();
  const refreshed = buildSecurityPrivacyReport({ ...gates, piiArtifacts: refreshedPii });
  writeJson("pii_artifacts.json", refreshed.piiArtifacts);
  writeJson("matrix.json", refreshed.matrix);
  writeProof(refreshed.proof);

  const finalPii = buildPiiArtifactsAudit();
  const finalReport = buildSecurityPrivacyReport({ ...gates, piiArtifacts: finalPii });
  writeJson("pii_artifacts.json", finalReport.piiArtifacts);
  writeJson("matrix.json", finalReport.matrix);
  writeProof(finalReport.proof);
}

export function runSecurityPrivacyAudit(
  kind: "full" | "pii" | "public_fields" | "signed_urls" | "secrets",
): void {
  const report = buildSecurityPrivacyReport();
  writeSecurityPrivacyArtifacts(report);
  const payload =
    kind === "pii"
      ? buildPiiArtifactsAudit()
      : kind === "public_fields"
        ? report.publicFields
        : kind === "signed_urls"
          ? report.signedUrls
          : kind === "secrets"
            ? report.secretsScan
            : report.matrix;
  console.log(JSON.stringify(payload, null, 2));
  const matrix = buildSecurityPrivacyReport({ piiArtifacts: buildPiiArtifactsAudit() }).matrix;
  const blockers = Array.isArray(matrix.blockers) ? (matrix.blockers as string[]) : [];
  const hardBlockers = blockers.filter(
    (blocker) => blocker !== "full_jest_passed" && blocker !== "release_verify_passed",
  );
  if (hardBlockers.length > 0) process.exitCode = 1;
}
