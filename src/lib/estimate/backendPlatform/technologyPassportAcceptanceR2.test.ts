import { buildBatch001DrywallTechnologyPassportDraftR1 } from "../v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";
import {
  TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
  TECHNOLOGY_PASSPORT_CANDIDATE_R2_CONTRACT,
  evaluateTechnologyPassportAdmissionR2,
  technologyPassportContentR2Sha256,
  technologyPassportSourceSetR2Sha256,
  type TechnologyPassportAcceptanceManifestR2,
  type TechnologyPassportCandidateR2,
  type TechnologySourceClaimR2,
} from "./technologyPassportAcceptanceR2";

const CATALOG_ID = "drywall_ceiling_interior_bulkhead_frame_large_area";
const RUNTIME_DEFINITION_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RUNTIME_ROWS_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function candidate(): TechnologyPassportCandidateR2 {
  const passport = buildBatch001DrywallTechnologyPassportDraftR1(CATALOG_ID);
  const evidenceById = new Map(passport.provenance.evidence.map((evidence) => [evidence.evidenceId, evidence]));
  const sourceClaims: TechnologySourceClaimR2[] = passport.normSources.map((source, index) => {
    const evidence = evidenceById.get(source.evidenceId)!;
    return {
      claimId: `claim-${index + 1}-${source.sourceId}`,
      sourceId: source.sourceId,
      documentTitle: source.title,
      standardOwner: evidence.sourceKind === "MANUFACTURER_TDS" ? "manufacturer" : "project engineering owner",
      editionOrDate: source.editionOrVersion,
      pageOrSection: source.locator,
      claimType: "PROJECT_REQUIREMENT",
      claimTextNormalized: source.applicabilityRu.normalize("NFKC").trim(),
      appliesToCatalogIds: [passport.catalogId],
      sourceFileSha256: evidence.contentSha256,
      reviewedBy: "source-reviewer-17",
    };
  });
  return {
    contract: TECHNOLOGY_PASSPORT_CANDIDATE_R2_CONTRACT,
    passport,
    author: {
      auditIdentity: "passport-author-42",
      role: "ENGINEER",
      authorshipOrigin: "HUMAN_ENGINEERING_WORKFLOW",
      createdByAgent: false,
    },
    sourceClaims,
  };
}

function acceptance(value: TechnologyPassportCandidateR2): TechnologyPassportAcceptanceManifestR2 {
  return {
    contract: TECHNOLOGY_PASSPORT_ACCEPTANCE_R2_CONTRACT,
    catalogId: value.passport.catalogId,
    technologyVariantId: value.passport.technologyVariantId,
    passportContentSha256: technologyPassportContentR2Sha256(value.passport),
    sourceSetSha256: technologyPassportSourceSetR2Sha256(value.sourceClaims),
    reviewerId: "independent-reviewer-84",
    reviewerRole: "engineer",
    reviewerScope: "drywall systems and quantity rules",
    decision: "ACCEPTED",
    comment: "Passport content and each source claim were checked independently.",
    acceptedAtUtc: "2026-08-21T12:00:00.000Z",
    signatureOrAuditId: "engineering-audit-20260821-0001",
    acceptanceOrigin: "HUMAN_SIGNED_AUDIT",
    createdByAgent: false,
  };
}

describe("Technology Passport R2 human acceptance", () => {
  it("keeps a structurally complete passport DRAFT without a separate human manifest", () => {
    const decision = evaluateTechnologyPassportAdmissionR2(
      candidate(),
      null,
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision).toMatchObject({ allowed: false, status: "DRAFT" });
    expect(decision.errors).toContain("HUMAN_ACCEPTANCE_MANIFEST_MISSING");
  });

  it("accepts only an exact content/source binding reviewed by a different engineer", () => {
    const value = candidate();
    const decision = evaluateTechnologyPassportAdmissionR2(
      value,
      acceptance(value),
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision).toMatchObject({
      allowed: true,
      status: "ENGINEER_ACCEPTED",
      errors: [],
      structuralDecision: { allowed: true, status: "GREEN" },
    });
  });

  it("returns to DRAFT when passport content changes after acceptance", () => {
    const value = candidate();
    const signed = acceptance(value);
    const changed: TechnologyPassportCandidateR2 = {
      ...value,
      passport: { ...value.passport, publicWorkTitleRu: `${value.passport.publicWorkTitleRu}!` },
    };
    const decision = evaluateTechnologyPassportAdmissionR2(
      changed,
      signed,
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision).toMatchObject({ allowed: false, status: "DRAFT" });
    expect(decision.errors).toContain("ACCEPTED_PASSPORT_HASH_STALE");
  });

  it("returns to DRAFT when the source set changes after acceptance", () => {
    const value = candidate();
    const signed = acceptance(value);
    const changed: TechnologyPassportCandidateR2 = {
      ...value,
      sourceClaims: value.sourceClaims.map((claim, index) => index === 0
        ? { ...claim, pageOrSection: `${claim.pageOrSection}; independently amended locator` }
        : claim),
    };
    const decision = evaluateTechnologyPassportAdmissionR2(
      changed,
      signed,
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision.errors).toContain("ACCEPTED_SOURCE_SET_HASH_STALE");
  });

  it("rejects self-review and an agent-generated acceptance declaration", () => {
    const value = candidate();
    const signed = acceptance(value);
    const unsafe = {
      ...signed,
      reviewerId: value.author.auditIdentity,
      createdByAgent: true,
    } as unknown as TechnologyPassportAcceptanceManifestR2;
    const decision = evaluateTechnologyPassportAdmissionR2(
      value,
      unsafe,
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision.errors).toEqual(expect.arrayContaining([
      "AUTHOR_REVIEWER_IDENTITY_COLLISION",
      "FAKE_OR_GENERATED_ACCEPTANCE",
    ]));
  });

  it("rejects compiler output as a source claim", () => {
    const value = candidate();
    const unsafe: TechnologyPassportCandidateR2 = {
      ...value,
      sourceClaims: value.sourceClaims.map((claim, index) => index === 0
        ? { ...claim, sourceFileSha256: RUNTIME_ROWS_SHA }
        : claim),
    };
    const decision = evaluateTechnologyPassportAdmissionR2(
      unsafe,
      acceptance(unsafe),
      [RUNTIME_DEFINITION_SHA, RUNTIME_ROWS_SHA],
    );
    expect(decision.errors).toEqual(expect.arrayContaining([
      expect.stringContaining("SOURCE_CLAIM_REUSES_RUNTIME_SOURCE:"),
      expect.stringContaining("SOURCE_CLAIM_FILE_BINDING_MISMATCH:"),
    ]));
  });
});
