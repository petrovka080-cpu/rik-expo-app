import fs from "node:fs";
import path from "node:path";

import {
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
} from "../../src/lib/consumerRequests";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { foundationDraftWithManualCatalogItem, MANUAL_CATALOG_ITEM } from "../requestEstimate/requestEstimateBoqCatalogTestHelpers";

describe("editable estimate workspace UI contract", () => {
  it("builds visible UI text without source, confidence, or PRICE_MISSING noise", () => {
    let bundle = foundationDraftWithManualCatalogItem();
    const item = bundle.items.find((row) => row.catalogItemId === MANUAL_CATALOG_ITEM.catalogItemId);
    if (!item) throw new Error("manual item missing");
    bundle = updateConsumerRepairRequestItemQuantity({ requestDraftId: bundle.draft.id, itemId: item.id, quantity: 2 });
    bundle = updateConsumerRepairRequestItemUnitPrice({ requestDraftId: bundle.draft.id, itemId: item.id, unitPrice: 5100 });

    const viewModel = buildRequestEstimateViewModel(bundle);
    const visibleText = [
      viewModel?.summary,
      viewModel?.priceStatusLabel,
      ...(viewModel?.visibleLines.map((line) => line.text) ?? []),
    ].join("\n");

    expect(visibleText).not.toMatch(/PRICE_MISSING|confidence|Источник|источник/i);
    expect(visibleText).toContain("вручную");
    expect(viewModel?.snapshotHash).toMatch(/^[a-f0-9]{8}$/);
  });

  it("exposes editable quantity and price inputs in the real row component source", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairItemRow.tsx"),
      "utf8",
    );

    expect(source).toContain("consumer-repair-item-quantity-input-");
    expect(source).toContain("consumer-repair-item-unit-price-input-");
    expect(source).toContain("consumer-repair-item-total-");
    expect(source).toContain("consumer-repair-item-price-status-");
    expect(source).not.toContain("confidenceLabel(");
  });

  it("routes price edits through consumer request service rather than screen-local mutation", () => {
    const screen = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(screen).toContain("updateConsumerRepairRequestItemUnitPrice");
    expect(screen).not.toMatch(/setState\(\{[^}]*unitPrice/s);
  });
});
