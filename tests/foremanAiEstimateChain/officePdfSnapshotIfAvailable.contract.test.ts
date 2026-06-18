import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("foreman AI estimate office PDF snapshot contract", () => {
  it("keeps the office PDF route separate from B2C request PDF sources", () => {
    const foremanDraftModal = readFileSync(join(process.cwd(), "src/screens/foreman/ForemanDraftModal.tsx"), "utf8");
    const foremanPdfHook = readFileSync(join(process.cwd(), "src/screens/foreman/hooks/useForemanPdf.ts"), "utf8");

    expect(foremanDraftModal).toContain("foreman-draft-footer-pdf");
    expect(foremanPdfHook).toContain("buildForemanRequestPdfDescriptor");
    expect(foremanPdfHook).not.toContain("consumerRepair");
    expect(foremanPdfHook).not.toContain("request-estimate-summary-card");
  });
});
