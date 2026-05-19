import {
  buildAiWarehouseLogisticsMagicMatrix,
  listAiWarehouseLogisticsMagicPacks,
} from "../../scripts/ai/aiWarehouseLogisticsMagic";

describe("AI warehouse logistics no fake warehouse data", () => {
  it("does not invent stock, incoming rows, issue rows or supplier records", () => {
    const matrix = buildAiWarehouseLogisticsMagicMatrix({ webProofPass: true, androidProofPass: true });
    const serialized = JSON.stringify(listAiWarehouseLogisticsMagicPacks());

    expect(matrix.fake_stock_created).toBe(false);
    expect(matrix.fake_incoming_created).toBe(false);
    expect(matrix.fake_supplier_created).toBe(false);
    expect(serialized).not.toMatch(/fake stock|invented stock|synthetic stock/i);
    expect(serialized).not.toMatch(/fake incoming|invented incoming|synthetic incoming/i);
    expect(serialized).not.toMatch(/\bSupplier A\b|\bSupplier B\b|fake supplier|invented supplier|synthetic supplier/i);
  });
});
