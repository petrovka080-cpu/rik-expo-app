import type {
  AiModelProviderId,
  AiModelRequest,
  AiModelResponse,
} from "./AiModelTypes";

export interface AiModelClient {
  readonly providerId: AiModelProviderId;
  generate(request: AiModelRequest): Promise<AiModelResponse>;
}
