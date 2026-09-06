import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import {
  buildAllBatch002DrywallSuccessorsR3,
  compileBatch002DrywallSuccessorR3,
  type Batch002DrywallSuccessorDefinitionR3,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import { batch002DrywallGoldFixtureValuesR3 } from "../../scripts/estimate/batch001008R3/batch002DrywallGoldFixtureR3";
import { compileBatch002R56ThroughSharedCore } from "../../scripts/estimate/r5/batch002R56SharedCoreProjection";
import {
  buildCanonicalDurableArtifacts,
  changedCanonicalRowIds,
  reopenCanonicalDurableRevision,
  type CanonicalDurableRevision,
} from "./canonicalDurableProjectionTestSupport";

const DURABLE_GROUPS = [...new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4
  .map((catalogId) => catalogId.replace(/_(large_area|small_area|standard|technical_room|wet_zone)$/u, "")))];
const DEFINITIONS = new Map(buildAllBatch002DrywallSuccessorsR3()
  .map((definition) => [definition.catalogId, definition] as const));

function primaryMeasure(definition: Batch002DrywallSuccessorDefinitionR3): string {
  const byOperation = {
    FINISH_JOINT: "joint_length_m",
    INSULATE: "insulation_area_m2",
    PREPARE: "preparation_area_m2",
    REPAIR: "defect_area_m2",
    ALIGN: "correction_point_count",
    CLAD: "curve_element_count",
    FRAME: "curve_element_count",
  } as const;
  return byOperation[definition.operation];
}

describe("technology-domain wave R1 durable/history/PDF/procurement", () => {
  test.each(DURABLE_GROUPS)("creates, edits, reopens and projects all five exact revisions in %s", async (groupRoot) => {
    const catalogIds = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4
      .filter((catalogId) => catalogId.startsWith(`${groupRoot}_`));
    expect(catalogIds).toHaveLength(5);
    for (const catalogId of catalogIds) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const definition = DEFINITIONS.get(catalogId)!;
      const values = batch002DrywallGoldFixtureValuesR3(definition);
      const initial = await compileBatch002R56ThroughSharedCore({ definition, values });
      const predecessor = compileBatch002DrywallSuccessorR3(definition, values);
      expect(predecessor.status).toBe("GREEN");
      expect(initial.revisionProjection.catalogId).toBe(catalogId);
      expect(initial.rows.map((row) => row.row_id)).toEqual(predecessor.rows.map((row) => row.rowId));
      expect(initial.rows.map((row) => row.title_ru)).toEqual(predecessor.rows.map((row) => row.titleRu));
      expect(initial.rows.map((row) => Number(row.quantity))).toEqual(predecessor.rows.map((row) => row.quantity));
      expect(initial.rows.map((row) => row.procurement_eligible))
        .toEqual(predecessor.rows.map((row) => row.procurementEligible));

      const revision: CanonicalDurableRevision = {
        revisionId: `technology-wave-r1:${catalogId}:1`,
        parentRevisionId: null,
        definitionVersionId: definition.successorVersionId,
        projection: initial.revisionProjection,
        rows: initial.rows,
      };
      const reopened = reopenCanonicalDurableRevision(revision);
      expect(reopened).toEqual(revision);
      const immutableInitial = canonicalEstimateStableJson(revision);

      const measure = primaryMeasure(definition);
      const editedValues = { ...values, [measure]: Number(values[measure]) + 1 };
      const recalculated = await compileBatch002R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      const edited: CanonicalDurableRevision = {
        revisionId: `technology-wave-r1:${catalogId}:2`,
        parentRevisionId: revision.revisionId,
        definitionVersionId: definition.successorVersionId,
        projection: recalculated.revisionProjection,
        rows: recalculated.rows,
      };
      expect(edited.parentRevisionId).toBe(revision.revisionId);
      expect(edited.projection.parameters[measure]).toBe(editedValues[measure]);
      expect(changedCanonicalRowIds(revision.rows, edited.rows).length).toBeGreaterThan(0);
      expect(canonicalEstimateStableJson(revision)).toBe(immutableInitial);

      const artifacts = buildCanonicalDurableArtifacts({
        durable: edited,
        workTitleRu: inventory.localized_name_ru,
        createdAt: "2026-08-13T12:01:00.000Z",
        primaryMeasureParameterId: measure,
        primaryMeasureUnitId: definition.passport.userParameterContracts
          .find((item) => item.parameterId === measure)?.unitId ?? "item",
      });
      expect(artifacts.pdf.rowCount).toBe(edited.rows.length);
      expect(artifacts.procurement.rows.map((row) => row.rowId)).toEqual(
        artifacts.selected.procurementRows.map((row) => row.row_id),
      );
      expect(reopenCanonicalDurableRevision(edited)).toEqual(edited);
    }
  });
});
