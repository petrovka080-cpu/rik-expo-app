import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("web e2e proof", () => {
  it("records the web E2E artifact and source-of-truth booleans", () => {
    const web = readRestoreProofJson("web_e2e.json");
    expect(web.marketplace_ui_restored).toBe(true);
    expect(web.estimate_back_navigation_green).toBe(true);
    expect(web.pdf_button_green).toBe(true);
    expect(web.pdf_table_green).toBe(true);
    expect(web.pdf_no_mojibake).toBe(true);
    expectNoFakeGreen(web, "web_e2e.json");
  });
});
