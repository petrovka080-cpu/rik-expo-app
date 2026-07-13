import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  PRODUCTION_1560_ACCEPTANCE_ARTIFACT_DIR,
  buildProduction1560AcceptanceMatrix,
  buildProduction1560SampleDistribution,
  previous10000GreenStatusFromMatrix,
  runProduction1560BrowserRepresentativeAudit,
  runProduction1560CompileAudit,
  runProduction1560ContaminationAudit,
  runProduction1560CurrencyAudit,
  runProduction1560EditablePriceAudit,
  runProduction1560PdfSnapshotAudit,
  runProduction1560PresentationAudit,
  runProduction1560SmartSearchAudit,
  selectProduction1560AcceptanceSample,
} from "../../src/lib/ai/estimateTemplate10000";

export const artifactDir = path.resolve(process.cwd(), PRODUCTION_1560_ACCEPTANCE_ARTIFACT_DIR);
const previous10000MatrixPath = path.resolve(
  process.cwd(),
  "artifacts/S_AI_ESTIMATE_10000_PROFESSIONAL_EXPANDED_WORK_TEMPLATES/matrix.json",
);

export async function writeJsonArtifact(fileName: string, value: unknown): Promise<void> {
  await mkdir(artifactDir, { recursive: true });
  await writeFile(path.join(artifactDir, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw.replace(/^\uFEFF/, "")) as T;
  } catch {
    return fallback;
  }
}

function git(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

export async function previous10000TemplateGreenFound(): Promise<boolean> {
  const matrix = await readJsonFile<Record<string, unknown>>(previous10000MatrixPath, {});
  return previous10000GreenStatusFromMatrix(matrix);
}

export async function writeStartStatusArtifact(): Promise<void> {
  await writeJsonArtifact("start_status.json", {
    wave: "S_AI_ESTIMATE_1560_REAL_WORK_ACCEPTANCE_AUDIT_AFTER_10000_TEMPLATES_CLOSEOUT_POINT_OF_NO_RETURN",
    git_status_short_branch_untracked_all: git(["status", "--short", "--branch", "--untracked-files=all"]).stdout,
    diff_check_exit: git(["diff", "--check"]).status,
    previous_10000_matrix_path: previous10000MatrixPath,
    previous_10000_template_green_found: await previous10000TemplateGreenFound(),
    source_tree_was_clean_at_start: false,
    previous_source_changes_were_uncommitted: true,
    fake_green_claimed: false,
  });
}

export async function writeSampleArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("sample_1560_manifest.json", sample);
  await writeJsonArtifact("sample_distribution.json", buildProduction1560SampleDistribution(sample));
}

export async function writeCompileArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("compile_results_1560.json", runProduction1560CompileAudit(sample));
}

export async function writeSmartSearchArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("smart_search_results_1560.json", runProduction1560SmartSearchAudit(sample));
}

export async function writePresentationArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("presentation_results_1560.json", runProduction1560PresentationAudit(sample));
}

export async function writeContaminationArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("contamination_results_1560.json", runProduction1560ContaminationAudit(sample));
}

export async function writeEditablePriceArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("editable_price_results_1560.json", runProduction1560EditablePriceAudit(sample));
}

export async function writeCurrencyArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("currency_results_1560.json", runProduction1560CurrencyAudit(sample));
}

export async function writePdfSnapshotArtifacts(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  await writeJsonArtifact("pdf_snapshot_results_60.json", runProduction1560PdfSnapshotAudit(sample));
}

export async function writeBrowserRepresentativeArtifacts(input: { playwrightChromiumPassed?: boolean } = {}): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  const browser = runProduction1560BrowserRepresentativeAudit(sample);
  await writeJsonArtifact("browser_results_120.json", {
    ...browser,
    playwright_chromium_passed: input.playwrightChromiumPassed === true,
  });
}

async function readBrowserPlaywrightPassed(): Promise<boolean> {
  const artifact = await readJsonFile<Record<string, unknown>>(path.join(artifactDir, "browser_results_120.json"), {});
  return artifact.playwright_chromium_passed === true;
}

export async function writeFailureExamplesArtifact(): Promise<void> {
  const sample = selectProduction1560AcceptanceSample();
  const compile = runProduction1560CompileAudit(sample);
  const smartSearch = runProduction1560SmartSearchAudit(sample);
  const presentation = runProduction1560PresentationAudit(sample);
  const contamination = runProduction1560ContaminationAudit(sample);
  const editable = runProduction1560EditablePriceAudit(sample);
  const currency = runProduction1560CurrencyAudit(sample);
  const pdf = runProduction1560PdfSnapshotAudit(sample);
  const browser = runProduction1560BrowserRepresentativeAudit(sample);
  await writeJsonArtifact("failure_examples.json", {
    compile: compile.failures.slice(0, 20),
    smart_search: smartSearch.failures.slice(0, 20),
    presentation: presentation.failures.slice(0, 20),
    contamination: contamination.failures.slice(0, 20),
    editable_price: editable.failures.slice(0, 20),
    currency: currency.failures.slice(0, 20),
    pdf_snapshot: pdf.failures.slice(0, 20),
    browser: browser.failures.slice(0, 20),
    fake_green_claimed: false,
  });
}

export async function writeCloseoutArtifacts(input: {
  typecheckPassed?: boolean;
  lintPassed?: boolean;
  focusedTestsPassed?: boolean;
  playwrightChromiumPassed?: boolean;
} = {}): Promise<void> {
  await writeStartStatusArtifact();
  await writeSampleArtifacts();
  await writeCompileArtifacts();
  await writeSmartSearchArtifacts();
  await writePresentationArtifacts();
  await writeContaminationArtifacts();
  await writeEditablePriceArtifacts();
  await writeCurrencyArtifacts();
  await writePdfSnapshotArtifacts();
  if (input.playwrightChromiumPassed !== undefined) {
    await writeBrowserRepresentativeArtifacts({ playwrightChromiumPassed: input.playwrightChromiumPassed });
  } else {
    await writeBrowserRepresentativeArtifacts({ playwrightChromiumPassed: await readBrowserPlaywrightPassed() });
  }
  await writeFailureExamplesArtifact();
  const matrix = buildProduction1560AcceptanceMatrix({
    previous10000TemplateGreenFound: await previous10000TemplateGreenFound(),
    typecheckPassed: input.typecheckPassed,
    lintPassed: input.lintPassed,
    focusedTestsPassed: input.focusedTestsPassed,
    playwrightChromiumPassed: input.playwrightChromiumPassed ?? (await readBrowserPlaywrightPassed()),
  });
  await writeJsonArtifact("matrix.json", matrix);
  await writeJsonArtifact("CLOSEOUT_PROOF.json", {
    ...matrix,
    artifact_files: [
      "sample_1560_manifest.json",
      "sample_distribution.json",
      "compile_results_1560.json",
      "smart_search_results_1560.json",
      "presentation_results_1560.json",
      "contamination_results_1560.json",
      "editable_price_results_1560.json",
      "currency_results_1560.json",
      "pdf_snapshot_results_60.json",
      "browser_results_120.json",
      "failure_examples.json",
      "matrix.json",
      "CLOSEOUT_PROOF.json",
      "start_status.json",
    ],
  });
}
