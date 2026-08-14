import {
  MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2,
  type Master11610ProfessionalDepthEvidenceViewV2,
} from "../../src/lib/estimate/v4/professionalDepth/professionalDepthReferenceContractV2";

export type ReadOnlyAsphaltProfessionalDepthMetaBenchmarkV2 = {
  role: "READ_ONLY_PROFESSIONAL_DEPTH_ACCEPTANCE_META_BENCHMARK";
  referenceHead: string;
  referenceTree: string;
  transferContractSha256: string;
  admissionSha256: string;
  manifestSha256: string;
  invariantIds: typeof MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2;
  contentExportedToDomain: false;
  rowCountsUsedAsQuota: false;
};

export function createReadOnlyAsphaltProfessionalDepthMetaBenchmarkV2(input: {
  referenceHead: string;
  referenceTree: string;
  transferContractSha256: string;
  admissionSha256: string;
  manifestSha256: string;
}): ReadOnlyAsphaltProfessionalDepthMetaBenchmarkV2 {
  return {
    role: "READ_ONLY_PROFESSIONAL_DEPTH_ACCEPTANCE_META_BENCHMARK",
    ...input,
    invariantIds: MASTER_11610_PROFESSIONAL_DEPTH_INVARIANTS_V2,
    contentExportedToDomain: false,
    rowCountsUsedAsQuota: false,
  };
}

export function createIndependentDomainProfessionalDepthEvidenceViewV2(
  input: Master11610ProfessionalDepthEvidenceViewV2,
): Master11610ProfessionalDepthEvidenceViewV2 {
  if (!input.domainId.trim()) throw new Error("PROFESSIONAL_DEPTH_DOMAIN_ID_MISSING");
  if (input.domainIsolationProof.contentCopiedFromReference !== 0) {
    throw new Error("PROFESSIONAL_DEPTH_REFERENCE_CONTENT_COPY_FORBIDDEN");
  }
  return input;
}
