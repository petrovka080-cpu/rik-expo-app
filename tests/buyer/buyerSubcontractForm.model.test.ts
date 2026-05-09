import {
  BUYER_SUBCONTRACT_EMPTY_FORM,
  BUYER_SUBCONTRACT_UOM_OPTIONS,
  buyerSubcontractToNum,
  filterBuyerSubcontractContractorRows,
  firstBuyerSubcontractContractorRow,
  getBuyerSubcontractErrorText,
  isBuyerSubcontractContractorRow,
  normalizeBuyerSubcontractInn,
  normalizeBuyerSubcontractPhone996,
  toBuyerSubcontractPriceType,
  toBuyerSubcontractWorkMode,
} from "../../src/screens/buyer/buyerSubcontractForm.model";

describe("buyerSubcontractForm.model", () => {
  it("keeps the empty form shape stable", () => {
    expect(BUYER_SUBCONTRACT_EMPTY_FORM).toMatchObject({
      contractorOrg: "",
      contractorInn: "",
      contractorRep: "",
      contractorPhone: "",
      foremanName: "",
      contractNumber: "",
      contractDate: "",
      objectName: "",
      workZone: "",
      workType: "",
      qtyPlanned: "",
      uom: "",
      dateStart: "",
      dateEnd: "",
      workMode: "",
      pricePerUnit: "",
      totalPrice: "",
      priceType: "",
      foremanComment: "",
    });
  });

  it("keeps subcontract UOM options available for the dropdown", () => {
    expect(BUYER_SUBCONTRACT_UOM_OPTIONS).toHaveLength(9);
    expect(BUYER_SUBCONTRACT_UOM_OPTIONS.map((option) => option.code)).toEqual([
      "шт",
      "м",
      "м2",
      "м3",
      "кг",
      "т",
      "компл",
      "смена",
      "час",
    ]);
  });

  it("normalizes numeric input without changing empty-string behavior", () => {
    expect(buyerSubcontractToNum("12,5")).toBe(12.5);
    expect(buyerSubcontractToNum(" 7.25 ")).toBe(7.25);
    expect(buyerSubcontractToNum("")).toBe(0);
    expect(buyerSubcontractToNum("not-a-number")).toBeNull();
  });

  it("normalizes Kyrgyz phone input to the 996 shape used by matching logic", () => {
    expect(normalizeBuyerSubcontractPhone996("+996 555 123 456")).toBe("996555123456");
    expect(normalizeBuyerSubcontractPhone996("0555 123 456")).toBe("996555123456");
    expect(normalizeBuyerSubcontractPhone996("555123456")).toBe("996555123456");
    expect(normalizeBuyerSubcontractPhone996("00 555 123 456")).toBe("996555123456");
    expect(normalizeBuyerSubcontractPhone996("123")).toBe("123");
    expect(normalizeBuyerSubcontractPhone996("")).toBe("");
  });

  it("strips non-digits from contractor INN values", () => {
    expect(normalizeBuyerSubcontractInn("123-45 abc")).toBe("12345");
    expect(normalizeBuyerSubcontractInn("")).toBe("");
  });

  it("prefers non-empty Error messages and otherwise returns fallback text", () => {
    expect(getBuyerSubcontractErrorText(new Error(" saved message "), "fallback")).toBe("saved message");
    expect(getBuyerSubcontractErrorText(new Error("   "), "fallback")).toBe("fallback");
    expect(getBuyerSubcontractErrorText("plain failure", "fallback")).toBe("fallback");
  });

  it("narrows contractor rows while preserving optional id and phone fields", () => {
    expect(isBuyerSubcontractContractorRow({ id: "contractor-1", phone: "+996555000111" })).toBe(true);
    expect(isBuyerSubcontractContractorRow({ id: null })).toBe(true);
    expect(isBuyerSubcontractContractorRow({ id: 42, phone: "+996555000111" })).toBe(false);
    expect(isBuyerSubcontractContractorRow(null)).toBe(false);

    const mixedRows = [
      { id: 42, phone: "+996555000000" },
      { id: "contractor-1", phone: null },
      { id: "contractor-2", phone: "+996555000222" },
    ];

    expect(firstBuyerSubcontractContractorRow(mixedRows)).toEqual({
      id: "contractor-1",
      phone: null,
    });
    expect(filterBuyerSubcontractContractorRows(mixedRows)).toEqual([
      { id: "contractor-1", phone: null },
      { id: "contractor-2", phone: "+996555000222" },
    ]);
    expect(firstBuyerSubcontractContractorRow("not rows")).toBeNull();
    expect(filterBuyerSubcontractContractorRows("not rows")).toEqual([]);
  });

  it("maps select state into nullable typed subcontract DTO fields", () => {
    expect(toBuyerSubcontractWorkMode("turnkey")).toBe("turnkey");
    expect(toBuyerSubcontractWorkMode("")).toBeNull();
    expect(toBuyerSubcontractPriceType("by_hour")).toBe("by_hour");
    expect(toBuyerSubcontractPriceType("")).toBeNull();
  });
});
