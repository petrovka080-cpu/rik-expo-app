import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("officeDomainProvider", () => {
  it("returns stuck office task counts without sending reminders", async () => {
    const result = await getDomainGatewayProvider("office").execute(createDomainGatewayTestQuery("office"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "office_stuck_tasks", value: 7 }),
      expect.objectContaining({ key: "office_overdue_tasks", value: 3 }),
    ]));
    expect(result.safety.finalSubmit).toBe(false);
  });
});
