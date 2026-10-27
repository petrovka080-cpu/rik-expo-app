import { canonicalEstimateStableJson } from "./canonicalEstimateDeterminism";
import { canonicalEstimateSha256HexText } from "./canonicalEstimateSha256";
import {
  evaluateTechnologyPassportR1,
  type TechnologyPassportDecisionR1,
  type TechnologyPassportR1,
} from "./technologyPassportR1";

export const TECHNOLOGY_PASSPORT_CANDIDATE_R2_CONTRACT =
  "real-useful-estimates.technology-passport-candidate-r2.v1" as const;
export const TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT =
  "real-useful-estimates.technology-passport-human-acceptance-r2.v1" as const;

export type TechnologySourceClaimTypeR2 =
  | "PROJECT_REQUIREMENT"
  | "MATERIAL_PRESENCE"
  | "CONSUMPTION_RATE"
  | "FORMULA"
  | "EQUIPMENT_SELECTION"
  | "DELIVERY_FLOW"
  | "WASTE_FLOW"
  | "EXCLUSION"
  | "PRELIMINARY_ASSUMPTION";

export type TechnologySourceClaimR2 = {
  claimId: string;
  sourceId: string;
  documentTitle: string;
  standardOwner: string;
  editionOrDate: string;
  pageOrSection: string;
  claimType: TechnologySourceClaimTypeR2;
  claimTextNormalized: string;
  appliesToCatalogIds: readonly string[];
  sourceFileSha256: string;
  reviewedBy: string;
};

export type TechnologyPassportCandidateR2 = {
  contract: typeof TECHNOLOGY_PASSPORT_CANDIDATE_R2_CONTRACT;
  passport: TechnologyPassportR1;
  author: {
    auditIdentity: string;
    role: "ENGINEER";
    authorshipOrigin: "HUMAN_ENGINEERING_WORKFLOW";
    createdByAgent: false;
  };
  sourceClaims: readonly TechnologySourceClaimR2[];
};

export type TechnologyPassportAcceptanceManifestR2 = {
  contract: typeof TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT;
  catalogId: string;
  technologyVariantId: string;
  passportContentSha256: string;
  sourceSetSha256: string;
  reviewerId: string;
  reviewerRole: "engineer";
  reviewerScope: string;
  decision: "ACCEPTED" | "REJECTED" | "NEEDS_CHANGES";
  comment: string;
  acceptedAtUtc: string;
  signatureOrAuditId: string;
  acceptanceOrigin: "HUMAN_SIGNED_AUDIT";
  createdByAgent: false;
};

export type TechnologyPassportAdmissionDecisionR2 = {
  contract: typeof TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT;
  allowed: boolean;
  status: "ENGINEER_ACCEPTED" | "DRAFT" | "REJECTED";
  errors: readonly string[];
  passportContentSha256: string;
  sourceSetSha256: string;
  structuralDecision: TechnologyPassportDecisionR1;
  acceptanceManifestSha256: string | null;
};

const SHA256 = /^[a-f0-9]{64}$/u;
const PLACEHOLDER_IDENTITY = /^(?:unassigned|unknown|pending|agent|codex|ai)(?:[-_: ].*)?$/iu;

function nonBlank(value: string): boolean {
  return value.normalize("NFKC").trim().length > 0;
}

function acceptedIsoTimestamp(value: string): boolean {
  const timestamp = new Date(value).getTime();
  return nonBlank(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values.map((item) => item.normalize("NFKC").trim())) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function technologyPassportContentR2Sha256(passport: TechnologyPassportR1): string {
  const { review: _review, ...contentProvenance } = passport.provenance;
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson({
    ...passport,
    provenance: contentProvenance,
  }));
}

export function technologyPassportSourceSetR2Sha256(claims: readonly TechnologySourceClaimR2[]): string {
  const sorted = [...claims].sort((left, right) =>
    `${left.sourceId}\u0000${left.claimId}`.localeCompare(`${right.sourceId}\u0000${right.claimId}`));
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson(sorted));
}

