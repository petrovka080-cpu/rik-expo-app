import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildCanonicalProcurementProjection,
  canonicalArtifactPreliminaryNeeds,
  selectCanonicalArtifactRows,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildCanonicalProfessionalPdfProjection } from "../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";
import {
  canonicalEstimateSavedOperationAcceptanceV1,
  canonicalProfessionalPdfReviewAcknowledgmentV1,
  assertCanonicalEstimateSavedArtifactStructureV1,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  INTERIOR_FINISHES_COMPLETE_RECORD_COUNT,
  INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
  drywallCeilingBulkheadCalculationStrategyIdV3,
  drywallCeilingBulkheadProfessionalOwnerIdV3,
  interiorFinishesDomainFactory,
  migrateDrywallCeilingBulkheadRevisionV3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { buildAllBatch001DrywallSuccessorsR3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "../../scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3";
import { compileBatch001R56ThroughSharedCore } from "../../scripts/estimate/r5/batch001R56SharedCoreProjection";
import { batch001ParamOverrides, compileBatch001Work } from "./batch001R2TestSupport";

jest.setTimeout(180_000);

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function legacySourceRevision(catalogId: string): EstimateDraftRevision {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
  const production = compileBatch001Work(catalogId);
  if (!production.draft) throw new Error(`BATCH001_LEGACY_FIXTURE_NOT_COMPILED:${catalogId}`);
  return createEstimateDraftRevision({
    estimateDraftId: `batch001-legacy-source-${catalogId}`,
    rawInput: inventory.localized_name_ru,
    selectedTemplateId: `domain-passport:${catalogId}:v1`,
    selectedWorkKey: inventory.work_key,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: batch001ParamOverrides(catalogId),
    createdAt: "2026-08-13T06:00:00.000Z",
    revisionIndex: 1,
    prebuiltExactDraft: production.draft,
  });
}

function legacyThreeRowRevision(revision: EstimateDraftRevision): EstimateDraftRevision {
  const rows = revision.boq.rows.slice(0, 3).map((row) => ({
    ...row,
    templateId: "legacy-interior-three-row-template",
    sourceParameters: { legacyInteriorEstimate: true },
  }));
  const rowIds = new Set(rows.map((row) => row.rowId));
  return {
    ...revision,
    selectedTemplateId: "legacy-interior-three-row-template",
    professionalWorkId: null,
    legacyRowsCount: 3,
    resolvedIdentity: revision.resolvedIdentity ? {
      ...revision.resolvedIdentity,
      passportId: "legacy-interior-owner",
      calculationStrategyId: "legacy-three-row-calculation",
      semanticOwner: "legacy-interior-owner",
      legacyFallbackUsed: true,
    } : undefined,
    boq: {
      rows,
      sections: revision.boq.sections
        .map((section) => ({ ...section, rowIds: section.rowIds.filter((rowId) => rowIds.has(rowId)) }))
        .filter((section) => section.rowIds.length > 0),
    },
    trace: {
      ...revision.trace,
      selectedTemplateId: "legacy-interior-three-row-template",
      rows: revision.trace.rows.filter((row) => rowIds.has(row.rowId)),
    },
  };
}

function durableRowPayload(revision: EstimateDraftRevision) {
  return revision.boq.rows.map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    titleRu: row.titleRu,
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice,
    currency: row.currency,
    includedInProcurement: row.includedInProcurement,
  }));
}

