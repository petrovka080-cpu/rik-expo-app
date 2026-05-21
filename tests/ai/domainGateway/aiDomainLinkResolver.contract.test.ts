import { buildAiGatewayCrossDomainChain, buildAiGoldenCrossDomainLinks } from "../../../src/lib/ai/domainDataGateway";

describe("AI Domain cross-domain link resolver", () => {
  it("links request, warehouse, work, document and payment evidence", () => {
    const links = buildAiGoldenCrossDomainLinks();
    const chain = buildAiGatewayCrossDomainChain();

    expect(links.some((link) => link.relation === "warehouse_issued_to_work")).toBe(true);
    expect(links.some((link) => link.relation === "payment_has_pdf")).toBe(true);
    expect(chain.map((step) => step.stepRu).join("\n")).toContain("Недостача по заявке: 60 листов");
  });
});
