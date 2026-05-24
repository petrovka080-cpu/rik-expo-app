import { planBuiltInAi50000Phase3WebDomainSample } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 3 route distribution", () => {
  it("uses the required web route breakdown", () => {
    const sample = planBuiltInAi50000Phase3WebDomainSample();
    const count = (route: string) => sample.filter((item) => item.route === route).length;
    expect(count("/chat")).toBe(250);
    expect(count("/ai?context=foreman")).toBe(75);
    expect(count("/request")).toBe(100);
    expect(count("/product/search")).toBe(50);
    expect(count("/pdf-viewer")).toBe(25);
  });
});
