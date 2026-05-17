import fs from "node:fs";
import path from "node:path";

describe("AI screen-by-screen magic Maestro runner", () => {
  it("keeps Android targetability proof for the required screen set", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenByScreenMagicMaestro.ts"), "utf8");

    expect(source).toContain("buyer.request.detail");
    expect(source).toContain("accountant.payment");
    expect(source).toContain("foreman.ai.quick_modal");
    expect(source).toContain("GREEN_AI_SCREEN_BY_SCREEN_MAGIC_MAESTRO_READY");
    expect(source).toContain("buttons_targeted_on_android");
    expect(source).toContain("dangerous direct action unavailable");
  });
});
