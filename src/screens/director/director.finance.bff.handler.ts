import { buildBffError } from "../../shared/scale/bffSafety";
import type { BffResponseEnvelope } from "../../shared/scale/bffContracts";
import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS,
  type DirectorFinanceBffOperation,
  type DirectorFinanceBffRequestDto,
  type DirectorFinanceBffResponseDto,
  type DirectorFinanceBffRpcName,
} from "./director.finance.bff.contract";

export type DirectorFinanceBffRpcPort = {
  runDirectorFinanceRpc(input: DirectorFinanceBffRequestDto): Promise<Record<string, unknown>>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const operationContractsByOperation = new Map<
  DirectorFinanceBffOperation,
  { rpcName: DirectorFinanceBffRpcName }
>(
  DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS.map((contract) => [
    contract.operation,
    { rpcName: contract.rpcName },
  ]),
);

export const isDirectorFinanceBffRequestDto = (
  value: unknown,
): value is DirectorFinanceBffRequestDto => {
  if (!isRecord(value) || !isRecord(value.args)) return false;
  return operationContractsByOperation.has(value.operation as DirectorFinanceBffOperation);
};

const buildDirectorFinanceBffFailure = (
  code: "DIRECTOR_FINANCE_BFF_INVALID_OPERATION" | "DIRECTOR_FINANCE_BFF_UPSTREAM_ERROR" | "DIRECTOR_FINANCE_BFF_INVALID_RESPONSE",
  message: string,
): BffResponseEnvelope<DirectorFinanceBffResponseDto> => ({
  ok: false,
  error: buildBffError(code, message),
});

export async function handleDirectorFinanceBffRpcScope(
  port: DirectorFinanceBffRpcPort,
  input: unknown,
): Promise<BffResponseEnvelope<DirectorFinanceBffResponseDto>> {
  if (!isDirectorFinanceBffRequestDto(input)) {
    return buildDirectorFinanceBffFailure(
      "DIRECTOR_FINANCE_BFF_INVALID_OPERATION",
      "Invalid director finance RPC operation",
    );
  }

  const contract = operationContractsByOperation.get(input.operation);
  if (!contract) {
    return buildDirectorFinanceBffFailure(
      "DIRECTOR_FINANCE_BFF_INVALID_OPERATION",
      "Invalid director finance RPC operation",
    );
  }

  try {
    const payload = await port.runDirectorFinanceRpc(input);
    if (!isRecord(payload)) {
      return buildDirectorFinanceBffFailure(
        "DIRECTOR_FINANCE_BFF_INVALID_RESPONSE",
        "Invalid director finance RPC response",
      );
    }

    return {
      ok: true,
      data: {
        contractId: DIRECTOR_FINANCE_BFF_CONTRACT.contractId,
        documentType: DIRECTOR_FINANCE_BFF_CONTRACT.documentType,
        operation: input.operation,
        rpcName: contract.rpcName,
        payload,
        source: DIRECTOR_FINANCE_BFF_CONTRACT.source,
      },
      serverTiming: { cacheHit: false },
    };
  } catch {
    return buildDirectorFinanceBffFailure(
      "DIRECTOR_FINANCE_BFF_UPSTREAM_ERROR",
      "Director finance RPC upstream failed",
    );
  }
}
