import { buildBffError } from "../shared/scale/bffSafety";
import type { BffResponseEnvelope } from "../shared/scale/bffContracts";
import {
  ASSISTANT_STORE_READ_BFF_CONTRACT,
  ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS,
  type AssistantStoreReadBffOperation,
  type AssistantStoreReadBffReadResultDto,
  type AssistantStoreReadBffRequestDto,
  type AssistantStoreReadBffResponseDto,
} from "./assistant_store_read.bff.contract";

export type AssistantStoreReadBffPort = {
  runAssistantStoreRead(
    input: AssistantStoreReadBffRequestDto,
  ): Promise<AssistantStoreReadBffReadResultDto>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isOptionalPageSize = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "number";

const isOptionalBoolean = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "boolean";

const operationSet = new Set<AssistantStoreReadBffOperation>(
  ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation),
);

export const isAssistantStoreReadBffRequestDto = (
  value: unknown,
): value is AssistantStoreReadBffRequestDto => {
  if (!isRecord(value) || !operationSet.has(value.operation as AssistantStoreReadBffOperation)) {
    return false;
  }

  const args = value.args;
  switch (value.operation) {
    case "assistant.actor.context":
      return isRecord(args) && typeof args.userId === "string";
    case "assistant.market.active_listings":
      return isRecord(args) && isOptionalPageSize(args.pageSize);
    case "assistant.market.companies_by_ids":
    case "assistant.market.profiles_by_user_ids":
    case "chat.profiles_by_user_ids":
      return isRecord(args) && isStringArray(args.ids);
    case "profile.current.full_name":
    case "chat.actor.context":
    case "supplier_showcase.profile_by_user_id":
    case "supplier_showcase.company_by_owner_user_id":
      return isRecord(args) && typeof args.userId === "string";
    case "chat.listing.messages.list":
      return isRecord(args) && typeof args.listingId === "string" && isOptionalPageSize(args.pageSize);
    case "supplier_showcase.company_by_id":
      return isRecord(args) && typeof args.companyId === "string";
    case "supplier_showcase.listings_by_user_id":
      return isRecord(args) &&
        typeof args.userId === "string" &&
        isOptionalBoolean(args.includeInactive) &&
        isOptionalPageSize(args.pageSize);
    case "supplier_showcase.listings_by_company_id":
      return isRecord(args) &&
        typeof args.companyId === "string" &&
        isOptionalBoolean(args.includeInactive) &&
        isOptionalPageSize(args.pageSize);
    case "request.submitted_at.capability":
      return isRecord(args);
    case "store.request_items.list":
      return isRecord(args) &&
        typeof args.requestId === "string" &&
        (args.status === undefined || args.status === null || typeof args.status === "string");
    case "store.director_inbox.list":
      return isRecord(args);
    case "store.approved_request_items.list":
      return isRecord(args) && typeof args.requestId === "string";
  }
  return false;
};

const buildAssistantStoreReadBffFailure = (
  code:
    | "ASSISTANT_STORE_READ_BFF_INVALID_OPERATION"
    | "ASSISTANT_STORE_READ_BFF_UPSTREAM_ERROR"
    | "ASSISTANT_STORE_READ_BFF_INVALID_RESPONSE",
  message: string,
): BffResponseEnvelope<AssistantStoreReadBffResponseDto> => ({
  ok: false,
  error: buildBffError(code, message),
});

const isAssistantStoreReadBffResultDto = (
  value: unknown,
): value is AssistantStoreReadBffReadResultDto =>
  isRecord(value) &&
  (Array.isArray(value.data) || value.data === null) &&
  (value.error === null || isRecord(value.error));

export async function handleAssistantStoreReadBffScope(
  port: AssistantStoreReadBffPort,
  input: unknown,
): Promise<BffResponseEnvelope<AssistantStoreReadBffResponseDto>> {
  if (!isAssistantStoreReadBffRequestDto(input)) {
    return buildAssistantStoreReadBffFailure(
      "ASSISTANT_STORE_READ_BFF_INVALID_OPERATION",
      "Invalid assistant/store read operation",
    );
  }

  try {
    const result = await port.runAssistantStoreRead(input);
    if (!isAssistantStoreReadBffResultDto(result)) {
      return buildAssistantStoreReadBffFailure(
        "ASSISTANT_STORE_READ_BFF_INVALID_RESPONSE",
        "Invalid assistant/store read response",
      );
    }

    return {
      ok: true,
      data: {
        contractId: ASSISTANT_STORE_READ_BFF_CONTRACT.contractId,
        documentType: ASSISTANT_STORE_READ_BFF_CONTRACT.documentType,
        operation: input.operation,
        result,
        source: ASSISTANT_STORE_READ_BFF_CONTRACT.source,
      },
      serverTiming: { cacheHit: false },
    };
  } catch {
    return buildAssistantStoreReadBffFailure(
      "ASSISTANT_STORE_READ_BFF_UPSTREAM_ERROR",
      "Assistant/store read upstream failed",
    );
  }
}
