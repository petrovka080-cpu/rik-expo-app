export function normalizeProofArtifactPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\/+/, "");
}

const ALLOWED_PROOF_ARTIFACT_PATTERNS: readonly RegExp[] = [
  /^artifacts\/S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG\//,
  /^artifacts\/S_REQUEST_ESTIMATE_PRODUCTION_SAFE_SELECTED_WORK_CATALOG_UX\//,
  /^artifacts\/S_REQUEST_ESTIMATE_SELECTED_WORK_ACTIVE_INPUT_CATALOG_SCROLL_EXACT_MATERIAL_UX\//,
  /^artifacts\/S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE\//,
  /^artifacts\/S_ENTERPRISE_VISIBLE_1000_STRUCTURED_ESTIMATE_REAL_INPUT_ACCEPTANCE\//,
  /^artifacts\/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING\//,
  /^artifacts\/S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT\//,
  /^artifacts\/S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE\//,
  /^artifacts\/S_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT\//,
  /^artifacts\/S_RELEASE_PROOF_PIPELINE_STABILIZATION\//,
  /^artifacts\/pdf\/live-request-embedded-ai-professional-boq-pdf-catalog\//,
];

export function isAllowedProofArtifactPath(filePath: string): boolean {
  const normalizedPath = normalizeProofArtifactPath(filePath);
  return ALLOWED_PROOF_ARTIFACT_PATTERNS.some((regex) => regex.test(normalizedPath));
}

export function allowedProofArtifactPatternsForDiagnostics(): string[] {
  return ALLOWED_PROOF_ARTIFACT_PATTERNS.map((regex) => regex.source);
}
