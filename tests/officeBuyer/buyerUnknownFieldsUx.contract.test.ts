import { selectBuyerUnknownFieldsUx } from "../../src/screens/buyer/buyer.inbox.presentation";

describe("buyer unknown fields UX", () => {
  it("does not render question marks or fake zero sums for unknown procurement fields", () => {
    const ux = selectBuyerUnknownFieldsUx({
      price: "",
      counterparty: "",
      note: "",
      sum: 0,
    });

    expect(ux.priceText).toBe("Не заполнено");
    expect(ux.counterpartyText).toBe("Не выбран");
    expect(ux.noteText).toBe("—");
    expect(ux.sumText).toBe("появится после цены");
    expect(Object.values(ux).join(" ")).not.toContain("?");
    expect(ux.sumText).not.toBe("0 сом");
  });

  it("keeps a real zero sum only after the price is filled", () => {
    const ux = selectBuyerUnknownFieldsUx({
      price: "0",
      counterparty: "ОсОО Поставщик",
      note: "Проверить наличие",
      sum: 0,
    });

    expect(ux.priceText).toBe("0");
    expect(ux.counterpartyText).toBe("ОсОО Поставщик");
    expect(ux.noteText).toBe("Проверить наличие");
    expect(ux.sumText).toBe("0 сом");
  });
});
