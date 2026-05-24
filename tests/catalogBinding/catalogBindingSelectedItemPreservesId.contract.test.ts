import { selectedFoundationBinding } from "./catalogBindingTestHelpers";

describe("selected catalog item identity", () => {
  it("preserves selectedCatalogItemId after user selection", async () => {
    const { binding, selectedRowId, selectedCatalogItemId } = await selectedFoundationBinding();
    expect(binding.rows.find((row) => row.rowId === selectedRowId)?.selectedCatalogItemId).toBe(selectedCatalogItemId);
  });
});
