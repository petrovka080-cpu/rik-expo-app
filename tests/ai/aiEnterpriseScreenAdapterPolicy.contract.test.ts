import { AI_ENTERPRISE_SCREEN_ADAPTER_POLICY } from "../../src/lib/ai/enterpriseGuardrails";

describe("AI enterprise screen adapter policy", () => {
  it("makes screens presenters, not AI brains", () => {
    expect(AI_ENTERPRISE_SCREEN_ADAPTER_POLICY).toMatchObject({
      screenMayPassContext: true,
      screenMaySendQuestionOrButtonId: true,
      screenMayRenderPreparedAnswer: true,
      screenMayClassifyIntent: false,
      screenMayPlanSources: false,
      screenMayCallWebDirectly: false,
      screenMayCallPdfDirectly: false,
      screenMayCallFinanceDirectly: false,
      screenMayCallWarehouseDirectly: false,
      screenMayMutateFromAiAnswer: false,
      screenMayFormatRawProviderPayload: false,
    });
  });
});
