import {
  extractEstimatePdfTextFromSnapshot,
  parseEstimatePdfRowsFromText,
  type EstimatePdfRealityRow,
} from "../estimate/auditEstimatePdfReality";

export { extractEstimatePdfTextFromSnapshot, parseEstimatePdfRowsFromText };

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/extractEstimatePdfText.ts")) {
  const sampleRows: EstimatePdfRealityRow[] = [{
    row_id: "sample",
    name: "sample",
    quantity: 1,
    unit: "set",
    norm_source_id: "missing",
    calculation_trace: "missing",
  }];
  const text = extractEstimatePdfTextFromSnapshot(sampleRows);
  console.log(JSON.stringify({
    pdf_text_extraction_passed: text.length > 0,
    parsed_rows_count: parseEstimatePdfRowsFromText(text).length,
    browser_automation_started: false,
  }, null, 2));
}
