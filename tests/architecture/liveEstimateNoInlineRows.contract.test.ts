import { readRepoFile } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate architecture - no inline screen rows", () => {
  it("does not place P0 BOQ rows in screen files", () => {
    const screens = `${readRepoFile("app/(tabs)/request/index.tsx")}\n${readRepoFile("app/(tabs)/ai.tsx")}`;
    expect(screens).not.toMatch(/Фермы \/ балки|Брусчатка \/ тротуарная плитка|Линолеум с запасом|Мауэрлат/);
  });
});
