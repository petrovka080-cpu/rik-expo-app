import { spawnSync } from "node:child_process";
import path from "node:path";

import { assertSourceFrozen } from "./assertSourceFrozen";
import { loadReleaseCandidate } from "./releaseCandidateState";
import { candidateRuntimeDir, writeJsonFile } from "./releasePipelineRuntime";
import { LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS } from "./liveBoqProductGate.shared";

function main(): void {
  assertSourceFrozen();
  const candidate = loadReleaseCandidate();
  const outputPath = path.join(candidateRuntimeDir(candidate), "product-gates", "live_boq.json");
  const command = [
    "node",
    "node_modules/tsx/dist/cli.mjs",
    "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
    "--mode=verify",
  ];
  const result = spawnSync(command[0], command.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 60_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const passed =
    result.status === 0 &&
    stdout.includes("GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY");
  const failures = [
    ...(result.status === 0 ? [] : ["LIVE_BOQ_VERIFY_EXIT_NONZERO"]),
    ...(stdout.includes("GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY")
      ? []
      : ["LIVE_BOQ_GREEN_MARKER_MISSING"]),
  ];

  const report = {
    final_status: passed ? LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS : "BLOCKED_LIVE_BOQ_PRODUCT_GATE",
    candidate_hash: candidate.candidateHash,
    source_commit: candidate.source_commit,
    command: command.join(" "),
    exit_code: result.status,
    live_boq_verified_in_proof_phase: true,
    stdout_tail: stdout.slice(-4000),
    stderr_tail: stderr.slice(-4000),
    failures,
    fake_green_claimed: false,
  };
  writeJsonFile(outputPath, report);
  console.log(JSON.stringify(report, null, 2));
  if (!passed) process.exit(1);
}

main();
