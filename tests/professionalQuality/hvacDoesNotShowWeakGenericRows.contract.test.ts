import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const FORBIDDEN_GENERIC_ROWS = [
  "материал",
  "работы",
  "монтаж",
  "крепеж",
  "прочее",
  "дополнительные материалы",
  "дополнительные работы",
] as const;

describe("HVAC weak generic row guard", () => {
  it("does not expose standalone generic rows in the HVAC estimate", () => {
    const answer = answerBuiltInAi({
      text: "смета на установку системы кондиционирования на 258 кв метров",
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const rows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];

    expect(rows.length).toBeGreaterThanOrEqual(30);
    for (const row of rows) {
      expect(FORBIDDEN_GENERIC_ROWS).not.toContain(row.trim().toLocaleLowerCase("ru-RU"));
    }
  });
});
