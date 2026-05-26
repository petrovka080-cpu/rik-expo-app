import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("entrypoint fix no inline rows", () => {
  it("does not hardcode work-specific estimate rows in route screens", () => {
    const screens = [
      readRepoFile("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      readRepoFile("src/features/ai/AIAssistantScreen.tsx"),
      readRepoFile("app/(tabs)/request/index.tsx"),
      readRepoFile("app/(tabs)/ai.tsx"),
    ].join("\n");
    expect(screens).not.toMatch(/Оконный блок|Турбина для микро-ГЭС|Листы ГКЛ|Песчаное основание|Кладка кирпича/);
  });
});
