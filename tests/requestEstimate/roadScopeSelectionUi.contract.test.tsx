import fs from "fs";
import path from "path";

describe("road scope selection production UI contract", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx"),
    "utf8",
  );

  test("renders exactly four stable interactive scope buttons", () => {
    expect(source.match(/testID=\{`road-scope-option-/g)).toHaveLength(1);
    for (const scope of [
      "ROAD_SURFACING_ONLY",
      "FULL_PAVEMENT_STRUCTURE",
      "FULL_ROAD_INFRASTRUCTURE",
      "ROAD_REPAIR_REHABILITATION",
    ]) expect(source).toContain(scope);
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain("disabled={roadScopeSelectionBusy}");
    expect(source).toContain("road-scope-selection-progress");
  });

  test("does not expose internal assembly profile IDs", () => {
    expect(source).not.toMatch(/surfacing_on_prepared_base|new_full_road_pavement|new_full_road_infrastructure|rehabilitation_with_milling/);
  });
});
