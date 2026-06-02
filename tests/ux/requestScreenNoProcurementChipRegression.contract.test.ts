import { collectUiChecks, expectCheckPassed, readUtf8 } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("request screen estimate copy regression", () => {
  it("keeps the consumer entrypoint as Смета without a procurement chip primary flow", () => {
    expectCheckPassed(collectUiChecks(), "request_screen_estimate_not_procurement_chip");
    const source = readUtf8("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");

    expect(source).toContain('title="Смета"');
    expect(source).toContain("Маркет");
    expect(source).not.toMatch(/labelRu:\s*["']Сохранить["']/);
    expect(source).not.toMatch(/Закупк|procurement/i);
  });
});
