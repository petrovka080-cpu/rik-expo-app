import { createAiDomainCheckedEmptyResult } from "../../../src/lib/ai/domainDataGateway";
import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("AI Domain checked-empty", () => {
  it("is explicit and is not used for positive golden data", async () => {
    const empty = createAiDomainCheckedEmptyResult({
      queryId: "empty",
      domain: "procurement",
      summaryRu: "Заявки не найдены после проверки.",
      checkedSources: ["заявки", "строки заявок"],
    });
    const bundle = await getDomainGatewayTestBundle();

    expect(empty.status).toBe("checked_empty");
    expect(empty.checkedSources).toHaveLength(2);
    expect(bundle.domainResults.some((result) => result.status === "checked_empty")).toBe(false);
  });
});
