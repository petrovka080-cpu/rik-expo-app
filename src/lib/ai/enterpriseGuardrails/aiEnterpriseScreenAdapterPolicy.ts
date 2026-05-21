export type AiEnterpriseScreenAdapterRule = {
  screenMayPassContext: true;
  screenMaySendQuestionOrButtonId: true;
  screenMayRenderPreparedAnswer: true;
  screenMayClassifyIntent: false;
  screenMayPlanSources: false;
  screenMayCallWebDirectly: false;
  screenMayCallPdfDirectly: false;
  screenMayCallFinanceDirectly: false;
  screenMayCallWarehouseDirectly: false;
  screenMayMutateFromAiAnswer: false;
  screenMayFormatRawProviderPayload: false;
};

export const AI_ENTERPRISE_SCREEN_ADAPTER_POLICY: AiEnterpriseScreenAdapterRule = {
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
};
