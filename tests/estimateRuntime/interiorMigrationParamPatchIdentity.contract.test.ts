import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import {
  recalculateEstimateDraftRevision,
  recalculateEstimateDraftRevisionBatch,
} from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { resolvedEstimateIdentityChecksum } from "../../src/lib/estimate/resolvedEstimateIdentityChecksum";
import { DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallDomainCompletionProfessionalV7";
import { migrateInteriorFinishesProfessionalRevisionV4 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRevisionMigrationV4";
import {
  compileDomainCompletionWork,
  domainCompletionParameterValues,
} from "../aiEstimateV4/domainCompletionV7TestSupport";

const LEGACY_FIXTURE_CONTRACT = Object.freeze({
  schemaVersion: "interior-domain-revision:v1",
  sourceReleaseId: "interior-finishes-pre-domain-completion-v7",
  variantId: "high_load",
  passportVersion: "1.0.0",
  formulaGraphVersion: "FormulaGraphV1",
  compilerVersion: "interior-finishes-production-binding:v1",
  parentRevisionId: "interior-migration-param-patch:approved-parent",
  snapshotId: "interior-migration-param-patch:legacy-photo-snapshot",
  pdfArtifactId: "interior-migration-param-patch:legacy-pdf",
  buyerHandoffId: "interior-migration-param-patch:legacy-buyer-handoff",
  photoEvidenceIds: Object.freeze(["interior-migration-param-patch:photo-1"]),
});

function expectedCanonicalOwner(catalogId: string): string {
  return `domain-passport:drywall-domain-completion-v7:${catalogId}`;
}

function legacyRevision(): { catalogId: string; revision: EstimateDraftRevision } {
  const catalogId = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7[0];
  const production = compileDomainCompletionWork(catalogId);
  if (!production.draft) throw new Error(`TEST_DOMAIN_COMPLETION_DRAFT_MISSING:${catalogId}`);
  const paramOverrides = Object.fromEntries(
    Object.entries(domainCompletionParameterValues(catalogId)).map(([key, parameter]) => [
      key,
      {
        value: parameter.value,
        ...(parameter.unit_id ? { canonicalUnit: parameter.unit_id } : {}),
        source: "user_input" as const,
        lastChangedAt: parameter.captured_at,
      },
    ]),
  );
  const revision = createEstimateDraftRevision({
    estimateDraftId: "interior-migration-param-patch",
    rawInput: production.inventory.localized_name_ru,
    selectedTemplateId: `domain-passport:${catalogId}:v1`,
    selectedWorkKey: production.inventory.work_key,
    paramOverrides,
    prebuiltExactDraft: production.draft,
    createdAt: "2026-09-06T00:00:00.000Z",
  });
  if (!revision.resolvedIdentity) throw new Error("TEST_LEGACY_IDENTITY_MISSING");
  const legacyTemplateId = `domain-passport:${catalogId}:v1`;
  const legacyCalculationStrategyId = production.inventory.canonical_technology_id;
  const legacyIdentityWithoutChecksum = {
    ...revision.resolvedIdentity,
    requestedCatalogWorkId: catalogId,
    passportId: legacyTemplateId,
    passportVersion: LEGACY_FIXTURE_CONTRACT.passportVersion,
    calculationStrategyId: legacyCalculationStrategyId,
    calculationProfileId: legacyCalculationStrategyId,
    calculationProfileVersion: LEGACY_FIXTURE_CONTRACT.passportVersion,
    formulaGraphVersion: LEGACY_FIXTURE_CONTRACT.formulaGraphVersion,
    semanticOwner: legacyTemplateId,
    compilerVersion: LEGACY_FIXTURE_CONTRACT.compilerVersion,
    sourceBindingVersions: [{
      sourceId: LEGACY_FIXTURE_CONTRACT.sourceReleaseId,
      version: LEGACY_FIXTURE_CONTRACT.schemaVersion,
    }],
    legacyFallbackUsed: true,
    fallbackReason: "pre_registered_professional_owner",
  };
  const { checksum: _canonicalChecksum, ...legacyIdentity } = legacyIdentityWithoutChecksum;
  const rows = revision.boq.rows.map((row, index) => {
    const {
      drywallDomainCompletionRevisionMigratedV7: _domainCompletionMigration,
      legacyRevisionMigratedV4: _architecturalMigration,
      registeredProfessionalDomainV4: _registeredProfessionalDomain,
      revisionMigrationVersion: _revisionMigrationVersion,
      formulaGraphVersion: _formulaGraphVersion,
      resourceGraphVersion: _resourceGraphVersion,
      ...sourceParameters
    } = row.sourceParameters ?? {};
    return {
      ...row,
      templateId: legacyTemplateId,
      unitPrice: index === 0 ? 321 : row.unitPrice,
      priceStatus: index === 0 ? "USER_ENTERED_PRICE" : row.priceStatus,
      priceSource: index === 0 ? "user" : row.priceSource,
      sourceParameters: {
        ...sourceParameters,
        workSemanticOwner: legacyTemplateId,
        professionalEstimatePassportId: legacyTemplateId,
        calculationStrategyId: legacyCalculationStrategyId,
        formulaGraphVersion: LEGACY_FIXTURE_CONTRACT.formulaGraphVersion,
        legacyRevisionSchemaVersion: LEGACY_FIXTURE_CONTRACT.schemaVersion,
        sourceReleaseId: LEGACY_FIXTURE_CONTRACT.sourceReleaseId,
        variantId: LEGACY_FIXTURE_CONTRACT.variantId,
        photoEvidenceIds: [...LEGACY_FIXTURE_CONTRACT.photoEvidenceIds],
      },
    };
  });
  const frozenLegacyRevision: EstimateDraftRevision = {
    ...revision,
    previousRevisionId: LEGACY_FIXTURE_CONTRACT.parentRevisionId,
    selectedTemplateId: legacyTemplateId,
    resolvedIdentity: {
      ...legacyIdentity,
      checksum: resolvedEstimateIdentityChecksum(legacyIdentity),
    },
    boq: {
      sections: revision.boq.sections.map((section) => ({ ...section, rowIds: [...section.rowIds] })),
      rows,
    },
    trace: {
      ...revision.trace,
      selectedTemplateId: legacyTemplateId,
      params: revision.trace.params.map((param) => ({ ...param, affectsRowIds: [...param.affectsRowIds] })),
      rows: revision.trace.rows.map((row) => ({ ...row, sourceParamKeys: [...row.sourceParamKeys] })),
    },
    artifacts: {
      snapshotId: LEGACY_FIXTURE_CONTRACT.snapshotId,
      pdfArtifactId: LEGACY_FIXTURE_CONTRACT.pdfArtifactId,
      buyerHandoffId: LEGACY_FIXTURE_CONTRACT.buyerHandoffId,
      artifactsValidForRevisionId: revision.revisionId,
    },
  };
  return {
    catalogId,
    revision: frozenLegacyRevision,
  };
}

describe("interior revision migration parameter patch identity", () => {
  it("retargets a patch parsed before migration and preserves the requested catalog identity", () => {
    const { catalogId, revision } = legacyRevision();
    const patch = parseUserParamPatch({
      revision,
      operation: revision.params.area_m2 ? "update_param" : "add_param",
      paramKey: "area_m2",
      rawValue: "80 м2",
    });

    const result = recalculateEstimateDraftRevision(revision, patch, {
      createdAt: "2026-09-06T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(revision.selectedTemplateId).toBe(`domain-passport:${catalogId}:v1`);
    expect(result.revision.selectedTemplateId).toBe(expectedCanonicalOwner(catalogId));
    expect(result.revision.resolvedIdentity?.semanticOwner).toBe(expectedCanonicalOwner(catalogId));
    expect(result.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
    expect(result.revision.params.area_m2?.value).toBe(80);
    expect(result.revision.previousRevisionId).toBe(revision.revisionId);
    expect(result.revision.artifacts).toEqual({
      snapshotId: null,
      pdfArtifactId: null,
      buyerHandoffId: null,
      artifactsValidForRevisionId: null,
    });
    expect(revision.previousRevisionId).toBe(LEGACY_FIXTURE_CONTRACT.parentRevisionId);
    expect(revision.artifacts.snapshotId).toBe(LEGACY_FIXTURE_CONTRACT.snapshotId);
  });

  it("retargets every same-revision patch in a batch", () => {
    const { catalogId, revision } = legacyRevision();
    const patches = [
      parseUserParamPatch({
        revision,
        operation: revision.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "70 м2",
      }),
      parseUserParamPatch({
        revision,
        operation: revision.params.height_m ? "update_param" : "add_param",
        paramKey: "height_m",
        rawValue: "3 м",
      }),
    ];

    const result = recalculateEstimateDraftRevisionBatch(revision, patches, {
      createdAt: "2026-09-06T00:02:00.000Z",
      revisionIndex: 2,
    });

    expect(result.revision.selectedTemplateId).toBe(expectedCanonicalOwner(catalogId));
    expect(result.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
    expect(result.revision.params.area_m2?.value).toBe(70);
    expect(result.revision.params.height_m?.value).toBe(3);
  });

  it("still rejects a patch carrying a genuinely foreign template identity", () => {
    const { revision } = legacyRevision();
    const patch = {
      ...parseUserParamPatch({
        revision,
        operation: revision.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "60 м2",
      }),
      selectedTemplateId: "foreign-template-id",
    };

    expect(() => recalculateEstimateDraftRevision(revision, patch)).toThrow(
      "USER_PARAM_PATCH_INVALID:selected_template_id_mismatch",
    );
  });

  it("preserves the frozen legacy payload during routing migration and is idempotent", () => {
    const { catalogId, revision } = legacyRevision();
    const original = JSON.parse(JSON.stringify(revision));
    const migrated = migrateInteriorFinishesProfessionalRevisionV4(revision);

    expect(revision).toEqual(original);
    expect(migrated.selectedTemplateId).toBe(expectedCanonicalOwner(catalogId));
    expect(migrated.resolvedIdentity?.semanticOwner).toBe(expectedCanonicalOwner(catalogId));
    expect(migrated.resolvedIdentity?.legacyFallbackUsed).toBe(false);
    expect(migrated.boq.rows.map((row) => [row.rowId, row.quantity, row.unit, row.unitPrice])).toEqual(
      revision.boq.rows.map((row) => [row.rowId, row.quantity, row.unit, row.unitPrice]),
    );
    expect(migrated.params).toEqual(revision.params);
    expect(migrated.artifacts).toEqual(revision.artifacts);
    expect(migrated.boq.rows[0]?.sourceParameters?.photoEvidenceIds).toEqual(
      LEGACY_FIXTURE_CONTRACT.photoEvidenceIds,
    );
    expect(migrateInteriorFinishesProfessionalRevisionV4(migrated)).toEqual(migrated);
  });

  it("rejects a checksum-valid mixed selected/resolved identity as corrupted input", () => {
    const { catalogId, revision } = legacyRevision();
    const corrupted: EstimateDraftRevision = {
      ...revision,
      selectedTemplateId: expectedCanonicalOwner(catalogId),
    };
    const patch = parseUserParamPatch({
      revision: corrupted,
      operation: corrupted.params.area_m2 ? "update_param" : "add_param",
      paramKey: "area_m2",
      rawValue: "60 м2",
    });

    expect(() => recalculateEstimateDraftRevision(corrupted, patch)).toThrow(
      "INTERIOR_REVISION_IDENTITY_CORRUPT:mixed_legacy_and_canonical_identity",
    );
  });

  it("rejects a tampered legacy resolved identity checksum", () => {
    const { revision } = legacyRevision();
    if (!revision.resolvedIdentity) throw new Error("TEST_LEGACY_IDENTITY_MISSING");
    const corrupted: EstimateDraftRevision = {
      ...revision,
      resolvedIdentity: {
        ...revision.resolvedIdentity,
        semanticOwner: "foreign-corrupt-owner",
      },
    };

    expect(() => migrateInteriorFinishesProfessionalRevisionV4(corrupted)).toThrow(
      "INTERIOR_REVISION_IDENTITY_CORRUPT:checksum_mismatch",
    );
  });
});
