import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { verifyProofLineage } from "../release/proofLineageVerifier";
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
  "artifacts/S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX/",
  "scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts",
  "scripts/e2e/runB2cRequestEmbeddedAiExpandedEstimateFixProof.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts",
  "scripts/release/",
  "tests/release/",
  "tests/architecture/real10000P1EvidenceRefreshReleaseGuard.contract.test.ts",
  "tests/architecture/releaseVerifyUsesCanonicalApi34Evidence.contract.test.ts",
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
    throw new Error(`LIVE_BOQ_PDF_CATALOG_NOT_GREEN:${matrix.final_status ?? "unknown"}`);
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
