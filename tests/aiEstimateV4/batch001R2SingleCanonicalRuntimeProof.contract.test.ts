import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildCanonicalProcurementProjection,
  selectCanonicalArtifactRows,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildCanonicalProfessionalPdfProjection } from "../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf";
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
  test("uses one shared backend core across compile/recalculate/PDF/procurement for 16/16", async () => {
    const definitions = buildAllBatch001DrywallSuccessorsR3();
    expect(definitions).toHaveLength(16);

    for (const definition of definitions) {
      const bindings = INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS
        .filter((item) => item.catalog_id === definition.catalogId);
      expect(bindings).toHaveLength(1);
      expect(new Set(definition.passport.semanticOwners).size).toBe(definition.resources.length);
      expect(new Set(definition.passport.costOwners).size).toBe(definition.resources.length);

      const initialValues = batch001DrywallGoldFixtureValuesR3(definition);
      const initial = await compileBatch001R56ThroughSharedCore({ definition, values: initialValues });
      const initialBytes = canonicalEstimateStableJson(initial);
      const editedValues = {
        ...initialValues,
        horizontal_face_area_m2: Number(initialValues.horizontal_face_area_m2) + 15,
      };
      const edited = await compileBatch001R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      expect(edited.revisionProjection.catalogId).toBe(definition.catalogId);
      expect(edited.rows).not.toEqual(initial.rows);
      expect(canonicalEstimateStableJson(initial)).toBe(initialBytes);

      const selected = selectCanonicalArtifactRows(initial.rows);
      const revision = {
        id: `batch001-r56:${definition.catalogId}:1`,
        release_id: "batch001-r56-test-release",
        catalog_id: definition.catalogId,
        definition_version_id: definition.successorVersionId,
        checksum_sha256: sha256(initial.revisionProjection),
        row_count: selected.estimateRows.length,
        currency_code: initial.totals.currencyCode,
        totals: initial.totals,
        input_parameters: initial.parameters,
        revision_number: 1,
        created_at: "2026-08-13T06:00:00.000Z",
        primary_measure_parameter_id: "horizontal_face_area_m2",
        primary_measure_value: initial.parameters.horizontal_face_area_m2,
        primary_measure_unit_id: "m2",
      };
      const pdf = buildCanonicalProfessionalPdfProjection({
        revision,
        rows: selected.estimateRows,
        workTitleRu: definition.passport.titleRu,
        definitionVersionId: definition.successorVersionId,
      });
      const procurement = buildCanonicalProcurementProjection({
        revision,
        procurementRows: selected.procurementRows,
      });
      expect(pdf.rowCount).toBe(selected.estimateRows.length);
      expect(procurement.rows.map((row) => row.rowId)).toEqual(
        selected.procurementRows.map((row) => row.row_id),
      );
    }
  });

  test("opens legacy revisions idempotently without row loss and leaves recalculation to the shared backend core", async () => {
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

  test("keeps the remaining 2234 records outside the V3 overlay and has no batch-specific runtime branch", () => {
    const authorized = new Set<string>(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3);
    const unchanged = INTERIOR_FINISHES_DOMAIN_INVENTORY.filter((item) => !authorized.has(item.catalog_id));
    expect(INTERIOR_FINISHES_COMPLETE_RECORD_COUNT).toBe(2250);
    expect(unchanged).toHaveLength(2234);
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
