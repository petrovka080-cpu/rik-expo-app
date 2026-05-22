import { resolveGlobalLocaleContext } from "../../src/lib/ai/globalEstimate";

describe("global locale resolver", () => {
  it("uses explicit request location before fallback", () => {
    const locale = resolveGlobalLocaleContext({ text: "Tile installation 50 m2 in Berlin" });
    expect(locale).toMatchObject({
      countryCode: "DE",
      city: "Berlin",
      currency: "EUR",
      taxMode: "vat",
      source: "explicit_question",
    });
  });
});
