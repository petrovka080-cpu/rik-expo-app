import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
);

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

function main(): void {
  execSync("npx tsx scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts", {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  [
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
  ].forEach(requireArtifact);

  const matrix = readMatrix();
  if (
    matrix.final_status !== "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY" ||
    matrix.fake_green_claimed !== false
  ) {
    throw new Error(`LIVE_BOQ_PDF_CATALOG_NOT_GREEN:${matrix.final_status ?? "unknown"}`);
  }
}

main();
