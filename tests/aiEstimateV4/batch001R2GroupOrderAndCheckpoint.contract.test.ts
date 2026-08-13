import { allBatch001ContractParts } from "./batch001R2ContractSupport";

describe("BATCH001 R2 group order and checkpoint", () => {
  test("preserves FRAME 5 then ALIGN 5 then CLAD 6", () => {
    const contracts = allBatch001ContractParts().map((item) => item.contract);
    expect(contracts.map((item) => item.group)).toEqual([
      ...Array(5).fill("FRAME"), ...Array(5).fill("ALIGN"), ...Array(6).fill("CLAD"),
    ]);
    expect(contracts.map((item) => item.group_order)).toEqual([
      ...Array(5).fill(1), ...Array(5).fill(2), ...Array(6).fill(3),
    ]);
  });
});
