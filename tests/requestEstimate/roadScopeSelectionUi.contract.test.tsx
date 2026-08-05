import fs from "fs";
import path from "path";

import { ROAD_SCOPE_SELECTION_QUESTION_RU } from "../../src/lib/estimate/v4/asphalt";

describe("road scope selection production UI contract", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx"),
    "utf8",
  );

  test("renders exactly four stable interactive scope buttons", () => {
    expect(ROAD_SCOPE_SELECTION_QUESTION_RU.options).toHaveLength(4);
    expect(new Set(ROAD_SCOPE_SELECTION_QUESTION_RU.options.map(({ scopeId }) => scopeId)).size).toBe(4);
    expect(source.match(/testID=\{`road-scope-option-/g)).toHaveLength(1);
    expect(source).toContain("getRegisteredEstimateWorkProfile");
    expect(source).toContain("scopeRequirement?.offeredScopePresetIds");
    expect(source).toContain("offeredScopeIds.has(scope.scopePresetId)");
    expect(source.indexOf("bundle?.pendingRoadScopeSelection && onSelectRoadScope")).toBeLessThan(
      source.indexOf("bundle && viewModel"),
    );
    expect(source).toContain("bundle.pendingRoadScopeSelection.originalUserText");
    expect(source).toContain('accessibilityRole="button"');
    expect(source).toContain("disabled={roadScopeSelectionBusy}");
    expect(source).toContain("road-scope-selection-progress");
  });

  test("does not expose internal assembly profile IDs", () => {
    expect(source).not.toMatch(/surfacing_on_prepared_base|new_full_road_pavement|new_full_road_infrastructure|rehabilitation_with_milling/);
  });
});
