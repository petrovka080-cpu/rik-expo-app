import fs from "fs";
import path from "path";

import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
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
import { batch001ParamOverrides } from "./batch001R2TestSupport";

jest.setTimeout(180_000);

function productionRevision(catalogId: string): EstimateDraftRevision {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
  return createAiEstimateRuntime().createDraft({
    estimateDraftId: `single-canonical-runtime-${catalogId}`,
    rawInput: inventory.localized_name_ru,
    selectedTemplateId: catalogId,
    selectedWorkKey: inventory.work_key,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    paramOverrides: batch001ParamOverrides(catalogId),
    createdAt: "2026-08-13T06:00:00.000Z",
  }).revision;
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
  test("proves one owner and one route across create/edit/recalculate/history/PDF/procurement for 16/16", () => {
    const runtime = createAiEstimateRuntime();
    const owners = new Map<string, string>();
    const rowCounts = new Map<string, number>();

    for (const catalogId of DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const bindings = INTERIOR_FINISHES_DOMAIN_CATALOG_BINDINGS.filter((item) => item.catalog_id === catalogId);
      expect(bindings).toHaveLength(1);
      const parts = buildDrywallCeilingBulkheadProfessionalPackagePartsV3(inventory);
      expect(parts).not.toBeNull();
      const assemblyOwners = new Set(parts!.child_assemblies.flatMap((assembly) =>
        assembly.rows.map((row) => row.semantic_owner)));
      const owner = drywallCeilingBulkheadProfessionalOwnerIdV3(catalogId);
      expect([...assemblyOwners]).toEqual([owner]);

      const revision = productionRevision(catalogId);
      expect(revision.boq.rows.length).toBeGreaterThan(3);
      expect(revision.boq.rows.every((row) => row.sourceParameters?.professionalDomainFactoryV1 === true)).toBe(true);
      expect(revision.resolvedIdentity).toMatchObject({
        requestedCatalogWorkId: catalogId,
        passportId: owner,
        semanticOwner: owner,
        calculationStrategyId: drywallCeilingBulkheadCalculationStrategyIdV3(catalogId),
      });
      expect(revision.resolvedIdentity?.legacyFallbackUsed).not.toBe(true);

      const edited = runtime.applyParameterOverride({
        revision,
        operation: "update_param",
        paramKey: "area_m2",
        rawValue: "135",
        createdAt: "2026-08-13T06:01:00.000Z",
        revisionIndex: 2,
      }).revision;
      const rebuilt = runtime.rebuildFromRevision({
        revision: edited,
        createdAt: "2026-08-13T06:02:00.000Z",
        revisionIndex: 3,
      }).revision;
      const pdf = runtime.buildPdfSnapshot({ revision: rebuilt });
      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      const approved = runtime.approveRevision({
        revision: rebuilt,
        ownerUserId: `single-canonical-owner-${catalogId}`,
        approvedAt: "2026-08-13T06:03:00.000Z",
      });
      expect([
        revision,
        edited,
        rebuilt,
        pdf.revision,
      ].every((item) => item.resolvedIdentity?.semanticOwner === owner)).toBe(true);
      expect(buyer.snapshot.revisionId).toBe(pdf.revision.revisionId);
      expect(approved.approved).toBe(true);
      owners.set(catalogId, owner);
      rowCounts.set(catalogId, revision.boq.rows.length);
    }

    expect(owners.size).toBe(16);
    expect(rowCounts.size).toBe(16);
  });

  test("opens and migrates legacy revisions 16/16 without data loss or a reachable legacy calculation route", () => {
    const runtime = createAiEstimateRuntime();
    for (const catalogId of DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3) {
      const current = productionRevision(catalogId);
      const legacy = legacyThreeRowRevision(current);
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
      expect(migrated.boq.rows.every((row) => row.sourceParameters?.semanticOwner === owner)).toBe(true);
      const recalculated = runtime.rebuildFromRevision({
        revision: legacy,
        createdAt: "2026-08-13T06:04:00.000Z",
        revisionIndex: 2,
      }).revision;
      expect(recalculated.boq.rows.length).toBeGreaterThan(3);
      expect(recalculated.resolvedIdentity?.semanticOwner).toBe(owner);
      expect(recalculated.resolvedIdentity?.legacyFallbackUsed).not.toBe(true);
    }
  });

  test("keeps the remaining 2234 interior records outside the professional overlay and has no batch runtime branch", () => {
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

    const productionRoot = path.resolve(__dirname, "../../src/lib/estimate/v4/domains/interiorFinishesComplete");
    const productionFiles = fs.readdirSync(productionRoot).filter((name) => name.endsWith(".ts"));
    expect(productionFiles.some((name) => name.toLowerCase().includes("batch001"))).toBe(false);
    for (const file of productionFiles) {
      expect(fs.readFileSync(path.join(productionRoot, file), "utf8").toLowerCase()).not.toContain("batch001");
    }
  });
});
