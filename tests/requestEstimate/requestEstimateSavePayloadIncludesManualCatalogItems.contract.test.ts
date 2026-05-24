import { foundationDraftWithManualCatalogItem, MANUAL_CATALOG_ITEM } from "./requestEstimateBoqCatalogTestHelpers";
import { updateConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";

describe("request save payload manual catalog items", () => {
  it("keeps manual catalog items after draft save", () => {
    const bundle = foundationDraftWithManualCatalogItem();
    const saved = updateConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      patch: { city: "Бишкек" },
    });
    expect(saved.items.some((item) => item.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId)).toBe(true);
  });
});
