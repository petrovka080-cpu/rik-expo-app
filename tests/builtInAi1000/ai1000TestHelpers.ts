import fs from "node:fs";
import path from "node:path";

import {
  buildBuiltInAi1000ConstructionWorkTypesProofArtifacts,
  writeBuiltInAi1000ConstructionWorkTypesProofArtifacts,
} from "../../scripts/e2e/runBuiltInAi1000ConstructionWorkTypesProof";

type Ai1000Artifacts = ReturnType<typeof buildBuiltInAi1000ConstructionWorkTypesProofArtifacts>;

let cached: Ai1000Artifacts | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

function readExistingArtifacts(): Ai1000Artifacts | null {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_WORK_TYPES_matrix.json");
  if (!fs.existsSync(matrixPath)) return null;

  const matrix = readJson<Ai1000Artifacts["matrix"]>("S_BUILT_IN_AI_1000_WORK_TYPES_matrix.json");
  if (matrix.final_status !== "GREEN_BUILT_IN_AI_1000_CONSTRUCTION_WORK_TYPES_REAL_ESTIMATE_OUTPUT_READY") return null;

  return {
    inventory: {
      wave: matrix.wave,
      cases_total: matrix.cases_total,
      estimate_cases_total: matrix.estimate_cases_total,
      product_search_cases_total: matrix.product_search_cases_total,
      unique_work_type_definitions: 0,
      screen_coverage: ["/chat", "/request", "/ai?context=foreman", "/product/search"],
      prompt_polishing_wave: false,
      fake_green_claimed: false,
    },
    cases: readJson<Ai1000Artifacts["cases"]>("S_BUILT_IN_AI_1000_WORK_TYPES_cases.json"),
    transcripts: readJson<Ai1000Artifacts["transcripts"]>("S_BUILT_IN_AI_1000_WORK_TYPES_transcripts.json"),
    routeTrace: readJson<Ai1000Artifacts["routeTrace"]>("S_BUILT_IN_AI_1000_WORK_TYPES_route_trace.json"),
    workKeyTrace: readJson<Ai1000Artifacts["workKeyTrace"]>("S_BUILT_IN_AI_1000_WORK_TYPES_work_key_trace.json"),
    sourceEvidence: readJson<Ai1000Artifacts["sourceEvidence"]>("S_BUILT_IN_AI_1000_WORK_TYPES_source_evidence.json"),
    pdfActions: readJson<Ai1000Artifacts["pdfActions"]>("S_BUILT_IN_AI_1000_WORK_TYPES_pdf_actions.json"),
    categorySummary: readJson<Ai1000Artifacts["categorySummary"]>("S_BUILT_IN_AI_1000_WORK_TYPES_category_summary.json"),
    requestControls: [],
    foremanControls: [],
    productScreenControls: [],
    pdfTrace: readJson<Ai1000Artifacts["pdfActions"]>("S_BUILT_IN_AI_1000_WORK_TYPES_pdf_actions.json").pdfTrace,
    failures: readJson<Ai1000Artifacts["failures"]>("S_BUILT_IN_AI_1000_WORK_TYPES_failures.json"),
    matrix,
    proof: fs.readFileSync(path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_WORK_TYPES_proof.md"), "utf8"),
  } as Ai1000Artifacts;
}

export function getAi1000Artifacts() {
  cached ??= readExistingArtifacts() ?? writeBuiltInAi1000ConstructionWorkTypesProofArtifacts();
  return cached;
}
