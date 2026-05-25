import fs from "node:fs";
import path from "node:path";
import { runRequestEstimateCatalogBoqLiveReleaseGate } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

const pdfPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_pdf_payloads.json");
const parityPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_payload_parity.json");

describe("request estimate release gate requires PDF payload parity", () => {
  beforeAll(async () => {
    if (!fs.existsSync(parityPath)) await runRequestEstimateCatalogBoqLiveReleaseGate();
  });

  it("requires final request rows and catalog selections in the PDF payload proof", () => {
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.existsSync(parityPath)).toBe(true);
    const pdf = JSON.parse(fs.readFileSync(pdfPath, "utf8")) as Record<string, unknown>;
    const parity = JSON.parse(fs.readFileSync(parityPath, "utf8")) as Record<string, unknown>;
    expect(pdf.pdf_data_uri).toBe(true);
    expect(Array.isArray(pdf.selected_catalog_item_ids)).toBe(true);
    expect((pdf.selected_catalog_item_ids as unknown[]).length).toBeGreaterThan(0);
    expect(parity.pdf_payload_parity_passed).toBe(true);
    expect(parity.fake_green_claimed).toBe(false);
  });
});
