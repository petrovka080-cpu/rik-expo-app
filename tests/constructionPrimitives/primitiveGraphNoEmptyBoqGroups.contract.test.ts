import { primitiveGraph } from "./primitiveBoqTestHelpers";

describe("construction primitive BOQ group policy", () => {
  it("does not allow domains or operations without BOQ groups", () => {
    expect(primitiveGraph.domains.filter((domain) => domain.requiredBoqGroups.length === 0)).toEqual([]);
    expect(primitiveGraph.operations.filter((operation) => operation.requiredBoqGroups.length === 0)).toEqual([]);
  });
});
