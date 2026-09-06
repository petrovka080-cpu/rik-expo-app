import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch003R56FixtureValues } from "../../scripts/estimate/r5/batch003R56Fixtures";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
  type Batch003R56CanonicalSuccessorDefinition,
} from "../../scripts/estimate/r5/batch003R56SharedCoreProjection";
import {
  buildCanonicalDurableArtifacts,
  changedCanonicalRowIds,
  reopenCanonicalDurableRevision,
  type CanonicalDurableRevision,
} from "./canonicalDurableProjectionTestSupport";

const GROUPS = [...new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6
  .map((id) => id.replace(/_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u, "")))];
const DEFINITIONS = new Map(buildAllBatch003R56CanonicalSuccessorDefinitions()
  .map((definition) => [definition.catalogId, definition] as const));

function primaryMeasure(definition: Batch003R56CanonicalSuccessorDefinition): string {
  if (definition.operation === "REPAIR") return "defect_area_m2";
  if (definition.operation === "FINISH_JOINT") return "joint_length_m";
  return "area_m2";
}

describe("technology-domain wave R2 durable/history/PDF/procurement", () => {
  test.each(GROUPS)("round-trips every exact revision in %s", async (root) => {
    const catalogIds = DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6
      .filter((id) => id.startsWith(`${root}_`));
    expect(catalogIds.length).toBeGreaterThanOrEqual(5);
    for (const catalogId of catalogIds) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const definition = DEFINITIONS.get(catalogId)!;
      const values = batch003R56FixtureValues(definition);
      const initial = await compileBatch003R56ThroughSharedCore({ definition, values });
      expect(initial.revisionProjection.catalogId).toBe(catalogId);
      expect(initial.rows).toHaveLength(definition.resources.length);

      const revision: CanonicalDurableRevision = {
        revisionId: `technology-wave-r2:${catalogId}:1`,
        parentRevisionId: null,
        definitionVersionId: definition.successorVersion,
        projection: initial.revisionProjection,
        rows: initial.rows,
      };
      const reopened = reopenCanonicalDurableRevision(revision);
      expect(reopened).toEqual(revision);
      const immutableInitial = canonicalEstimateStableJson(revision);

      const measure = primaryMeasure(definition);
      const editedValues = { ...values, [measure]: Number(values[measure]) + 1 };
      const recalculated = await compileBatch003R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      const edited: CanonicalDurableRevision = {
        revisionId: `technology-wave-r2:${catalogId}:2`,
        parentRevisionId: revision.revisionId,
        definitionVersionId: definition.successorVersion,
        projection: recalculated.revisionProjection,
        rows: recalculated.rows,
      };
      expect(edited.parentRevisionId).toBe(revision.revisionId);
      expect(edited.projection.parameters[measure]).toBe(editedValues[measure]);
      expect(changedCanonicalRowIds(revision.rows, edited.rows).length).toBeGreaterThan(0);
      expect(canonicalEstimateStableJson(revision)).toBe(immutableInitial);

      const parameter = definition.parameters.find((item) => item.parameterId === measure)!;
      const artifacts = buildCanonicalDurableArtifacts({
        durable: edited,
        workTitleRu: inventory.localized_name_ru,
        createdAt: "2026-08-13T18:01:00.000Z",
        primaryMeasureParameterId: measure,
        primaryMeasureUnitId: parameter.unitId ?? "item",
      });
      expect(artifacts.pdf.rowCount).toBe(edited.rows.length);
      expect(artifacts.procurement.rows.map((row) => row.rowId)).toEqual(
        artifacts.selected.procurementRows.map((row) => row.row_id),
      );
      expect(reopenCanonicalDurableRevision(edited)).toEqual(edited);
    }
  });
});
