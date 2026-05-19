import fs from "node:fs";
import path from "node:path";

describe("AI all-buttons Android proof runner", () => {
  it("records every targetable AI button tap without session reset anti-patterns", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts", "e2e", "runAiAllButtonsRealUserMaestroProof.ts"),
      "utf8",
    );

    expect(source).toContain("_android_tap_trace.json");
    expect(source).toContain("all_targetable_ai_buttons_tapped_on_android");
    expect(source).toContain("resultVisibleAfterTap");
    expect(source).not.toMatch(/stopApp/i);
    expect(source).not.toMatch(/clear.*session/i);
  });
});
