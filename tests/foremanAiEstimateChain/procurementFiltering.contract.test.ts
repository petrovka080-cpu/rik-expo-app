import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

describe("foreman AI estimate procurement filtering", () => {
  it("sends only buyer procurement rows after director approval", () => {
    const audit = buildForemanAiEstimateRoleChainAudit();

    expect(audit.buyer_receives_rows_after_approval).toBe(true);
    expect(audit.buyer_receives_only_procurement_rows).toBe(true);
    expect(audit.labor_rows_sent_to_buyer).toBe(false);
    expect(audit.quality_control_rows_sent_to_buyer).toBe(false);
    expect(audit.overhead_tax_rows_sent_to_buyer).toBe(false);
    expect(audit.buyer_rows_before_approval).toBe(0);
  });
});
