import { buildBffError } from "../../shared/scale/bffSafety";
import type { BffResponseEnvelope } from "../../shared/scale/bffContracts";
import {
  WAREHOUSE_API_BFF_CONTRACT,
  WAREHOUSE_API_BFF_OPERATION_CONTRACTS,
  type WarehouseApiBffOperation,
  type WarehouseApiBffRequestDto,
  type WarehouseApiBffResponseDto,
  type WarehouseApiBffPayloadDto,
} from "./warehouse.api.bff.contract";

export type WarehouseApiBffReadPort = {
  runWarehouseApiRead(input: WarehouseApiBffRequestDto): Promise<WarehouseApiBffPayloadDto>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const operationSet = new Set<WarehouseApiBffOperation>(
  WAREHOUSE_API_BFF_OPERATION_CONTRACTS.map((contract) => contract.operation),
);

export const isWarehouseApiBffRequestDto = (
  value: unknown,
): value is WarehouseApiBffRequestDto => {
  if (!isRecord(value) || !isRecord(value.args)) return false;
  if (!operationSet.has(value.operation as WarehouseApiBffOperation)) return false;
  if (Object.prototype.hasOwnProperty.call(value, "page")) {
    const page = value.page;
    if (!isRecord(page)) return false;
  }
  return true;
};

const buildWarehouseApiBffFailure = (
  code: "WAREHOUSE_API_BFF_INVALID_OPERATION" | "WAREHOUSE_API_BFF_UPSTREAM_ERROR" | "WAREHOUSE_API_BFF_INVALID_RESPONSE",
  message: string,
): BffResponseEnvelope<WarehouseApiBffResponseDto> => ({
  ok: false,
  error: buildBffError(code, message),
});

const isReadResult = (value: unknown): boolean =>
  isRecord(value) &&
  (Array.isArray(value.data) || value.data === null) &&
  (value.error === null || isRecord(value.error));

const isWarehouseApiBffPayloadDto = (value: unknown): value is WarehouseApiBffPayloadDto => {
  if (!isRecord(value)) return false;
  if (value.kind === "single") return isReadResult(value.result);
  if (value.kind !== "reports_bundle" || !isRecord(value.result)) return false;
  return isReadResult(value.result.stock) &&
    isReadResult(value.result.movement) &&
    isReadResult(value.result.issues);
};

export async function handleWarehouseApiBffReadScope(
  port: WarehouseApiBffReadPort,
  input: unknown,
): Promise<BffResponseEnvelope<WarehouseApiBffResponseDto>> {
  if (!isWarehouseApiBffRequestDto(input)) {
    return buildWarehouseApiBffFailure(
      "WAREHOUSE_API_BFF_INVALID_OPERATION",
      "Invalid warehouse API read operation",
    );
  }

  try {
    const payload = await port.runWarehouseApiRead(input);
    if (!isWarehouseApiBffPayloadDto(payload)) {
      return buildWarehouseApiBffFailure(
        "WAREHOUSE_API_BFF_INVALID_RESPONSE",
        "Invalid warehouse API read response",
      );
    }

    return {
      ok: true,
      data: {
        contractId: WAREHOUSE_API_BFF_CONTRACT.contractId,
        documentType: WAREHOUSE_API_BFF_CONTRACT.documentType,
        operation: input.operation,
        payload,
        source: WAREHOUSE_API_BFF_CONTRACT.source,
      },
      serverTiming: { cacheHit: false },
    };
  } catch {
    return buildWarehouseApiBffFailure(
      "WAREHOUSE_API_BFF_UPSTREAM_ERROR",
      "Warehouse API read upstream failed",
    );
  }
}
