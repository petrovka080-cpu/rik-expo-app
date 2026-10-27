export type AiEstimateExtensionKind = "procurement" | "pricing" | "fulfillment";

export type AiEstimateExtensionPoint = {
  readonly extensionKind: AiEstimateExtensionKind;
  readonly contractVersion: "ai-estimate-extension-v1";
  readonly mayMutateRevision: false;
  readonly mayWriteLedgerDirectly: false;
  readonly consumesApprovedRevisionOnly: true;
};

export function createAiEstimateExtensionPoint(kind: AiEstimateExtensionKind): AiEstimateExtensionPoint {
  return {
    extensionKind: kind,
    contractVersion: "ai-estimate-extension-v1",
    mayMutateRevision: false,
    mayWriteLedgerDirectly: false,
    consumesApprovedRevisionOnly: true,
  };
}
