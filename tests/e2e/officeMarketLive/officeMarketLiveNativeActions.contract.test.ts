import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("office/Market live native action harness contract", () => {
  const source = read("scripts/e2e/runOfficeMarketLiveNativeActions.ts");
  const listingModal = read("src/screens/profile/components/ListingModal.tsx");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  it("requires linked Web and native role-smoke evidence on API 34", () => {
    expect(packageJson.scripts?.["e2e:office-market-live-native-actions"]).toBe(
      "tsx scripts/e2e/runOfficeMarketLiveNativeActions.ts",
    );
    expect(source).toContain("OFFICE_E2E_SOURCE_WEB_SUMMARY");
    expect(source).toContain("OFFICE_E2E_SOURCE_NATIVE_SMOKE_SUMMARY");
    expect(source).toContain("GREEN_OFFICE_AI_MARKET_NATIVE_ROLE_GUARD_READ_SMOKE_NO_BUILD_NO_APP_DATA_CLEAR");
    expect(source).toContain('api.ok && api.output === "34"');
  });

  it("publishes a Buyer RFQ through native UI and reads back the exact item", () => {
    expect(source).toContain("buyer-item-toggle-");
    expect(source).toContain('"buyer-rfq-publish"');
    expect(source).toContain('.from("tenders")');
    expect(source).toContain('.from("tender_items")');
    expect(source).toContain("request_item_id");
    expect(source).toContain("buyer_rfq_native_reopen");
  });

  it("creates native Market media and proves durable public readback", () => {
    for (const id of [
      "market-add-title",
      "market-add-description",
      "market-add-city",
      "market-add-price",
      "market-add-phone",
    ]) {
      expect(listingModal).toContain(`testID="${id}"`);
    }
    expect(source).toContain("marketplace.media.entrypoints.gallery_photo_button");
    expect(source).toContain("marketplace.media.entrypoints.thumbnail.replace.0");
    expect(source).toContain("marketplace.media.entrypoints.thumbnail.remove.0");
    expect(source).toContain("marketplace.media.entrypoints.suggestion.change");
    expect(source).toContain("marketplace.media.entrypoints.suggestion.remove");
    expect(source).toContain("fallbackButtonId ? await seekMarketFormNode(fallbackButtonId, 0) : null");
    expect(source).toContain('!snapshot.text.includes("Проверяю товар...")');
    expect(source).toContain('!snapshot.text.includes("Не удалось заменить фото.")');
    expect(source).toContain('status?.text.trim() === "Загружено" || settledSuggestion');
    expect(source).toContain('nodeById(review, "button_add")');
    expect(source).toContain('"540", "700", "540", "1750"');
    expect(source).toContain('"540", "1700", "540", "650"');
    expect(source).toContain('.from("media_links")');
    expect(source).toContain('.from("media_assets")');
    expect(source).toContain("public_image_fetch_ok");
    expect(source).toContain("market_native_owner_history_reopen");
  });

  it("preserves app data and forbids release/privileged shortcuts", () => {
    expect(source).toContain("clearAppState: false");
    expect(source).toContain("app_data_cleared: false");
    expect(source).toContain("apk_built: false");
    expect(source).toContain("apk_installed: false");
    expect(source).not.toContain("pm clear");
    expect(source).not.toContain("adb install");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source).not.toContain("developer_set_effective_role_v1");
  });
});
