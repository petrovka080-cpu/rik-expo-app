import { selectProcurementUnknownFieldsUx } from "../../src/features/office/procurementPresentation";
import { buildProcurementLifecycleItemView } from "../../src/features/office/procurementLifecycle";

describe("buyer procurement unknown values", () => {
  it("does not replace unknown procurement data with question marks or zero sums", () => {
    const ux = selectProcurementUnknownFieldsUx({
      price: null,
      counterparty: "",
      note: "",
      sum: null,
    });
    const lifecycle = buildProcurementLifecycleItemView({
      requestItemId: "item-unknown",
      qty: 8,
    });

    expect(ux.priceText).toBe("Не заполнено");
    expect(ux.counterpartyText).toBe("Не выбран");
    expect(ux.sumText).toBe("появится после цены");
    expect(lifecycle.amountText).toBe("появится после цены");
    expect(`${ux.priceText} ${ux.counterpartyText} ${ux.sumText} ${lifecycle.amountText}`).not.toContain("?");
    expect(ux.sumText).not.toBe("0 сом");
    expect(lifecycle.hasFakeZeroAmount).toBe(false);
  });
});