describe("BATCH001 R2 SINGLE_CANONICAL_RUNTIME_PROOF", () => {
  // Synthetic calculation/projection regression, not physical BATCH001 admission.
  // Real 10/10 STANDARD/release remains OPEN: the source passport is DRAFT/RED.
  // No independent composition, norm, equipment or approval is invented here.
  test("keeps one calculation owner for 10/10 and reads saved reports while strict STANDARD remains blocked", async () => {
    const definitions = buildAllBatch001DrywallSuccessorsR3();
    expect(definitions).toHaveLength(10);

    for (const definition of definitions) {
      const bindings = INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS
        .filter((item) => item.catalog_id === definition.catalogId);
      expect(bindings).toHaveLength(1);
      expect(new Set(definition.passport.semanticOwners).size).toBe(definition.resources.length);
      expect(new Set(definition.passport.costOwners).size).toBe(definition.resources.length);

      const initialValues = batch001DrywallGoldFixtureValuesR3(definition);
      const initial = await compileBatch001R56ThroughSharedCore({ definition, values: initialValues });
      const initialBytes = canonicalEstimateStableJson(initial);
      const initialRowIds = new Set(initial.rows.map((row) => row.row_id));
      const editRoute = definition.resources.flatMap((resource) => {
        if (!initialRowIds.has(resource.rowId)) return [];
        const formula = definition.runtimeFormulas.find((candidate) => candidate.formulaId === resource.formulaId);
        if (!formula || formula.inputParameterIds.length !== 1
          || formula.expressionSource.trim() !== formula.inputParameterIds[0]
          || typeof initialValues[formula.inputParameterIds[0]!] !== "number") return [];
        return [{ resource, formula, parameterId: formula.inputParameterIds[0]! }];
      })[0];
      expect(editRoute).toBeDefined();
      const editedParameterId = editRoute!.parameterId;
      const editedValues = {
        ...initialValues,
        [editedParameterId]: Number(initialValues[editedParameterId]) + 15,
      };
      const edited = await compileBatch001R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      expect(edited.revisionProjection.catalogId).toBe(definition.catalogId);
      expect(edited.rows.find((row) => row.row_id === editRoute!.resource.rowId)?.quantity)
        .not.toBe(initial.rows.find((row) => row.row_id === editRoute!.resource.rowId)?.quantity);
      expect(editRoute!.formula.inputParameterIds).toEqual([editedParameterId]);
      expect(canonicalEstimateStableJson(initial)).toBe(initialBytes);

      const selected = selectCanonicalArtifactRows(initial.rows);
      const revision = {
        id: `batch001-r56:${definition.catalogId}:1`,
        release_id: "batch001-r56-test-release",
        catalog_id: definition.catalogId,
        definition_version_id: definition.successorVersionId,
        checksum_sha256: sha256(initial.revisionProjection),
        row_count: initial.rows.length,
        currency_code: initial.totals.currencyCode,
        totals: initial.totals,
        input_parameters: initial.parameters,
        revision_number: 1,
        created_at: "2026-08-13T06:00:00.000Z",
        primary_measure_parameter_id: editedParameterId,
        primary_measure_value: initial.parameters[editedParameterId],
        primary_measure_unit_id: editRoute!.formula.outputUnitId,
        amendment_contract: { parameterSources: { preliminaryNeeds: initial.preliminaryNeeds } },
      };
      // The shared adapter already supplies canonical SHA256 before Core. Keep
      // its whole saved result, including unpaid rows and any real raw needs.
      const preliminaryNeeds = canonicalArtifactPreliminaryNeeds(revision, { issuancePurpose: "PRELIMINARY_REVIEW" });
      const resources = [...initial.rows, ...preliminaryNeeds];
      const savedBytes = canonicalEstimateStableJson({ revision, rows: initial.rows, preliminaryNeeds });
      const artifactInput = {
        revision,
        rows: initial.rows,
        preliminaryNeeds,
        workTitleRu: definition.passport.titleRu,
        definitionVersionId: definition.successorVersionId,
      };
      expect(jest.isMockFunction(assertCanonicalEstimateSavedArtifactStructureV1)).toBe(false);
      const audit = canonicalEstimateSavedOperationAcceptanceV1({ revision, resources });
      expect(audit).toMatchObject({
        status: "STRUCTURE_INVALID", pdfAllowed: false,
        definitionAdmissionAllowed: false, completeClaimAllowed: false,
      });
      expect(audit.issues).toEqual(expect.arrayContaining([
        { code: "RESOURCE_OPERATION_MISSING", rowId: editRoute!.resource.rowId },
        { code: "INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED" },
      ]));
      expect(() => buildCanonicalProfessionalPdfProjection(artifactInput))
        .toThrow(expect.objectContaining({ code: "ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID" }));
      expect(() => buildCanonicalProfessionalPdfProjection({ ...artifactInput, issuancePurpose: "STANDARD" }))
        .toThrow(expect.objectContaining({ code: "ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID" }));
      const reviewInput = { ...artifactInput, issuancePurpose: "PRELIMINARY_REVIEW" as const };
      expect(() => buildCanonicalProfessionalPdfProjection(reviewInput))
        .toThrow(expect.objectContaining({ code: "ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID" }));
      const ack = canonicalProfessionalPdfReviewAcknowledgmentV1({
        revision, resources,
        request: {
          revisionId: revision.id, releaseId: revision.release_id,
          definitionVersionId: revision.definition_version_id,
          checksumSha256: revision.checksum_sha256, acknowledgedPreliminaryReview: true,
        },
        actorUserId: "TEST_ONLY_batch001_saved_reader",
        acknowledgedAt: "2026-10-31T00:00:00.000Z",
      });
      for (const field of ["revisionId", "releaseId", "definitionVersionId", "checksumSha256", "auditSha256"] as const) {
        expect(() => buildCanonicalProfessionalPdfProjection({
          ...reviewInput, reviewAcknowledgmentV1: { ...ack, [field]: "wrong-saved-binding" },
        })).toThrow(expect.objectContaining({ code: "ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID" }));
      }
      const pdf = buildCanonicalProfessionalPdfProjection({ ...reviewInput, reviewAcknowledgmentV1: ack });
      expect(pdf.grandTotalStatus).not.toBe("COMPLETE");
      expect(pdf.html).toContain("Предварительная для проверки");
      expect(pdf.html).toContain("Состав подработ и полнота обеспечения не подтверждены");
      expect(pdf.html).not.toContain("Утвердил");
      expect(canonicalEstimateSavedOperationAcceptanceV1({ revision, resources })).toEqual(audit);
      expect(canonicalEstimateStableJson({ revision, rows: initial.rows, preliminaryNeeds })).toBe(savedBytes);
      expect(canonicalEstimateStableJson(initial)).toBe(initialBytes);
      // Pure mapper identity is retained; this is not procurement authorization.
      const procurement = buildCanonicalProcurementProjection({
        revision,
        procurementRows: selected.procurementRows,
      });
      expect(pdf.rowCount).toBe(initial.rows.length + initial.preliminaryNeeds.length);
      expect(new Set(procurement.rows.map((row) => row.rowId)).size).toBe(procurement.rows.length);
      expect(procurement.rows.map((row) => row.rowId)).toEqual(
        selected.procurementRows.map((row) => row.row_id),
      );
    }
  });

  test("opens and migrates legacy revisions 10/10 without data loss or a reachable legacy calculation route", async () => {
    const definitions = new Map(buildAllBatch001DrywallSuccessorsR3()
      .map((definition) => [definition.catalogId, definition] as const));
    for (const catalogId of DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3) {
      const legacy = legacyThreeRowRevision(legacySourceRevision(catalogId));
      const rowsBefore = durableRowPayload(legacy);
      const paramsBefore = JSON.parse(JSON.stringify(legacy.params));
      const migrated = migrateDrywallCeilingBulkheadRevisionV3(legacy);
      const owner = drywallCeilingBulkheadProfessionalOwnerIdV3(catalogId);
      expect(durableRowPayload(migrated)).toEqual(rowsBefore);
      expect(migrated.params).toEqual(paramsBefore);
      expect(migrated.artifacts).toEqual(legacy.artifacts);
      expect(migrated.resolvedIdentity).toMatchObject({
        requestedCatalogWorkId: catalogId,
        semanticOwner: owner,
        calculationStrategyId: drywallCeilingBulkheadCalculationStrategyIdV3(catalogId),
        legacyFallbackUsed: false,
      });
      expect(new Set(migrated.boq.rows.map((row) => row.sourceParameters?.semanticOwner)).size)
        .toBe(migrated.boq.rows.length);
      expect(migrateDrywallCeilingBulkheadRevisionV3(migrated)).toEqual(migrated);

      const definition = definitions.get(catalogId)!;
      const current = await compileBatch001R56ThroughSharedCore({
        definition,
        values: batch001DrywallGoldFixtureValuesR3(definition),
        operation: "recalculate",
      });
      expect(current.revisionProjection.catalogId).toBe(catalogId);
      expect(current.rows.length).toBeGreaterThan(0);
    }
  });

  test("retired bulkhead area identities have no active owner or legacy calculation entry", () => {
    // The prior 16-owner cohort lost exactly six area identities; ten physical-work owners remain.
    const standard = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
      (item) => item.catalog_id === "drywall_ceiling_interior_bulkhead_frame_standard",
    )!;
    const retired = [
      "drywall_ceiling_interior_bulkhead_frame_large_area",
      "drywall_ceiling_interior_bulkhead_frame_small_area",
      "drywall_ceiling_interior_bulkhead_align_large_area",
      "drywall_ceiling_interior_bulkhead_align_small_area",
      "drywall_ceiling_interior_bulkhead_clad_large_area",
      "drywall_ceiling_interior_bulkhead_clad_small_area"
] as const;
    for (const catalogId of retired) {
      expect(INTERIOR_FINISHES_DOMAIN_INVENTORY.some((item) => item.catalog_id === catalogId)).toBe(false);
      expect(interiorFinishesDomainFactory.binding_by_catalog_id.has(catalogId)).toBe(false);
      expect(buildDrywallCeilingBulkheadProfessionalPackagePartsV3({ ...standard, catalog_id: catalogId, work_key: catalogId })).toBeNull();
    }
  });

  test("keeps the remaining 1472 interior records outside the professional overlay and has no batch runtime branch", () => {
    const authorized = new Set<string>(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);
    const unchanged = INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((item) => !authorized.has(item.catalog_id));
    // 2250 − 768 retired area records = 1482; 1482 − 10 surviving bulkhead owners = 1472.
    expect(INTERIOR_FINISHES_COMPLETE_RECORD_COUNT).toBe(1482);
    expect(unchanged).toHaveLength(1472);
    for (const inventory of unchanged) {
      expect(buildDrywallCeilingBulkheadProfessionalPackagePartsV3(inventory)).toBeNull();
      const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
      expect(technology).toBeDefined();
      expect(technology!.method).not.toContain("DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_V3");
    }

    const runtimeFiles = [
      "src/lib/estimate/buildEstimateFromInlineWorkPrompt.ts",
      "src/lib/estimate/recalculateEstimateDraftRevision.ts",
      "src/lib/estimate/runtime/createAiEstimateRuntime.ts",
    ];
    for (const file of runtimeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8").toLowerCase();
      expect(source).not.toContain("batch001");
    }
  });
});
