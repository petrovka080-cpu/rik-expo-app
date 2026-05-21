import { extractUniversalRoleQaFilters } from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: filter extractor", () => {
  it("extracts period, floor, material, work type and status", () => {
    const filters = extractUniversalRoleQaFilters("покажи заявки по первому этажу за май по ГКЛ без документов", "2026-05-20");

    expect(filters.period?.from).toBe("2026-05-01");
    expect(filters.floor?.number).toBe(1);
    expect(filters.material?.normalizedNameRu).toBe("гкл");
    expect(filters.status?.normalized).toBe("missing_docs");
  });
});
