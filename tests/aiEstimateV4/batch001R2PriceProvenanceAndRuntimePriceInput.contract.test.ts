import { allBatch001ContractParts, allBatch001Rows } from "./batch001R2ContractSupport";

describe("BATCH001 R2 price provenance and runtime price input", () => {
  test("routes every priced row to a bounded editable KGS input and explicit price source/date", () => {
    const schemaByCatalog = new Map(allBatch001ContractParts().map((item) => [item.contract.catalog_id, item.schema]));
    for (const { parts, row } of allBatch001Rows()) {
      const route = row.price_route_v3;
      expect(route).not.toBeNull();
      if (route?.kind === "NOT_APPLICABLE_INFORMATIONAL_OUTPUT") {
        expect(row.cost_ownership).toBe("informational_output");
        continue;
      }
      expect(route?.price_basis_reference_parameter_id).toBe("price_basis_reference");
      expect(route?.price_basis_date_parameter_id).toBe("price_basis_date");
      const parameter = schemaByCatalog.get(parts.contract.catalog_id)?.parameters.find((item) =>
        item.parameter_id === route?.unit_price_parameter_id);
      expect(parameter).toMatchObject({ input_type: "number", minimum: 0.01 });
    }
  });
});
