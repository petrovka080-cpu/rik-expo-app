import {
  CONSUMER_REPAIR_CONTEXT,
  assertConsumerRepairScope,
} from "../../src/lib/consumerRequests";
import { buildAiDomainPermissionScope } from "../../src/lib/ai/domainDataGateway/aiDomainPermissionScope";

describe("consumer repair no office access contract", () => {
  it("keeps consumer repair context outside B2B office scope", () => {
    expect(CONSUMER_REPAIR_CONTEXT.companyDataAccess).toBe(false);
    expect(CONSUMER_REPAIR_CONTEXT.officeAccess).toBe(false);
    expect(CONSUMER_REPAIR_CONTEXT.dataScope).toBe("consumer_only");
    expect(() => assertConsumerRepairScope(CONSUMER_REPAIR_CONTEXT)).not.toThrow();
  });

  it("allows only consumer repair and marketplace domains for consumer role", () => {
    const scope = buildAiDomainPermissionScope({
      role: "consumer",
      userId: "consumer-1",
      orgId: "none",
    });

    expect(scope.allowedDomains).toEqual(expect.arrayContaining(["consumer_repair", "marketplace"]));
    expect(scope.forbiddenDomains).toEqual(expect.arrayContaining(["office", "finance", "warehouse", "approvals"]));
  });
});
