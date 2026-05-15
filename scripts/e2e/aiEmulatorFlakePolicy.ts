export type AiEmulatorFailureKind =
  | "transport_flake"
  | "device_offline"
  | "assertion_failed"
  | "targetability_blocker"
  | "safety_blocker"
  | "unknown";

export type AiEmulatorFailureClassification =
  | "TRANSPORT_FLAKE_RETRIED"
  | "TRANSPORT_FLAKE_EXHAUSTED"
  | "ASSERTION_FAILED_NO_RETRY"
  | "DEVICE_OFFLINE_RETRIED"
  | "DEVICE_OFFLINE_EXHAUSTED"
  | "UNKNOWN_NO_RETRY";

export function normalizeAiEmulatorFailureMessage(input: unknown): string {
  if (input instanceof Error) {
    return `${input.name}: ${input.message}`.toLowerCase();
  }
  return String(input ?? "").toLowerCase();
}

export function classifyAiEmulatorFailure(input: unknown): AiEmulatorFailureKind {
  const message = normalizeAiEmulatorFailureMessage(input);

  if (
    /(role leakage|role_leakage|fake green|fake_green|fake pass|fake_pass|fake emulator|secrets printed|mutation_count|mutations_created)/.test(
      message,
    )
  ) {
    return "safety_blocker";
  }

  if (
    /\b(device offline|offline device|unauthorized|no devices\/emulators found|no device|device not found|adb: device|sys\.boot_completed.*0)\b/.test(
      message,
    )
  ) {
    return "device_offline";
  }

  if (
    /\b(transport|connection reset|econnreset|socket|broken pipe|timed out|timeout|grpc|could not connect|connection refused|driver closed|maestro.*driver)\b/.test(
      message,
    )
  ) {
    return "transport_flake";
  }

  if (
    /(testid|test id|stable testid|targetability|not targetable|not fully targetable|no visible element|element not found|view not found|id .*not found)/.test(
      message,
    )
  ) {
    return "targetability_blocker";
  }

  if (/\b(assertion failed|assertvisible|assert visible|expect\(.*\)|expected|received|maestro assertion)\b/.test(message)) {
    return "assertion_failed";
  }

  return "unknown";
}

export function shouldRetryAiEmulatorFailure(kind: AiEmulatorFailureKind): boolean {
  return kind === "transport_flake" || kind === "device_offline";
}

export function resolveAiEmulatorFailureClassification(
  kind: AiEmulatorFailureKind,
  exhausted: boolean,
): AiEmulatorFailureClassification {
  if (kind === "device_offline") {
    return exhausted ? "DEVICE_OFFLINE_EXHAUSTED" : "DEVICE_OFFLINE_RETRIED";
  }

  if (kind === "transport_flake") {
    return exhausted ? "TRANSPORT_FLAKE_EXHAUSTED" : "TRANSPORT_FLAKE_RETRIED";
  }

  if (kind === "assertion_failed" || kind === "targetability_blocker" || kind === "safety_blocker") {
    return "ASSERTION_FAILED_NO_RETRY";
  }

  return "UNKNOWN_NO_RETRY";
}
