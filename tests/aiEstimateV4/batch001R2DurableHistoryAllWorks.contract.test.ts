import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { buildAllBatch001DrywallSuccessorsR3 } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "../../scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3";
import { compileBatch001R56ThroughSharedCore } from "../../scripts/estimate/r5/batch001R56SharedCoreProjection";

type DurableRevision = {
  revisionId: string;
  parentRevisionId: string | null;
  projection: Awaited<ReturnType<typeof compileBatch001R56ThroughSharedCore>>["revisionProjection"];
  rows: Awaited<ReturnType<typeof compileBatch001R56ThroughSharedCore>>["rows"];
};

function reopen(revision: DurableRevision): DurableRevision {
  return JSON.parse(canonicalEstimateStableJson(revision)) as DurableRevision;
}

describe("BATCH001 R2 durable history all works", () => {
  test.each(buildAllBatch001DrywallSuccessorsR3().map((definition) => [definition.catalogId, definition] as const))(
    "round-trips and immutably revises %s",
    async (catalogId, definition) => {
      const initialValues = batch001DrywallGoldFixtureValuesR3(definition);
      const initial = await compileBatch001R56ThroughSharedCore({ definition, values: initialValues });
      const revision: DurableRevision = {
        revisionId: `batch001-durable-${catalogId}:1`,
        parentRevisionId: null,
        projection: initial.revisionProjection,
        rows: initial.rows,
      };
      const reopened = reopen(revision);
      expect(reopened).toEqual(revision);
      expect(reopened.projection.catalogId).toBe(catalogId);
      expect(reopened.rows.length).toBeGreaterThan(0);

      const editedParameterId = initialValues.horizontal_face_area_m2 == null
        ? "area_m2"
        : "horizontal_face_area_m2";
      const editedValues = {
        ...initialValues,
        [editedParameterId]: Number(initialValues[editedParameterId]) + 15,
      };
      const recalculated = await compileBatch001R56ThroughSharedCore({
        definition,
        values: editedValues,
        operation: "recalculate",
      });
      const edited: DurableRevision = {
        revisionId: `batch001-durable-${catalogId}:2`,
        parentRevisionId: revision.revisionId,
        projection: recalculated.revisionProjection,
        rows: recalculated.rows,
      };
      expect(edited.parentRevisionId).toBe(revision.revisionId);
      expect(edited.projection.catalogId).toBe(catalogId);
      expect(edited.projection.parameters[editedParameterId])
        .toBe(editedValues[editedParameterId]);
      expect(edited.rows).not.toEqual(revision.rows);
      expect(revision).toEqual(reopened);
    },
  );
});
