import fs from "node:fs";
import path from "node:path";

import {
  buildBuiltInAi10000PostBoqCatalogProofArtifacts,
  writeBuiltInAi10000PostBoqCatalogProofArtifacts,
} from "../../scripts/e2e/runBuiltInAi10000PostBoqCatalogProof";

type Ai10000PostBoqArtifacts = Awaited<ReturnType<typeof buildBuiltInAi10000PostBoqCatalogProofArtifacts>>;

let cached: Promise<Ai10000PostBoqArtifacts> | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", name), "utf8")) as T;
}

function readExistingArtifacts(): Ai10000PostBoqArtifacts | null {
  const matrixPath = path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_matrix.json");
  if (!fs.existsSync(matrixPath)) return null;
  const matrix = readJson<Ai10000PostBoqArtifacts["matrix"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_matrix.json");
  if (matrix.final_status !== "GREEN_BUILT_IN_AI_10000_POST_BOQ_CATALOG_READY") return null;
  return {
    prerequisite: {
      path: "artifacts/S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_matrix.json",
      expectedStatus: "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY",
      present: true,
      green: true,
      finalStatus: "GREEN_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY",
      fakeGreenClaimed: false,
    },
    manifest: readJson<Ai10000PostBoqArtifacts["manifest"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_manifest.json"),
    domainSummary: readJson<Ai10000PostBoqArtifacts["domainSummary"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_domain_summary.json"),
    runtimeTranscripts: readJson<Ai10000PostBoqArtifacts["runtimeTranscripts"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_runtime_transcripts.json"),
    routeTrace: readJson<Ai10000PostBoqArtifacts["routeTrace"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_route_trace.json"),
    catalogBindings: readJson<Ai10000PostBoqArtifacts["catalogBindings"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_catalog_bindings.json"),
    sourceEvidence: readJson<Ai10000PostBoqArtifacts["sourceEvidence"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_source_evidence.json"),
    pdfPayloads: readJson<Ai10000PostBoqArtifacts["pdfPayloads"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_pdf_payloads.json"),
    productResults: readJson<Ai10000PostBoqArtifacts["productResults"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_product_results.json"),
    failures: readJson<Ai10000PostBoqArtifacts["failures"]>("S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_failures.json"),
    matrix,
    proof: fs.readFileSync(path.join(process.cwd(), "artifacts", "S_BUILT_IN_AI_10000_POST_BOQ_CATALOG_proof.md"), "utf8"),
    sourceEvidenceForRuntime: () => {
      throw new Error("Existing artifact helper does not hydrate runtime-only source evidence builder.");
    },
  } as Ai10000PostBoqArtifacts;
}

export function getAi10000PostBoqArtifacts() {
  cached ??= Promise.resolve(readExistingArtifacts()).then((existing) =>
    existing ?? writeBuiltInAi10000PostBoqCatalogProofArtifacts({ requireRuntimeArtifacts: false }),
  );
  return cached;
}
