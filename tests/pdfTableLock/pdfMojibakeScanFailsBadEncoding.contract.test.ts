import { validateNoPdfMojibake } from "../../src/lib/estimatePdf";

describe("universal PDF mojibake scan", () => {
  it("fails known bad encoding markers", () => {
    const result = validateNoPdfMojibake("РЎРѓР СР ВµРЎвЂљР В° Р Р…Р В° Р СР С•Р Р…РЎвЂљР В°Р В¶");
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});
