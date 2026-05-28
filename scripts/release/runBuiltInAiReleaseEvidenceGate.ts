import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CLOSEOUT_DIR = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT");

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function main(): void {
  const gateIndex = process.argv.indexOf("--gate");
  const gate = gateIndex >= 0 ? process.argv[gateIndex + 1] : "";
  const supportedGates = new Set([
    "built-in-ai-1000-work-types-proof",
    "built-in-ai-1000-post-boq-catalog-proof",
  ]);
  if (!supportedGates.has(gate)) {
    throw new Error(`Unsupported built-in AI evidence gate: ${gate || "missing"}`);
  }

  const sourceMatrixPath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_matrix.json");
  const sourceMatrix = readJson(sourceMatrixPath);
  const ok =
    sourceMatrix.final_status === "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY" &&
    sourceMatrix.cases_total === 1000 &&
    sourceMatrix.cases_passed === 1000 &&
    sourceMatrix.fake_green_claimed === false;

  const evidence = {
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    gate,
    final_status: ok
      ? gate === "built-in-ai-1000-post-boq-catalog-proof"
        ? "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_EVIDENCE_BRIDGED"
        : "GREEN_BUILT_IN_AI_1000_WORK_TYPES_EVIDENCE_BRIDGED"
      : "BLOCKED_BUILT_IN_AI_1000_SUCCESSOR_EVIDENCE_MISSING",
    source_matrix_path: path.relative(process.cwd(), sourceMatrixPath).replace(/\\/g, "/"),
    source_final_status: sourceMatrix.final_status ?? null,
    source_cases_total: sourceMatrix.cases_total ?? null,
    source_cases_passed: sourceMatrix.cases_passed ?? null,
    successor_gate: gate === "built-in-ai-1000-work-types-proof" ? "built-in-ai-1000-post-boq-catalog-proof" : null,
    head_sha: git(["rev-parse", "HEAD"], "unknown"),
    branch: git(["branch", "--show-current"], "unknown"),
    fake_green_claimed: false,
  };

  fs.mkdirSync(CLOSEOUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CLOSEOUT_DIR, `${gate.replace(/[^a-z0-9_-]/gi, "_")}_evidence.json`),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  if (!ok) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exitCode = 1;
    return;
  }

  console.info(evidence.final_status);
}

main();
