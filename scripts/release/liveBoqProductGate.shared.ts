import { verifyProofLineage } from "./proofLineageVerifier";

export const LIVE_BOQ_TRACKED_GREEN_STATUS = "GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY";
export const LIVE_BOQ_PRODUCT_GATE_GREEN_STATUS = "GREEN_LIVE_BOQ_PRODUCT_GATE_READY";

export type LiveBoqArtifactFixture = {
  final_status?: unknown;
  fake_green_claimed?: unknown;
  source_code_head?: unknown;
  head?: unknown;
  artifact_only_supersession_allowed?: unknown;
};

export type LiveBoqVerificationResult = {
  passed: boolean;
  reason: string | null;
  fake_green_claimed: false;
};

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function verifyLiveBoqArtifactFixture(params: {
  artifact: LiveBoqArtifactFixture;
  currentHead: string;
  artifactPaths: string[];
}): LiveBoqVerificationResult {
  if (params.artifact.fake_green_claimed !== false) {
    return { passed: false, reason: "LIVE_BOQ_FAKE_GREEN", fake_green_claimed: false };
  }
  if (params.artifact.final_status !== LIVE_BOQ_TRACKED_GREEN_STATUS) {
    return { passed: false, reason: "LIVE_BOQ_NOT_GREEN", fake_green_claimed: false };
  }

  const sourceCodeHead = stringField(params.artifact.source_code_head) ?? stringField(params.artifact.head);
  if (!sourceCodeHead) {
    return { passed: false, reason: "LIVE_BOQ_LINEAGE_MISSING", fake_green_claimed: false };
  }

  const lineage = verifyProofLineage({
    wave: "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG",
    sourceCodeHead,
    currentHead: params.currentHead,
    artifactPaths: params.artifactPaths,
    allowArtifactOnlySupersession: params.artifact.artifact_only_supersession_allowed !== false,
  });
  return {
    passed: lineage.valid,
    reason: lineage.valid ? null : lineage.reason,
    fake_green_claimed: false,
  };
}
