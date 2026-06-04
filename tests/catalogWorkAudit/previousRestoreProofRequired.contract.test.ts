import fs from "node:fs";
import path from "node:path";
import { readAuditJson, RESTORE_DIR } from "./catalogWorkAuditTestHelpers";

it("requires the previous restore product UI/PDF proof to be green", () => {
  const restoreMatrix = JSON.parse(fs.readFileSync(path.join(RESTORE_DIR, "matrix.json"), "utf8")) as Record<string, unknown>;
  const validation = readAuditJson<Record<string, unknown>>("previous_restore_validation.json");
  expect(validation.previous_restore_product_ui_pdf_green_confirmed).toBe(true);
  expect(validation.live_web_commit_matches_pushed_commit).toBe(true);
  expect(validation.pdf_restore_green_confirmed).toBe(true);
  expect(restoreMatrix.final_status).toBe("GREEN_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH_PROOF_REPAIRED_AND_REVERIFIED_READY");
});
