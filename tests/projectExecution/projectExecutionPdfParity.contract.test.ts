import {
  PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN,
  buildProjectExecutionFixture,
} from "./projectExecutionTestHelpers";
import { buildProjectExecutionPdfExportViewModel } from "../../src/lib/projectExecution";

describe("project execution PDF/export parity", () => {
  it("builds export sections from the same project execution draft", () => {
    const { payload, draft } = buildProjectExecutionFixture();
    const viewModel = buildProjectExecutionPdfExportViewModel(payload, draft);
    const sectionTitles = viewModel.sections.map((section) => section.title);
    const text = viewModel.sections.flatMap((section) => [section.title, ...section.rows.map((row) => row.label)]).join("\n");

    expect(sectionTitles).toEqual(["Смета", "Материалы", "Этапы работ", "Список закупки"]);
    expect(viewModel.sourcePayloadHash).toBe(draft.sourcePayloadHash);
    expect(viewModel.sections[1].rows.map((row) => row.label)).toEqual(
      draft.procurementItems.map((item) => item.materialVisibleName),
    );
    expect(text).not.toMatch(PROJECT_EXECUTION_FORBIDDEN_VISIBLE_PATTERN);
  });
});
