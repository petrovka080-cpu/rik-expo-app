import { buildPdfTabularRegressionPdf } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression rows match estimate", () => {
  it("uses rows from the structured estimate without screen-local row creation", () => {
    const { estimate, pdf } = buildPdfTabularRegressionPdf("асфальтирование 1000 м²");
    const estimateRowNames = estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
    expect(pdf.viewModel.rows).toHaveLength(estimateRowNames.length);
    expect(pdf.viewModel.rows.map((row) => row.name)).toEqual(estimateRowNames);
  });
});
