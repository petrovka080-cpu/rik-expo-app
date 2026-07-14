import {
  PROJECT_EXECUTION_GENERATED_AT,
  buildProjectExecutionFixture,
} from "./projectExecutionTestHelpers";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";

describe("project execution stable ids", () => {
  it("produces stable output and stable id prefixes for the same input", () => {
    const { payload, draft } = buildProjectExecutionFixture();
    const second = buildProjectExecutionDraftFromEstimate(payload, {
      source: "request_estimate",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      generatedAt: PROJECT_EXECUTION_GENERATED_AT,
      sourceRequestId: "request_fixture_001",
    });

    expect(second).toEqual(draft);
    expect(draft.workPackages.every((item) => item.id.startsWith("project_work_package_"))).toBe(true);
    expect(draft.tasks.every((item) => item.id.startsWith("project_task_"))).toBe(true);
    expect(draft.procurementItems.every((item) => item.id.startsWith("procurement_item_"))).toBe(true);
  });
});