export function technologyPassportAcceptanceManifestR2Sha256(
  manifest: TechnologyPassportAcceptanceManifestR2,
): string {
  return canonicalEstimateSha256HexText(canonicalEstimateStableJson(manifest));
}

export function evaluateTechnologyPassportAdmissionR2(
  candidate: TechnologyPassportCandidateR2,
  acceptance: TechnologyPassportAcceptanceManifestR2 | null,
  runtimeSourceHashes: readonly string[],
): TechnologyPassportAdmissionDecisionR2 {
  const errors: string[] = [];
  const add = (code: string): void => {
    errors.push(code);
  };
  const passport = candidate.passport;
  const passportContentSha256 = technologyPassportContentR2Sha256(passport);
  const sourceSetSha256 = technologyPassportSourceSetR2Sha256(candidate.sourceClaims);

  if (candidate.contract !== TECHNOLOGY_PASSPORT_CANDIDATE_R2_CONTRACT) add("PASSPORT_CANDIDATE_CONTRACT_DRIFT");
  if (!nonBlank(candidate.author.auditIdentity) || PLACEHOLDER_IDENTITY.test(candidate.author.auditIdentity)) {
    add("PASSPORT_AUTHOR_AUDIT_IDENTITY_INVALID");
  }
  if (candidate.author.role !== "ENGINEER") add("PASSPORT_AUTHOR_ROLE_INVALID");
  if (candidate.author.authorshipOrigin !== "HUMAN_ENGINEERING_WORKFLOW" || candidate.author.createdByAgent !== false) {
    add("PASSPORT_AUTHORSHIP_NOT_HUMAN_ENGINEERING_WORKFLOW");
  }
  if (candidate.sourceClaims.length === 0) add("SOURCE_CLAIM_SET_EMPTY");
  for (const duplicate of duplicateValues(candidate.sourceClaims.map((claim) => claim.claimId))) {
    add(`DUPLICATE_SOURCE_CLAIM_ID:${duplicate}`);
  }

  const evidenceById = new Map(passport.provenance.evidence.map((evidence) => [evidence.evidenceId, evidence]));
  const normSourceById = new Map(passport.normSources.map((source) => [source.sourceId, source]));
  const runtimeHashes = new Set(runtimeSourceHashes.map((value) => value.toLowerCase()));
  const claimsBySourceId = new Map<string, TechnologySourceClaimR2[]>();
  for (const claim of candidate.sourceClaims) {
    const identityFields = [claim.claimId, claim.sourceId, claim.documentTitle, claim.standardOwner,
      claim.editionOrDate, claim.pageOrSection, claim.claimTextNormalized, claim.reviewedBy];
    if (identityFields.some((value) => !nonBlank(value))) add(`SOURCE_CLAIM_INCOMPLETE:${claim.claimId}`);
    if (!SHA256.test(claim.sourceFileSha256)) add(`SOURCE_CLAIM_SHA256_INVALID:${claim.claimId}`);
    if (runtimeHashes.has(claim.sourceFileSha256.toLowerCase())) add(`SOURCE_CLAIM_REUSES_RUNTIME_SOURCE:${claim.claimId}`);
    if (!claim.appliesToCatalogIds.includes(passport.catalogId)) add(`SOURCE_CLAIM_CATALOG_SCOPE_MISSING:${claim.claimId}`);
    const normSource = normSourceById.get(claim.sourceId);
    if (!normSource) {
      add(`SOURCE_CLAIM_UNKNOWN_NORM_SOURCE:${claim.claimId}:${claim.sourceId}`);
    } else {
      const evidence = evidenceById.get(normSource.evidenceId);
      if (!evidence) add(`SOURCE_CLAIM_EVIDENCE_MISSING:${claim.claimId}:${normSource.evidenceId}`);
      else if (evidence.contentSha256.toLowerCase() !== claim.sourceFileSha256.toLowerCase()) {
        add(`SOURCE_CLAIM_FILE_BINDING_MISMATCH:${claim.claimId}:${claim.sourceId}`);
      }
    }
    const sourceClaims = claimsBySourceId.get(claim.sourceId) ?? [];
    sourceClaims.push(claim);
    claimsBySourceId.set(claim.sourceId, sourceClaims);
  }
  for (const sourceId of normSourceById.keys()) {
    if ((claimsBySourceId.get(sourceId) ?? []).length === 0) add(`NORM_SOURCE_CLAIM_MISSING:${sourceId}`);
  }

  let acceptanceManifestSha256: string | null = null;
  let projectedPassport = passport;
  let accepted = false;
  if (!acceptance) {
    add("HUMAN_ACCEPTANCE_MANIFEST_MISSING");
  } else {
    acceptanceManifestSha256 = technologyPassportAcceptanceManifestR2Sha256(acceptance);
    if (acceptance.contract !== TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT) add("HUMAN_ACCEPTANCE_CONTRACT_DRIFT");
    if (acceptance.acceptanceOrigin !== "HUMAN_SIGNED_AUDIT" || acceptance.createdByAgent !== false) {
      add("FAKE_OR_GENERATED_ACCEPTANCE");
    }
    if (!nonBlank(acceptance.reviewerId) || PLACEHOLDER_IDENTITY.test(acceptance.reviewerId)) {
      add("ENGINEER_REVIEWER_ID_INVALID");
    }
    if (acceptance.reviewerRole !== "engineer") add("ENGINEER_REVIEWER_ROLE_INVALID");
    if (acceptance.reviewerId === candidate.author.auditIdentity) add("AUTHOR_REVIEWER_IDENTITY_COLLISION");
    if (!nonBlank(acceptance.reviewerScope)) add("ENGINEER_REVIEWER_SCOPE_MISSING");
    if (!nonBlank(acceptance.comment)) add("ENGINEER_REVIEW_COMMENT_MISSING");
    if (!acceptedIsoTimestamp(acceptance.acceptedAtUtc)) add("ENGINEER_REVIEW_TIMESTAMP_INVALID");
    if (!nonBlank(acceptance.signatureOrAuditId) || PLACEHOLDER_IDENTITY.test(acceptance.signatureOrAuditId)) {
      add("ENGINEER_SIGNATURE_OR_AUDIT_ID_INVALID");
    }
    if (acceptance.catalogId !== passport.catalogId) add("ACCEPTANCE_CATALOG_ID_MISMATCH");
    if (acceptance.technologyVariantId !== passport.technologyVariantId) add("ACCEPTANCE_VARIANT_ID_MISMATCH");
    if (acceptance.passportContentSha256 !== passportContentSha256) add("ACCEPTED_PASSPORT_HASH_STALE");
    if (acceptance.sourceSetSha256 !== sourceSetSha256) add("ACCEPTED_SOURCE_SET_HASH_STALE");
    if (acceptance.decision !== "ACCEPTED") add(`ENGINEER_DECISION_NOT_ACCEPTED:${acceptance.decision}`);
    accepted = errors.length === 0;
    if (accepted) {
      projectedPassport = {
        ...passport,
        provenance: {
          ...passport.provenance,
          review: {
            status: "ENGINEER_ACCEPTED",
            reviewerId: acceptance.reviewerId,
            reviewedAt: acceptance.acceptedAtUtc,
            reviewEvidenceSha256: acceptanceManifestSha256,
          },
        },
      };
    }
  }

  const structuralDecision = evaluateTechnologyPassportR1(projectedPassport, runtimeSourceHashes);
  for (const error of structuralDecision.errors) add(error);
  const uniqueErrors = [...new Set(errors)].sort();
  const rejected = acceptance?.decision === "REJECTED";
  return {
    contract: TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
    allowed: accepted && structuralDecision.allowed && uniqueErrors.length === 0,
    status: rejected ? "REJECTED" : accepted && structuralDecision.allowed && uniqueErrors.length === 0
      ? "ENGINEER_ACCEPTED" : "DRAFT",
    errors: uniqueErrors,
    passportContentSha256,
    sourceSetSha256,
    structuralDecision,
    acceptanceManifestSha256,
  };
}
