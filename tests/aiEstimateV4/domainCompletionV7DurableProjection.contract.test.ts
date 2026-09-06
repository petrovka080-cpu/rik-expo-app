import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch004R56FixtureValues } from "../../scripts/estimate/r5/batch004R56Fixtures";
import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  compileBatch004R56ThroughSharedCore,
  type Batch004R56CanonicalSuccessorDefinition,
} from "../../scripts/estimate/r5/batch004R56SharedCoreProjection";
import {
  buildCanonicalDurableArtifacts,
  changedCanonicalRowIds,
  reopenCanonicalDurableRevision,
  type CanonicalDurableRevision,
} from "./canonicalDurableProjectionTestSupport";

const SUBWAVE_FAMILIES = [
  ["drywall_partition", "fire_partition"],
  ["moisture_partition", "sound_partition"],
  ["joint", "niche"],
  ["revision_hatch", "shaft"],
  ["wall_cladding", "bulkhead", "curve", "drywall_ceiling"],
] as const;

function familyOf(catalogId: string): string {
  const match = catalogId.match(/^drywall_ceiling_interior_(.+)_(prepare|frame|align|insulate|clad|finish_joint|repair|install)_/u);
  if (!match) throw new Error(`BATCH004_DURABLE_ID_PARSE_RED:${catalogId}`);
  return match[1];
}

function primaryMeasure(definition: Batch004R56CanonicalSuccessorDefinition): string {
  if (definition.family === "joint" || definition.operation === "FINISH_JOINT") return "joint_length_m";
  if (definition.family === "revision_hatch") return "opening_count_item";
  if (definition.operation === "REPAIR") return "defect_area_m2";
  return "area_m2";
}

const ordinal = Number(process.env.BATCH004_SUBWAVE ?? "1");
if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 5) throw new Error(`BATCH004_DURABLE_SUBWAVE_RED:${ordinal}`);
const ids = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7
  .filter((id) => SUBWAVE_FAMILIES[ordinal - 1].includes(familyOf(id) as never));
const DEFINITIONS = new Map(buildAllBatch004R56CanonicalSuccessorDefinitions()
  .map((definition) => [definition.catalogId, definition] as const));

describe(`BATCH-004 SW-${String(ordinal).padStart(2, "0")} durable/history/PDF/procurement`, () => {
  test(`round-trips all ${ids.length} exact identities`, async () => {
    expect(ids.length).toBe([84, 83, 83, 83, 60][ordinal - 1]);
    for (const catalogId of ids) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const definition = DEFINITIONS.get(catalogId)!;
      const values = batch004R56FixtureValues(definition);
      const initial = await compileBatch004R56ThroughSharedCore({ definition, values });
      expect(initial.revisionProjection.catalogId).toBe(catalogId);
      expect(initial.rows).toHaveLength(definition.resources.length);

      const revision: CanonicalDurableRevision = {
        revisionId: `batch004-r56:${catalogId}:1`,
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
      const recalculated = await compileBatch004R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      const edited: CanonicalDurableRevision = {
        revisionId: `batch004-r56:${catalogId}:2`,
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
        createdAt: "2026-08-13T18:31:00.000Z",
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
