import fs from "node:fs";
import path from "node:path";

import { buildAiRealUserLocalizationAudit } from "../../scripts/ai/aiRealUserButtonProof";

describe("AI UI does not expose internal action kinds", () => {
  it("keeps technical action kinds out of normal user UI source and copy audit", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"),
      "utf8",
    );
    const audit = buildAiRealUserLocalizationAudit();

    expect(source).not.toContain("safe_read");
    expect(source).not.toContain("draft_only");
    expect(source).not.toContain("approval_required");
    expect(source).not.toContain("Prepared work");
    expect(audit.final_status).toBe("GREEN_AI_RUSSIAN_UI_COPY_READY");
  });
});
