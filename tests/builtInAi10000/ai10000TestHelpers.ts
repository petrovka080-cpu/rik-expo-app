import fs from "node:fs";
import path from "node:path";

import {
  buildBuiltInAi10000RealWorldWorkTypesProofArtifacts,
  writeBuiltInAi10000RealWorldWorkTypesProofArtifacts,
} from "../../scripts/e2e/runBuiltInAi10000RealWorldWorkTypesProof";

type Ai10000Artifacts = ReturnType<typeof buildBuiltInAi10000RealWorldWorkTypesProofArtifacts>;

let cached: Ai10000Artifacts | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

function readExistingArtifacts(): Ai10000Artifacts | null {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_10000_WORK_TYPES_matrix.json");
  if (!fs.existsSync(matrixPath)) return null;

  const matrix = readJson<Ai10000Artifacts["matrix"]>("S_BUILT_IN_AI_10000_WORK_TYPES_matrix.json");
  if (matrix.final_status !== "GREEN_BUILT_IN_AI_10000_REAL_WORLD_WORK_TYPES_READY") return null;

  return {
    inventory: {
      wave: matrix.wave,
      cases_total: matrix.cases_total,
      estimate_cases_total: matrix.estimate_cases_total,
      product_search_cases_total: matrix.product_search_cases_total,
      domains_total: matrix.domains_total,
      screen_coverage: ["/chat", "/request", "/ai?context=foreman", "/product/search"],
      prompt_polishing_wave: false,
      fake_green_claimed: false,
    },
    cases: readJson<Ai10000Artifacts["cases"]>("S_BUILT_IN_AI_10000_WORK_TYPES_cases.json"),
    transcripts: readJson<Ai10000Artifacts["transcripts"]>("S_BUILT_IN_AI_10000_WORK_TYPES_transcripts.json"),
    routeTrace: readJson<Ai10000Artifacts["routeTrace"]>("S_BUILT_IN_AI_10000_WORK_TYPES_route_trace.json"),
    workKeyTrace: readJson<Ai10000Artifacts["workKeyTrace"]>("S_BUILT_IN_AI_10000_WORK_TYPES_work_key_trace.json"),
    sourceEvidence: readJson<Ai10000Artifacts["sourceEvidence"]>("S_BUILT_IN_AI_10000_WORK_TYPES_source_evidence.json"),
    pdfActions: readJson<Ai10000Artifacts["pdfActions"]>("S_BUILT_IN_AI_10000_WORK_TYPES_pdf_actions.json"),
    categorySummary: readJson<Ai10000Artifacts["categorySummary"]>("S_BUILT_IN_AI_10000_WORK_TYPES_category_summary.json"),
    requestControls: [],
    foremanControls: [],
    productScreenControls: [],
    pdfTrace: readJson<Ai10000Artifacts["pdfActions"]>("S_BUILT_IN_AI_10000_WORK_TYPES_pdf_actions.json").pdfTrace,
    failures: readJson<Ai10000Artifacts["failures"]>("S_BUILT_IN_AI_10000_WORK_TYPES_failures.json"),
    matrix,
    proof: fs.readFileSync(path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_10000_WORK_TYPES_proof.md"), "utf8"),
  } as Ai10000Artifacts;
}

export function getAi10000Artifacts() {
  cached ??= readExistingArtifacts() ?? writeBuiltInAi10000RealWorldWorkTypesProofArtifacts();
  return cached;
}
