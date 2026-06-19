import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { verifyProofLineage } from "../release/proofLineageVerifier";
import { NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS } from "../release/noHintWorkOntologyReleaseReusePolicy";
import { OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS } from "../release/operationObjectMatchingReleaseReusePolicy";
import { PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS } from "../release/professionalEstimateReleaseReusePolicy";
import { SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS } from "../release/smartEstimatorReleaseReusePolicy";
import { MARKET_PRICEBOOK_RELEASE_NEUTRAL_PATHS } from "../release/marketPricebookReleaseReusePolicy";
import { writeProofRunManifest } from "../release/proofRunManifest";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);
const WAVE = "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG";
const REQUIRED_ARTIFACTS = [
  "failure_reproduction.json",
  "runtime_results.json",
  "work_plan_results.json",
  "ui_visible_rows.json",
  "catalog_binding.json",
  "source_tax_results.json",
  "pdf_files_manifest.json",
  "pdf_text_extract.json",
  "pdf_layout_audit.json",
  "pdf_parity.json",
  "mojibake_scan.json",
  "web_results.json",
  "web_screenshots.json",
  "android_api34_results.json",
  "android_screenshots.json",
  "android_ui_dumps.json",
  "failures.json",
  "matrix.json",
  "proof.md",
] as const;
const RELEASE_PROOF_ONLY_SUPERSESSION_PATHS = [
  ".gitignore",
  ".husky/pre-commit",
  "package.json",
  "artifacts/S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX/",
  "scripts/e2e/aiEstimatePersistenceProofCore.ts",
  "scripts/e2e/androidApi34BuildIfNeeded.ts",
  "scripts/e2e/androidApi34InstallIfNeeded.ts",
  "scripts/e2e/androidApi34Preflight.ts",
  "scripts/e2e/androidApi34Replay.ts",
  "scripts/e2e/androidApi34Verify.ts",
  "scripts/e2e/proofMarkdownSection.ts",
  "scripts/e2e/runAiEstimateDraftPersistenceAudit.ts",
  "scripts/e2e/runAiEstimateHistoryBindingAudit.ts",
  "scripts/e2e/runAiEstimateHistoryDisappearsReproduction.ts",
  "scripts/e2e/runAiEstimatePdfRevisionBindingAudit.ts",
  "scripts/e2e/runAiEstimatePersistenceCloseout.ts",
  "scripts/e2e/runAiEstimateRequestBindingAudit.ts",
  "scripts/e2e/runAiEstimateRevisionPersistenceAudit.ts",
  "scripts/e2e/runAndroidApi34AiEstimateHistoryPersistenceSmoke.ts",
  "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts",
  "scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts",
  "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
  "scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts",
  "scripts/e2e/runEstimateRevisionCloseout.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts",
  "scripts/release/",
  "src/generated/releaseBuildIdentity.ts",
  "src/features/consumerRepair/",
  "src/lib/ai/enterpriseGuardrails/",
  "src/lib/ai/estimatePersistence/",
  "src/lib/consumerRequests/",
  "src/lib/release/buildIdentity.ts",
  "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts",
  "tests/aiEstimatePersistence/",
  "tests/e2e/aiEstimateHistoryPersistence.responsive.web.spec.ts",
  "tests/e2e/aiEstimateHistoryPersistence.web.spec.ts",
  "tests/release/",
  "tests/releasePipeline/",
  "tests/architecture/real10000P1EvidenceRefreshReleaseGuard.contract.test.ts",
  "tests/architecture/releaseVerifyUsesCanonicalApi34Evidence.contract.test.ts",
  ...NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS,
  ...OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS,
  ...PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS,
  ...SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS,
  ...MARKET_PRICEBOOK_RELEASE_NEUTRAL_PATHS,
] as const;

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function requireArtifact(name: string): void {
  if (!fs.existsSync(artifactPath(name))) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_ARTIFACT_MISSING:${name}`);
  }
}

type ProofMatrix = {
  final_status?: string;
  fake_green_claimed?: boolean;
};

function isProofMatrix(value: unknown): value is ProofMatrix {
  if (!value || typeof value !== "object") return false;
  const finalStatus = Reflect.get(value, "final_status");
  const fakeGreenClaimed = Reflect.get(value, "fake_green_claimed");
  return (
    (finalStatus === undefined || typeof finalStatus === "string") &&
    (fakeGreenClaimed === undefined || typeof fakeGreenClaimed === "boolean")
  );
}

function readMatrix(): ProofMatrix {
  const raw = fs.readFileSync(artifactPath("matrix.json"), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isProofMatrix(parsed)) {
    throw new Error("LIVE_BOQ_PDF_CATALOG_MATRIX_INVALID");
  }
  return parsed;
}

function readArtifactJson(name: string): unknown {
  return JSON.parse(fs.readFileSync(artifactPath(name), "utf8")) as unknown;
}

function failureListIsEmpty(value: unknown): boolean {
  return Array.isArray(value) ? value.length === 0 : true;
}

function recordFailuresAreEmpty(record: Record<string, unknown>): boolean {
  return failureListIsEmpty(record.failures);
}

function booleanField(record: Record<string, unknown>, field: string): boolean {
  return record[field] === true;
}

function androidApi34ArtifactGreen(): boolean {
  const android = readArtifactObject("android_api34_results.json");
  return (
    android.final_status === "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY" &&
    android.actual_api === 34 &&
    booleanField(android, "android_api34_tested") &&
    booleanField(android, "android_api34_smoke_passed") &&
    booleanField(android, "api36_rejected") &&
    recordFailuresAreEmpty(android) &&
    android.fake_green_claimed === false
  );
}

function webArtifactGreen(): boolean {
  const web = readArtifactObject("web_results.json");
  return (
    booleanField(web, "web_live_app_tested") &&
    booleanField(web, "playwright_web_passed") &&
    recordFailuresAreEmpty(web) &&
    web.fake_green_claimed === false
  );
}

function matrixEvidenceGreen(matrix: ProofMatrix): boolean {
  const record = matrix as Record<string, unknown>;
  const failures = readArtifactJson("failures.json");
  const reproduction = readArtifactObject("failure_reproduction.json");
  return (
    matrix.fake_green_claimed === false &&
    failureListIsEmpty(failures) &&
    recordFailuresAreEmpty(reproduction) &&
    reproduction.fake_green_claimed === false &&
    booleanField(record, "web_live_app_tested") &&
    booleanField(record, "runtime_proof_passed") &&
    booleanField(record, "catalog_items_bound_for_material_rows") &&
    booleanField(record, "source_evidence_present_all_priced_rows") &&
    booleanField(record, "pdf_professional_table_layout_ready") &&
    booleanField(record, "pdf_uses_structured_global_estimate_result") &&
    booleanField(record, "pdf_rows_match_ui_rows") &&
    record.pdf_mojibake_found !== true &&
    record.ui_mojibake_found !== true &&
    record.weak_generic_rows_found !== true &&
    record.fake_catalog_items_found !== true &&
    record.fake_stock_found !== true &&
    record.fake_supplier_found !== true &&
    record.fake_availability_found !== true &&
    webArtifactGreen() &&
    androidApi34ArtifactGreen()
  );
}

function parseMode(argv: string[]): "refresh" | "verify" {
  const modeArg = argv.find((value) => value.startsWith("--mode="));
  const mode = modeArg?.slice("--mode=".length) ?? "refresh";
  if (mode !== "refresh" && mode !== "verify") {
    throw new Error("--mode must be refresh or verify");
  }
  return mode;
}

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 10_000,
  }).trim();
}

function currentHeadOrNull(): string | null {
  try {
    return currentHead();
  } catch {
    return null;
  }
}

function readArtifactObject(name: string): Record<string, unknown> {
  const parsed = JSON.parse(fs.readFileSync(artifactPath(name), "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_ARTIFACT_INVALID:${name}`);
  }
  return parsed as Record<string, unknown>;
}

function stringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function verifyJsonLineage(name: string, head: string): void {
  const artifact = readArtifactObject(name);
  const sourceCodeHead = stringField(artifact, "source_code_head") ?? stringField(artifact, "head");
  if (!sourceCodeHead) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_LINEAGE_MISSING:${name}`);
  }
  const result = verifyProofLineage({
    wave: WAVE,
    sourceCodeHead,
    currentHead: head,
    artifactPaths: [
      ...REQUIRED_ARTIFACTS.map((artifactName) =>
        path.join("artifacts", "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG", artifactName).replace(/\\/g, "/"),
      ),
      ...RELEASE_PROOF_ONLY_SUPERSESSION_PATHS,
    ],
    allowArtifactOnlySupersession: artifact.artifact_only_supersession_allowed !== false,
  });
  if (!result.valid) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_LINEAGE_STALE:${name}:${result.reason ?? "unknown"}`);
  }
}

function verifyArtifactsReadOnly(): void {
  REQUIRED_ARTIFACTS.forEach(requireArtifact);
  const matrix = readMatrix();
  if (
    matrix.final_status !== "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY" ||
    matrix.fake_green_claimed !== false
  ) {
    if (!matrixEvidenceGreen(matrix)) {
      throw new Error(`LIVE_BOQ_PDF_CATALOG_NOT_GREEN:${matrix.final_status ?? "unknown"}`);
    }
  }

  const head = currentHead();
  verifyJsonLineage("failure_reproduction.json", head);
  verifyJsonLineage("web_results.json", head);
  verifyJsonLineage("android_api34_results.json", head);
}

function main(): void {
  const mode = parseMode(process.argv.slice(2));
  if (mode === "verify") {
    verifyArtifactsReadOnly();
    console.log("GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY");
    return;
  }

  const command = "npx tsx scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts --mode=refresh";
  const startedAt = new Date();
  let exitCode = 0;
  try {
    execSync(command, {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch (error) {
    exitCode = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 1;
    throw error;
  } finally {
    const finishedAt = new Date();
    writeProofRunManifest({
      run_id: `${startedAt.toISOString()}_${WAVE}`,
      wave: WAVE,
      command,
      mode: "refresh",
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      exit_code: exitCode,
      head: currentHeadOrNull(),
      pid: process.pid,
      stdout_log: null,
      stderr_log: null,
      fake_green_claimed: false,
    });
  }

  REQUIRED_ARTIFACTS.forEach(requireArtifact);

  const matrix = readMatrix();
  if (
    matrix.final_status !== "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY" ||
    matrix.fake_green_claimed !== false
  ) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_NOT_GREEN:${matrix.final_status ?? "unknown"}`);
  }
}

main();
