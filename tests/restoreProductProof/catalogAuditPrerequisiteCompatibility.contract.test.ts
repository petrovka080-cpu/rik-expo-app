import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("catalog audit prerequisite compatibility", () => {
  it("publishes the exact proof files the catalog audit requires", () => {
    const compatibility = readRestoreProofJson("audit_prerequisite_compatibility.json");
    expect(compatibility.catalog_audit_expected_restore_dir).toBe(
      "artifacts/S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH",
    );
    expect(compatibility.restore_closeout_proof_found).toBe(true);
    expect(compatibility.matrix_found).toBe(true);
    expect(compatibility.live_web_build_identity_found).toBe(true);
    expect(compatibility.pdf_restore_matrix_found).toBe(true);
    expect(compatibility.web_e2e_found).toBe(true);
    expect(compatibility.android_api34_found).toBe(true);
    expect(compatibility.all_required_restore_proof_files_present).toBe(true);
    expectNoFakeGreen(compatibility, "audit_prerequisite_compatibility.json");
  });
});
