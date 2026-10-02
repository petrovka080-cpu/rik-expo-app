import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
  S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID,
  S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256,
  buildS2721BulkheadFrameCanonicalRows,
  compileS2721BulkheadFrameProfile,
} from "../../scripts/estimate/r5/s2721BulkheadFramePreliminaryProfile";

const SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/drywall-ceiling-bulkhead-frame-50m2-preliminary-profile-r1.json",
);

type SourcePack = {
  authoredIndependentlyFromDefinitionRows: boolean;
  requiredComposition: { rowKey: string }[];
  conditionalComposition: { rowKey: string }[];
};

function quantityByKey(
  result: Awaited<ReturnType<typeof compileS2721BulkheadFrameProfile>>,
  key: string,
): string | undefined {
  return result.rows.find((row) => row.row_id === `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${key}`)
    ?.quantity;
}

describe("MASTER S27.21 A6 bulkhead frame preliminary profile", () => {
  test("is bound to an independently authored source pack", () => {
    const bytes = readFileSync(SOURCE_PACK_PATH);
    const sourcePack = JSON.parse(bytes.toString("utf8")) as SourcePack;
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(S2721_BULKHEAD_FRAME_SOURCE_PACK_SHA256);
    expect(sourcePack.authoredIndependentlyFromDefinitionRows).toBe(true);
    const rows = buildS2721BulkheadFrameCanonicalRows().resourceDefinitions;
    const expected = [...sourcePack.requiredComposition, ...sourcePack.conditionalComposition]
      .map((component) => `${S2721_BULKHEAD_FRAME_SOURCE_CATALOG_ID}:s2721:row:${component.rowKey}`)
      .sort();
    expect(rows.map((row) => row.row_id).sort()).toEqual(expected);
  });

  test("compiles the supplied 50 m2 geometry without equating cross sections and supports", async () => {
    const result = await compileS2721BulkheadFrameProfile({
      values: { ...S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT, area_m2: 50 },
    });
    expect(result.preliminaryNeeds).toHaveLength(0);
    expect(result.rows).toHaveLength(29);
    expect(quantityByKey(result, "longitudinal_profile_packages")).toBe("28");
    expect(quantityByKey(result, "horizontal_profile_packages")).toBe("22");
    expect(quantityByKey(result, "vertical_profile_packages")).toBe("15");
    expect(quantityByKey(result, "profile_screw_packages")).toBe("4");
    expect(quantityByKey(result, "cut_edge_protection_packages")).toBe("1");
    expect(quantityByKey(result, "longitudinal_profile_installation")).toBe("80");
    expect(quantityByKey(result, "horizontal_profile_installation")).toBe("61.5");
    expect(quantityByKey(result, "vertical_profile_installation")).toBe("41");
    expect(quantityByKey(result, "profile_intersection_connectors")).toBe("164");
    expect(quantityByKey(result, "suspension_hangers")).toBe("96");
    expect(quantityByKey(result, "structural_support_anchors")).toBe("96");
    expect(quantityByKey(result, "access_equipment")).toBe("2");
    expect(result.rows.some((row) => /лист.*гипс|шпакл|окраск|обшив/iu.test(String(row.title_ru)))).toBe(false);
    expect(20 * (1.5 + 2 * 0.5)).toBe(50);
  });

  test("keeps support count independent when cross-member spacing changes", async () => {
    const recalculated = await compileS2721BulkheadFrameProfile({
      operation: "recalculate",
      values: {
        ...S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
        area_m2: 50,
        cross_member_spacing_m: 0.4,
      },
    });
    expect(quantityByKey(recalculated, "horizontal_profile_installation")).toBe("76.5");
    expect(quantityByKey(recalculated, "vertical_profile_installation")).toBe("51");
    expect(quantityByKey(recalculated, "profile_intersection_connectors")).toBe("204");
    expect(quantityByKey(recalculated, "suspension_hangers")).toBe("96");
    expect(quantityByKey(recalculated, "structural_support_anchors")).toBe("96");
  });

  test("adds reinforcement only when a project length is supplied", async () => {
    const result = await compileS2721BulkheadFrameProfile({
      operation: "recalculate",
      values: {
        ...S2721_BULKHEAD_FRAME_RUNTIME_PROFILE_INPUT,
        area_m2: 50,
        reinforcement_profile_length_m: 6,
      },
    });
    expect(result.rows).toHaveLength(31);
    expect(quantityByKey(result, "opening_reinforcement_profile_packages")).toBe("3");
    expect(quantityByKey(result, "opening_reinforcement_installation")).toBe("6");
  });
});
