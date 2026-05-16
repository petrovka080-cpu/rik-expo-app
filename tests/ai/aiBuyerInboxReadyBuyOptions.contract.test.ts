import {
  buildReadyBuyOptionsForBuyerRequest,
  describeProcurementReadyBuyOptionsForAssistant,
} from "../../src/features/ai/procurement/aiBuyerInboxReadyBuyOptions";
import { validateProcurementReadyBuyOptionBundlePolicy } from "../../src/features/ai/procurement/aiProcurementReadyBuyOptionPolicy";

describe("AI buyer inbox ready buy options", () => {
  it("prepares incoming buyer request cards from real internal evidence", () => {
    const bundle = buildReadyBuyOptionsForBuyerRequest({
      group: {
        request_id: "request-1248",
        items: [
          {
            request_item_id: "ri-1",
            request_id: "request-1248",
            name_human: "Cement M400",
            qty: 8,
            uom: "bag",
            status: "director_approved",
            last_offer_supplier: "ТОО Internal Cement",
            last_offer_price: 1200,
          },
          {
            request_item_id: "ri-2",
            request_id: "request-1248",
            name_human: "Rebar A500",
            qty: 4,
            uom: "tn",
            status: "director_approved",
          },
        ],
      },
      supplierRegistry: [
        {
          id: "supplier-rebar",
          name: "ТОО Rebar Registry",
          specialization: "арматура rebar металл",
        },
      ],
    });

    expect(bundle).toMatchObject({
      requestId: "request-1248",
      requestStatus: "director_approved",
      generatedFrom: "internal_first",
      directOrderAllowed: false,
      directPaymentAllowed: false,
      directWarehouseMutationAllowed: false,
    });
    expect(bundle?.options.map((option) => option.supplierName)).toEqual([
      "ТОО Internal Cement",
      "ТОО Rebar Registry",
    ]);
    expect(bundle?.options[0].priceSignal).toContain("цена");
    expect(bundle?.options[1].missingData).toEqual(expect.arrayContaining(["подтверждённая цена"]));
    expect(validateProcurementReadyBuyOptionBundlePolicy(bundle)).toBe(true);
  });

  it("shows an explicit no-internal-options bundle instead of fake suppliers", () => {
    const bundle = buildReadyBuyOptionsForBuyerRequest({
      group: {
        request_id: "request-empty",
        items: [
          {
            request_item_id: "ri-empty",
            request_id: "request-empty",
            name_human: "Unique custom fabricated part",
            qty: 1,
            status: "incoming",
          },
        ],
      },
      supplierRegistry: [
        {
          id: "supplier-cement",
          name: "ТОО Cement Only",
          specialization: "цемент бетон",
        },
      ],
    });

    expect(bundle?.options).toEqual([]);
    expect(bundle?.risks).toEqual(expect.arrayContaining(["готовые внутренние варианты не найдены"]));
    expect(bundle?.recommendedNextAction).toBe("request_market_options");
    expect(validateProcurementReadyBuyOptionBundlePolicy(bundle)).toBe(true);
  });

  it("describes prepared options for the chat instead of starting from zero", () => {
    const bundle = buildReadyBuyOptionsForBuyerRequest({
      group: {
        request_id: "request-chat",
        items: [
          {
            request_item_id: "ri-1",
            request_id: "request-chat",
            name_human: "Cable tray",
            status: "incoming",
          },
        ],
      },
      supplierRegistry: [
        {
          id: "supplier-cable",
          name: "ТОО Cable Evidence",
          specialization: "cable tray кабельный лоток",
        },
      ],
    });

    const summary = describeProcurementReadyBuyOptionsForAssistant(bundle);

    expect(summary).toContain("Готовые варианты закупки по заявке request-chat");
    expect(summary).toContain("ТОО Cable Evidence");
    expect(summary).toContain("Заказ, выбор поставщика, оплата и складское движение напрямую не выполняются.");
  });
});
