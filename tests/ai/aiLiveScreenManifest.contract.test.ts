import { listAiLiveScreenManifests } from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen manifest", () => {
  it("covers all required live AI screens with Russian titles and required sections", () => {
    const manifests = listAiLiveScreenManifests();
    expect(manifests.map((item) => item.screenId)).toEqual([
      "director",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "documents",
      "market",
      "office",
      "client",
    ]);
    for (const manifest of manifests) {
      expect(manifest.titleRu).toMatch(/[А-Яа-яЁё]/);
      expect(manifest.defaultQuestionRu).toMatch(/[А-Яа-яЁё]/);
      expect(manifest.requiredAnswerSections).toEqual(expect.arrayContaining(["short", "found", "links", "sources", "missing", "next_step", "status"]));
      expect(manifest.requiredAiButtons.length).toBeGreaterThanOrEqual(manifest.screenId === "office" ? 6 : manifest.screenId === "client" ? 5 : 7);
    }
  });
});
