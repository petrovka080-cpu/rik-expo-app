import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("concrete pedestal BOQ recipe", () => {
  it("contains pedestal-specific rows and does not fall back to slab or screed rows", () => {
    const answer = answerBuiltInAi({
      text: "смета на заливку бетонных тумб 12 шт",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    const text = estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)).join("\n").toLocaleLowerCase("ru-RU") ?? "";

    expect(estimate?.work.workKey).toBe("concrete_pedestal_pour");
    expect(text).toContain("тумб");
    expect(text).toContain("опалуб");
    expect(text).toContain("арматур");
    expect(text).not.toContain("бетонная плита");
    expect(text).not.toContain("стяжка пола");
  });
});
