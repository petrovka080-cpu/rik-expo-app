import { createMarketplaceProductCardDraftAction } from "../../../src/lib/ai/safeActions";
import { expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("marketplace product card draft action", () => {
  it("prepares product card draft without publish, price invention or stock invention", () => {
    const draft = createMarketplaceProductCardDraftAction();
    expect(draft.draftPayload).toMatchObject({
      productPublished: false,
      priceInvented: false,
    });
    expect(draft.missingData).toEqual(expect.arrayContaining(["цена", "остаток", "поставщик"]));
    expectDraftIsSafe(draft);
  });
});
