import type { BuiltInAiScreenContext } from "./builtInAiTypes";

const ROLE_CONTEXTS: readonly BuiltInAiScreenContext[] = [
  "foreman",
  "director",
  "buyer",
  "warehouse",
  "accountant",
  "contractor",
  "office",
  "marketplace",
  "profile",
];

export function resolveBuiltInAiContext(input: {
  screenContext?: string;
  route?: string;
  role?: string;
}): BuiltInAiScreenContext {
  const raw = `${input.screenContext ?? ""} ${input.route ?? ""} ${input.role ?? ""}`.toLowerCase();
  if (raw.includes("/request") || raw.includes("request")) return "request";
  if (raw.includes("market")) return "marketplace";
  for (const role of ROLE_CONTEXTS) {
    if (raw.includes(role)) return role;
  }
  if (raw.includes("/ai") || raw.includes("chat")) return "chat";
  return "unknown";
}
