import {
  AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS,
  buildAiRealUserButtonManifest,
  buildAiRealUserUiInventory,
} from "../../scripts/ai/aiRealUserButtonProof";

describe("AI button manifest completeness", () => {
  it("inventories every required screen and every visible AI button", () => {
    const inventory = buildAiRealUserUiInventory();
    const manifest = buildAiRealUserButtonManifest();
    const manifestScreens = new Set(manifest.map((entry) => entry.screenId));

    expect(inventory.missing_screens).toEqual([]);
    for (const screenId of AI_REAL_USER_UI_BUTTON_REQUIRED_SCREENS) {
      expect(manifestScreens.has(screenId)).toBe(true);
    }
    expect(manifest.filter((entry) => entry.visibleToUser).length).toBeGreaterThan(0);
  });
});
