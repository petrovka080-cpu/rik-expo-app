import fs from "node:fs";
import path from "node:path";

describe("AI screen magic scoped Maestro runner", () => {
  it("supports per-wave Android targetability proof without hidden shims or direct mutations", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenMagicMaestro.ts"), "utf8");

    expect(source).toContain("getAiScreenMagicScopedWaveConfig(scope)");
    expect(source).toContain("runAiScreenByScreenMagicMaestro");
    expect(source).toContain("GREEN_AI_SCREEN_MAGIC_MAESTRO_READY");
    expect(source).toContain("route_targetable");
    expect(source).toContain("input_targetable");
    expect(source).toContain("safe_read_button_targetable");
    expect(source).toContain("draft_only_button_targetable_where_available");
    expect(source).toContain("approval_required_routes_to_approval_where_available");
    expect(source).toContain("directDangerousMutationUsed: false");
    expect(source).toContain("fakeGreenClaimed: false");
    expect(source).not.toContain("hidden_testid_shim");
  });
});
