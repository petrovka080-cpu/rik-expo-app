import { normalizeUniversalRoleQaQuestion } from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: question normalizer", () => {
  it("fixes messy Russian and common construction typos", () => {
    expect(normalizeUniversalRoleQaQuestion("сколко заявк было за май")).toContain("сколько заявок");
    expect(normalizeUniversalRoleQaQuestion("дай смтеу на асфалт 100 кв")).toContain("дай смету на асфальт 100 м2");
    expect(normalizeUniversalRoleQaQuestion("покжи платжи без докумнтов")).toContain("покажи платежи без документов");
  });
});
