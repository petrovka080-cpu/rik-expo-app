import type { AiModelCompleteInput, AiModelCompleteResult, AiModelProviderPort } from "./AiModelProviderPort";

export class InMemoryAiModelProvider implements AiModelProviderPort {
  readonly providerKey: string;

  constructor(providerKey = "in_memory_test_provider") {
    this.providerKey = providerKey;
  }

  async complete(input: AiModelCompleteInput): Promise<AiModelCompleteResult> {
    const inputChars = input.messages.reduce((total, message) => total + message.content.length, 0);
    const overBudget = inputChars > input.budget.maxInputChars;
    return {
      providerKey: this.providerKey,
      modelKey: input.modelKey,
      text: overBudget ? "" : `AI platform response: ${input.responseContract?.contractId ?? "text"}`,
      structured: input.responseContract?.responseFormat === "json"
        ? { contractId: input.responseContract.contractId, providerKey: this.providerKey }
        : undefined,
      usage: {
        inputChars,
        outputTokens: overBudget ? 0 : 16,
      },
      safety: {
        redacted: true,
        blocked: overBudget,
        reason: overBudget ? "AI platform input budget exceeded" : undefined,
      },
    };
  }
}
