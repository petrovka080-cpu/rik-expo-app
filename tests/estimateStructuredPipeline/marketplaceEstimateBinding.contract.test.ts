import { allPayloads, historyBindingForPayload } from "./structuredPipelineTestHelpers";

describe("marketplace structured estimate binding", () => {
  it("keeps request rows and catalog metadata through marketplace send", () => {
    const payload = allPayloads()[0];
    const { bundle, marketplacePayload } = historyBindingForPayload(payload);
    expect(bundle.marketplaceLink.status).toBe("sent");
    expect(marketplacePayload.items.length).toBe(bundle.items.length);
    expect(marketplacePayload.items.map((item) => item.titleRu).sort()).toEqual(
      bundle.items.map((item) => item.titleRu).sort(),
    );
  });
});
