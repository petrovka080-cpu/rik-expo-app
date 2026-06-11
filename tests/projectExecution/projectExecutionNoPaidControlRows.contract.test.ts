import {
  PROJECT_EXECUTION_CONTROL_PATTERN,
  buildProjectExecutionFixture,
} from "./projectExecutionTestHelpers";

describe("project execution control row policy", () => {
  it("keeps control and warning rows out of paid tasks and procurement rows", () => {
    const { draft } = buildProjectExecutionFixture();

    expect(draft.tasks.map((task) => task.title).join("\n")).not.toMatch(PROJECT_EXECUTION_CONTROL_PATTERN);
    expect(draft.procurementItems.map((item) => item.materialVisibleName).join("\n")).not.toMatch(PROJECT_EXECUTION_CONTROL_PATTERN);
    expect(draft.workPackages.flatMap((workPackage) => workPackage.checklist).length).toBeGreaterThan(0);
  });
});
