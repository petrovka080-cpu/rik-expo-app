import fs from "node:fs";
import path from "node:path";

import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { renderEstimatePdfDocument } from "../../src/lib/estimatePdf";
import {
  EXACT_WAVE_ARTIFACT_DIR,
  renderPdfProofSample,
  selectedWorkEstimate,
  writeExactWaveJson,
} from "./userInputExactMaterialPriceEstimate.shared";

const PDF_DIR = path.join(EXACT_WAVE_ARTIFACT_DIR, "pdf");

export function runUserInputToExactMaterialPricePdfProof() {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const samples = [
    buildExactMaterialPriceEstimate({
      text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
      selectedWorkKey: "roof_waterproofing",
      volume: 120,
      unit: "sq_m",
    }),
    selectedWorkEstimate("floor_screed"),
    selectedWorkEstimate("ceramic_tile_laying"),
  ];
  const rows = samples.map((result) => {
    const pdf = renderEstimatePdfDocument(result.pdf_model);
    const filePath = path.join(PDF_DIR, `${result.estimate_id}.pdf`);
    fs.writeFileSync(filePath, pdf.bytes);
    return {
      ...renderPdfProofSample(result),
      file_path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      ui_rows: result.ui_model.rows.length,
      pdf_rows: result.pdf_model.sections.flatMap((section) => section.rows).length,
      ui_pdf_row_count_match: result.ui_model.rows.length === result.pdf_model.sections.flatMap((section) => section.rows).length,
      price_missing_visible: pdf.text.includes("PRICE_MISSING"),
      failures: [
        ...(result.ui_model.rows.length === result.pdf_model.sections.flatMap((section) => section.rows).length ? [] : ["UI_PDF_ROW_COUNT_MISMATCH"]),
        ...(pdf.text.includes("PRICE_MISSING") ? [] : ["PRICE_MISSING_NOT_VISIBLE_IN_PDF"]),
      ],
    };
  });
  const failures = rows.flatMap((row) => row.failures.map((failure) => ({ estimate_id: row.estimate_id, failure })));
  const result = {
    final_status: failures.length === 0
      ? "GREEN_EXACT_MATERIAL_PRICE_PDF_PARITY_READY"
      : "RED_EXACT_MATERIAL_PRICE_PDF_PARITY",
    pdfs_total: rows.length,
    pdfs_passed: rows.filter((row) => row.failures.length === 0).length,
    price_missing_visible: rows.some((row) => row.price_missing_visible),
    fake_green_claimed: false,
    failures,
    rows,
  };
  writeExactWaveJson("pdf_results.json", result);
  console.log(result.final_status);
  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runUserInputToExactMaterialPricePdfProof();
}
