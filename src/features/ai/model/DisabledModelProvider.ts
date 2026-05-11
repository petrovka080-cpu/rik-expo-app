import type { AiModelClient } from "./AiModelClient";
import type { AiModelRequest, AiModelResponse } from "./AiModelTypes";

export class DisabledModelProvider implements AiModelClient {
  readonly providerId = "disabled" as const;

  async generate(_request: AiModelRequest): Promise<AiModelResponse> {
    return {
      provider: "disabled",
      model: "disabled",
      text: "",
      safety: {
        redacted: true,
        blocked: true,
        reason: "AI model provider disabled",
      },
    };
  }
}
