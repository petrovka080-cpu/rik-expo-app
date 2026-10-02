import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

describe("procurement list governed estimate template", () => {
  it("preserves materials, quantities, sources, procurement and PDF rows", () => {
    const answer = answerBuiltInAi({
      text: "составь смету и список закупки материалов для ремонта 100 м²",
      screenContext: "chat",
      route: "/chat",
      role: "unknown",
      userId: "procurement-list-governed-template",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;

    expect(estimate?.work.workKey).toBe("procurement_list");
    const rows = estimate?.sections.flatMap((section) => section.rows) ?? [];
    const visible = rows.map((row) => row.name.toLocaleLowerCase("ru-RU")).join("\n");
    for (const token of ["материал", "объём", "источник", "закуп", "pdf"]) {
      expect(visible).toContain(token);
    }
    expect(rows.every((row) => row.sourceEvidence.length > 0)).toBe(true);
    expect(visible).not.toContain("финишное покрытие стен");
  });
});
