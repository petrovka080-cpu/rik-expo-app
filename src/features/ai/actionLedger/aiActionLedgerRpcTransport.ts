import { runUntypedRpcTransport } from "../../../lib/api/_core.transport";
import type {
  AiActionLedgerRpcFunctionName,
  AiActionLedgerRpcTransportResult,
} from "./aiActionLedgerRpcTypes";

export async function runAiActionLedgerRpcTransport(
  fn: AiActionLedgerRpcFunctionName,
  args: Record<string, unknown>,
): Promise<AiActionLedgerRpcTransportResult> {
  return await runUntypedRpcTransport(fn, args);
}
