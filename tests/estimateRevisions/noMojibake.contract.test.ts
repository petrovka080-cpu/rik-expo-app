import { estimateRevisionMojibakeFound } from "../../src/lib/ai/estimateRevisions";

describe("revision text mojibake guard", () => {
  it("accepts readable Russian revision labels and rejects mojibake", () => {
    expect(estimateRevisionMojibakeFound("\u0412\u0435\u0440\u0441\u0438\u044f 2. \u0426\u0435\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430.")).toBe(false);
    expect(estimateRevisionMojibakeFound("Р РµРјРѕРЅС‚")).toBe(true);
  });
});
