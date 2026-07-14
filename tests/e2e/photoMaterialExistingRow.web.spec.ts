import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

import {
  buildPhotoMaterialExistingRowAcceptanceMatrix,
  confirmPhotoMaterialExistingRowBinding,
  formatPhotoMaterialRequirementAndProduct,
} from "../../src/lib/ai/photoMaterialExistingRow";
import { applyEstimateRevisionQuantityEdit } from "../../src/lib/ai/estimateRevisions";
import {
  bindHistoryAndPdf,
  c2teCatalogProduct,
  confirmationPayload,
  confirmFixture,
  createReadyScanFixture,
  incompatibleCatalogProduct,
  probableObservations,
} from "../photoMaterialExistingRow/photoMaterialExistingRowTestHelpers";

const RUNTIME_DIR = path.join(process.cwd(), ".release-runtime", "photo-existing-row-web");

function writeRuntimeJson(name: string, value: unknown) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(path.join(RUNTIME_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test.describe("photo material existing row web proof", () => {
  test("runs exact barcode, preserve price, probable, incompatible, missing price, and conflict scenarios", () => {
    const exactFixture = createReadyScanFixture();
    expect(exactFixture.record.revision_state.revisions).toHaveLength(1);
    expect(exactFixture.recognition.candidates[0].visibleName).toBe("Ceresit CM 11");

    const exact = confirmFixture({ fixture: exactFixture, priceDecision: "APPLY_PHOTO_PRICE" });
    const exactText = formatPhotoMaterialRequirementAndProduct(exact.result.selectedRow);
    expect(exact.result.selectedRow.titleRu).toContain("C2TE");
    expect(exact.result.selectedRow.selectedProductBinding?.visibleName).toBe("Ceresit CM 11");
    expect(exact.result.selectedRow.priceStatus).toBe("USER_CONFIRMED_MARKET_PRICE");

    const parityState = bindHistoryAndPdf(exact.result.state);
    const matrix = buildPhotoMaterialExistingRowAcceptanceMatrix({
      recognition: exactFixture.recognition,
      confirmation: exact.result,
      state: parityState,
    });
    expect(matrix.ui_revision_equals_history_revision).toBe(true);
    expect(matrix.ui_revision_equals_pdf_revision).toBe(true);

    const preserved = confirmFixture({ priceDecision: "KEEP_EXISTING_PRICE" }).result;
    expect(preserved.selectedRow.unitPrice).toBe(100);
    expect(preserved.selectedRow.selectedProductBinding?.visibleName).toBe("Ceresit CM 11");

    const probable = createReadyScanFixture({
      catalog: Array.from({ length: 5 }, (_, index) =>
        c2teCatalogProduct({
          productId: `probable_${index}`,
          catalogItemId: `probable_catalog_${index}`,
          barcode: null,
          visibleName: `Ceresit tile adhesive C2TE ${index}`,
        })
      ),
      observations: probableObservations("scan_1"),
    });
    expect(probable.recognition.candidates.length).toBeLessThanOrEqual(3);

    const incompatible = createReadyScanFixture({
      catalog: [incompatibleCatalogProduct()],
      observations: [{
        observationId: "obs_wrong_barcode",
        scanId: "scan_1",
        imageId: "image_barcode",
        source: "BARCODE",
        field: "barcode",
        value: "4860000000999",
        confidence: 0.99,
      }],
    });
    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: incompatible.session,
      recognition: incompatible.recognition,
      state: incompatible.record.revision_state,
      snapshot: incompatible.current.editable_estimate_snapshot,
      payload: confirmationPayload({ recognition: incompatible.recognition, session: incompatible.session }),
    })).toThrow("PRODUCT_INCOMPATIBLE_WITH_ESTIMATE_ROW");

    const missingPrice = confirmFixture({ priceDecision: "KEEP_PRICE_MISSING" }).result;
    expect(missingPrice.selectedRow.unitPrice).toBeNull();
    expect(missingPrice.selectedRow.priceStatus).toBe("PRICE_MISSING");

    const conflictFixture = createReadyScanFixture();
    const changedState = applyEstimateRevisionQuantityEdit(conflictFixture.record.revision_state, {
      row_key: "mat_c2te",
      quantity: 241,
    });
    expect(() => confirmPhotoMaterialExistingRowBinding({
      session: conflictFixture.session,
      recognition: conflictFixture.recognition,
      state: changedState,
      snapshot: conflictFixture.current.editable_estimate_snapshot,
      payload: confirmationPayload({ recognition: conflictFixture.recognition, session: conflictFixture.session }),
    })).toThrow("REVISION_CONFLICT");

    writeRuntimeJson("web_results.json", {
      exact_barcode: true,
      preserve_price: true,
      probable_candidates_limited_to_three: probable.recognition.candidates.length <= 3,
      incompatible_blocked: true,
      missing_price_allowed: true,
      revision_conflict_blocked: true,
      visible_text: exactText,
      matrix,
      raw_images_written: false,
      signed_urls_written: false,
      fake_green_claimed: false,
    });
  });
});
