import { buildForemanTodayCloseoutAssistant } from "../../src/features/ai/foreman/aiForemanTodayCloseoutAssistant";

describe("foreman today closeout assistant", () => {
  it("prepares closeout drafts and missing evidence workbench actions", () => {
    const pack = buildForemanTodayCloseoutAssistant({
      closeoutReadyCount: 1,
      missingEvidenceCount: 1,
      items: [{
        id: "zone-b",
        title: "Объект Б",
        missingEvidence: "фото зоны 2",
        evidence: ["foreman:work:zone-b"],
      }],
    });

    expect(pack.readyItems[0]?.primaryActionLabel).toBe("Проверить missing evidence");
    expect(pack.nextActions.some((action) => action.label === "Подготовить акт")).toBe(true);
    expect(pack.dbWriteUsed).toBe(false);
  });
});
