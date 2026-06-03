import { classifyWorld, WORLD_PROMPTS } from "./worldConstructionTestHelpers";

describe("unknown construction work", () => {
  it("returns safe template gap instead of generic construction rows", () => {
    const classification = classifyWorld(WORLD_PROMPTS.unknown).primitive;

    expect(classification.outcome).toBe("TEMPLATE_GAP_SAFE_TRIAGE");
    expect(classification.workKey).toBeNull();
    expect(classification.titleRu).toContain("ручная сметная проверка");
  });

  it("does not turn unsupported speculative material systems into generic facade estimates", () => {
    const classification = classifyWorld("estimate plasma crystal facade 80 sq m").primitive;

    expect(classification.outcome).toBe("TEMPLATE_GAP_SAFE_TRIAGE");
    expect(classification.workKey).toBeNull();
    expect(classification.domain).toBe("facade");
  });
});
