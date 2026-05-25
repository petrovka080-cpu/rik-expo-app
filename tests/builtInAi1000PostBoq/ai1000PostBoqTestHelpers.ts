import fs from "node:fs";
import path from "node:path";

import {
  buildBuiltInAi1000PostBoqCatalogProofArtifacts,
  writeBuiltInAi1000PostBoqCatalogProofArtifacts,
} from "../../scripts/e2e/runBuiltInAi1000PostBoqCatalogProof";

type Ai1000PostBoqArtifacts = Awaited<ReturnType<typeof buildBuiltInAi1000PostBoqCatalogProofArtifacts>>;

let cached: Promise<Ai1000PostBoqArtifacts> | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

function readExistingArtifacts(): Ai1000PostBoqArtifacts | null {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_matrix.json");
  if (!fs.existsSync(matrixPath)) return null;
  const matrix = readJson<Ai1000PostBoqArtifacts["matrix"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_matrix.json");
  if (matrix.final_status !== "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY") return null;
  return {
    requiredMatrices: [],
    inventory: {
      wave: String(matrix.wave),
      cases_total: Number(matrix.cases_total),
      estimate_cases_total: Number(matrix.estimate_cases_total),
      product_search_cases_total: Number(matrix.product_search_cases_total),
      required_anchors: [],
      category_summary: {},
      fake_green_claimed: false,
    },
    cases: readJson<Ai1000PostBoqArtifacts["cases"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_cases.json"),
    transcripts: readJson<Ai1000PostBoqArtifacts["transcripts"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_transcripts.json"),
    routeTrace: readJson<Ai1000PostBoqArtifacts["routeTrace"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_route_trace.json"),
    catalogBindings: readJson<Ai1000PostBoqArtifacts["catalogBindings"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_catalog_bindings.json"),
    sourceEvidence: readJson<Ai1000PostBoqArtifacts["sourceEvidence"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_source_evidence.json"),
    pdfPayloads: readJson<Ai1000PostBoqArtifacts["pdfPayloads"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_pdf_payloads.json"),
    saveSendPayloads: readJson<Ai1000PostBoqArtifacts["saveSendPayloads"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_save_send_payloads.json"),
    failures: readJson<Ai1000PostBoqArtifacts["failures"]>("S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_failures.json"),
    matrix,
    proof: fs.readFileSync(path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_proof.md"), "utf8"),
  } as Ai1000PostBoqArtifacts;
}

export function getAi1000PostBoqArtifacts() {
  cached ??= Promise.resolve(readExistingArtifacts()).then((existing) =>
    existing ?? writeBuiltInAi1000PostBoqCatalogProofArtifacts({ requireRuntimeArtifacts: false }),
  );
  return cached;
}
