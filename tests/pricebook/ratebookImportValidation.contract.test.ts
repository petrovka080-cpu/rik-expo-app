import {
  parseValidCsvImport,
  validImportRow,
} from "./pricebookRatebookTestHelpers";
import { validatePricebookRatebookImport } from "../../src/lib/ai/pricebookRatebookGovernance";

describe("pricebook ratebook import validation contract", () => {
  it("accepts CSV/supplier rows only as dry-run governed previews with source and supplier evidence", () => {
    const csvPreview = parseValidCsvImport();
    const supplierPreview = validatePricebookRatebookImport({
      format: "supplier_catalog",
      rows: [validImportRow()],
    });

    expect(csvPreview.dry_run_only).toBe(true);
    expect(csvPreview.will_write_to_db).toBe(false);
    expect(csvPreview.accepted_rows).toBe(1);
    expect(supplierPreview.accepted_rows).toBe(1);
    expect(supplierPreview.source_required).toBe(true);
    expect(supplierPreview.supplier_required_for_verified_price).toBe(true);
  });

  it("blocks import rows that try to publish verified prices without supplier or source", () => {
    const preview = validatePricebookRatebookImport({
      format: "csv",
      rows: [
        validImportRow({ supplier_id: "", supplier_visible_name: "" }),
        validImportRow({ source_reference: "", source_type: "supplier_catalog" }),
      ],
    });

    expect(preview.blocked_rows).toBe(2);
    expect(preview.validations.flatMap((row) => row.blockers.map((blocker) => blocker.code))).toEqual(
      expect.arrayContaining([
        "PRICEBOOK_SUPPLIER_REQUIRED_FOR_VERIFIED_PRICE",
        "PRICEBOOK_SOURCE_REQUIRED_FOR_VERIFIED_PRICE",
      ]),
    );
  });
});
