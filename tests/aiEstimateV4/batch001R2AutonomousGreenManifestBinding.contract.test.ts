import {
  BATCH001_EXACT_MANIFEST_HASH_V3,
  allBatch001ContractParts,
} from "./batch001R2ContractSupport";

describe("BATCH001 R2 autonomous GREEN manifest binding", () => {
  test("binds all work contracts to one exact predecessor manifest without transport dependency", () => {
    const parts = allBatch001ContractParts();
    expect(parts).toHaveLength(16);
    expect(BATCH001_EXACT_MANIFEST_HASH_V3).toBe(
      "5e172c9cc2df9712028707e9b24984dbc76430670e1e95dec783b0e0d4444138",
    );
    expect(parts.every((item) => !("manifest_hash" in item.contract))).toBe(true);
    expect(parts.every((item) => item.schema.schema_version === "3.0.0")).toBe(true);
  });
});
