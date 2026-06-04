import fs from "node:fs";
import path from "node:path";

export const RESTORE_PROOF_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH",
);

export function restoreProofPath(fileName: string): string {
  return path.join(RESTORE_PROOF_DIR, fileName);
}

export function readRestoreProofJson<T extends Record<string, unknown> = Record<string, unknown>>(fileName: string): T {
  const filePath = restoreProofPath(fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing restore proof artifact: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as T;
}

export function expectBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be boolean, got ${typeof value}`);
  }
}

export function expectNoFakeGreen(value: Record<string, unknown>, fileName: string): void {
  expect(value.fake_green_claimed).toBe(false);
  const status = typeof value.status === "string" ? value.status : String(value.final_status ?? "");
  expect(status.toLowerCase()).not.toContain("fake");
  expect(fileName).not.toContain("YESTERDAY");
}

export function expectCoreRestoreMatrixReady(): Record<string, unknown> {
  const matrix = readRestoreProofJson("matrix.json");
  expectNoFakeGreen(matrix, "matrix.json");
  expect(matrix.canonical_restore_dir_exists).toBe(true);
  expect(matrix.closeout_proof_exists).toBe(true);
  expect(matrix.live_web_build_identity_exists).toBe(true);
  expect(matrix.pdf_restore_matrix_exists).toBe(true);
  expect(matrix.web_e2e_exists).toBe(true);
  expect(matrix.android_api34_exists).toBe(true);
  return matrix;
}
