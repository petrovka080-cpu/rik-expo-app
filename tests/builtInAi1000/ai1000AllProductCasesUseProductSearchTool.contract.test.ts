import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 product/material routing", () => {
  it("routes every product case to a product or marketplace search tool", () => {
    const { matrix, transcripts } = getAi1000Artifacts();
    const productTranscripts = transcripts.filter((trace) => Number(trace.id) >= 972);

    expect(productTranscripts).toHaveLength(29);
    expect(matrix.product_search_tool_called_all_product_cases).toBe(true);
    expect(productTranscripts.every((trace) => ["product_search", "marketplace_lookup"].includes(trace.detected_intent))).toBe(true);
    expect(productTranscripts.every((trace) => ["search_material_products", "search_marketplace_products"].includes(String(trace.selected_tool)))).toBe(true);
    expect(matrix.fake_stock_or_availability_found).toBe(false);
    expect(matrix.fake_supplier_found).toBe(false);
  });
});
