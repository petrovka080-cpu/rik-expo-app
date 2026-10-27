import { redactSensitiveText } from "../../lib/security/redaction";
import { readAiWorkflowFlags, type AiWorkflowFlags } from "./aiWorkflowFlags";

export const DIRECTOR_PROPOSAL_RISK_SUMMARY_ACTION =
  "director.proposal.risk_summary" as const;

export type DirectorProposalRiskSummaryContextItem = {
  id?: string | number | null;
  name?: string | null;
  supplier?: string | null;
  qty?: number | string | null;
  uom?: string | null;
  price?: number | string | null;
  appCode?: string | null;
};

export type DirectorProposalRiskSummaryContext = {
  proposalId: string;
  status?: string | null;
  totalSum?: number | null;
  itemCount?: number | null;
  attachmentsCount?: number | null;
  integritySummary?: string | null;
  items: DirectorProposalRiskSummaryContextItem[];
};

export type SanitizedDirectorProposalRiskSummaryContext =
  Required<Omit<DirectorProposalRiskSummaryContext, "totalSum" | "items">> & {
    totalSum: number | null;
    items: Required<DirectorProposalRiskSummaryContextItem>[];
  };

export type DirectorProposalRiskSummaryOutput = {
  summary: string;
  riskFlags: string[];
  suggestedChecks: string[];
  confidenceLabel: "low" | "medium" | "high";
  limitations: string[];
  safeDisplayText: string;
  advisoryOnly: true;
  canMutateState: false;
};

export type DirectorProposalRiskSummaryProviderRequest = {
  action: typeof DIRECTOR_PROPOSAL_RISK_SUMMARY_ACTION;
  prompt: string;
  context: SanitizedDirectorProposalRiskSummaryContext;
};

export type DirectorProposalRiskSummaryProvider = (
  request: DirectorProposalRiskSummaryProviderRequest,
) => Promise<unknown>;

export type DirectorProposalRiskSummaryResult =
  | {
      ok: true;
      value: DirectorProposalRiskSummaryOutput;
    }
  | {
      ok: false;
      error: {
        code:
          | "feature_disabled"
          | "external_ai_disabled"
          | "provider_unavailable"
          | "invalid_output"
          | "mutation_intent_blocked";
        message: string;
      };
      advisoryOnly: true;
      canMutateState: false;
    };

type DirectorProposalRiskSummaryFailureCode =
  | "feature_disabled"
  | "external_ai_disabled"
  | "provider_unavailable"
  | "invalid_output"
  | "mutation_intent_blocked";

type GenerateDirectorProposalRiskSummaryOptions = {
  context: DirectorProposalRiskSummaryContext;
  provider?: DirectorProposalRiskSummaryProvider | null;
  flags?: AiWorkflowFlags;
  allowMockProvider?: boolean;
};

const MAX_TEXT = 180;
const MAX_ITEMS = 24;
const MAX_LIST_ITEMS = 6;

const mutationIntentPattern =
  /\b(?:approve|reject|submit|pay|receive|mutate|write|delete|update)\b(?:\s+(?:this|now|proposal|payment|stock|state|record))?/i;

const safeText = (value: unknown, fallback = ""): string => {
  const text = redactSensitiveText(value).replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, MAX_TEXT);
};

const safeNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => safeText(item))
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
};

const hasMutationIntent = (output: Pick<
  DirectorProposalRiskSummaryOutput,
  "summary" | "riskFlags" | "suggestedChecks" | "safeDisplayText"
>): boolean =>
  [output.summary, output.safeDisplayText, ...output.riskFlags, ...output.suggestedChecks]
    .filter(Boolean)
    .some((entry) => mutationIntentPattern.test(entry));

export function sanitizeDirectorProposalRiskSummaryContext(
  context: DirectorProposalRiskSummaryContext,
): SanitizedDirectorProposalRiskSummaryContext {
  return {
    proposalId: safeText(context.proposalId, "unknown_proposal"),
    status: safeText(context.status, "unknown"),
    totalSum: safeNumber(context.totalSum),
    itemCount: safeNumber(context.itemCount) ?? context.items.length,
    attachmentsCount: safeNumber(context.attachmentsCount) ?? 0,
    integritySummary: safeText(context.integritySummary),
    items: context.items.slice(0, MAX_ITEMS).map((item) => ({
      id: safeText(item.id),
      name: safeText(item.name, "Unnamed item"),
      supplier: safeText(item.supplier),
      qty: safeNumber(item.qty),
      uom: safeText(item.uom),
      price: safeNumber(item.price),
      appCode: safeText(item.appCode),
    })),
  };
}

export function buildDirectorProposalRiskSummaryPrompt(
  context: SanitizedDirectorProposalRiskSummaryContext,
): string {
  const itemLines = context.items.map((item, index) =>
    [
      `${index + 1}. ${item.name}`,
      item.qty === null ? null : `qty=${item.qty}`,
      item.uom ? `uom=${item.uom}` : null,
      item.price === null ? null : `price=${item.price}`,
      item.supplier ? `supplier=${item.supplier}` : null,
      item.appCode ? `code=${item.appCode}` : null,
    ].filter(Boolean).join("; "),
  );

  return [
    "Action: director.proposal.risk_summary",
    "Produce advisory-only JSON with summary, riskFlags, suggestedChecks, confidenceLabel, limitations.",
    "Do not approve, reject, submit, pay, receive, mutate, or instruct state changes.",
    `Proposal: ${context.proposalId}`,
    `Status: ${context.status}`,
    `Total: ${context.totalSum ?? "unknown"}`,
    `Items: ${context.itemCount}`,
    `Attachments: ${context.attachmentsCount}`,
    context.integritySummary ? `Integrity: ${context.integritySummary}` : null,
    "Lines:",
    ...itemLines,
  ].filter(Boolean).join("\n");
}

export function validateDirectorProposalRiskSummaryOutput(
  value: unknown,
): DirectorProposalRiskSummaryOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI risk summary output must be an object.");
  }

  const record = value as Record<string, unknown>;
  const confidence = safeText(record.confidenceLabel).toLowerCase();
  const confidenceLabel =
    confidence === "high" || confidence === "medium" || confidence === "low"
      ? confidence
      : "low";

  const output: DirectorProposalRiskSummaryOutput = {
    summary: safeText(record.summary),
    riskFlags: safeList(record.riskFlags),
    suggestedChecks: safeList(record.suggestedChecks),
    confidenceLabel,
    limitations: safeList(record.limitations),
    safeDisplayText: safeText(record.safeDisplayText),
    advisoryOnly: true,
    canMutateState: false,
  };

  if (!output.summary) {
    throw new Error("AI risk summary output is missing summary.");
  }
  if (record.canMutateState !== false || record.advisoryOnly !== true) {
    throw new Error("AI risk summary output must be advisory-only and non-mutating.");
  }
  if (!output.safeDisplayText) {
    output.safeDisplayText = [
      output.summary,
      ...output.riskFlags.map((flag) => `Risk: ${flag}`),
      ...output.suggestedChecks.map((check) => `Check: ${check}`),
    ].join("\n");
  }
  output.safeDisplayText = safeText(output.safeDisplayText, output.summary);

  if (hasMutationIntent(output)) {
    throw new DirectorProposalRiskSummaryMutationIntentError();
  }

  return output;
}

class DirectorProposalRiskSummaryMutationIntentError extends Error {
  constructor() {
    super("AI risk summary attempted to include mutation intent.");
    this.name = "DirectorProposalRiskSummaryMutationIntentError";
  }
}

const failure = (
  code: DirectorProposalRiskSummaryFailureCode,
  message: string,
): DirectorProposalRiskSummaryResult => ({
  ok: false,
  error: { code, message },
  advisoryOnly: true,
  canMutateState: false,
});

export async function generateDirectorProposalRiskSummary(
  options: GenerateDirectorProposalRiskSummaryOptions,
): Promise<DirectorProposalRiskSummaryResult> {
  const flags = options.flags ?? readAiWorkflowFlags();
  if (!flags.directorProposalRiskSummaryEnabled) {
    return failure("feature_disabled", "Director proposal risk summary is disabled.");
  }
  if (!options.provider) {
    return failure("provider_unavailable", "Director proposal risk summary provider is unavailable.");
  }
  if (!flags.externalAiCallsEnabled && !options.allowMockProvider) {
    return failure("external_ai_disabled", "External AI calls are disabled.");
  }

  const context = sanitizeDirectorProposalRiskSummaryContext(options.context);
  const prompt = buildDirectorProposalRiskSummaryPrompt(context);

  try {
    const raw = await options.provider({
      action: DIRECTOR_PROPOSAL_RISK_SUMMARY_ACTION,
      prompt,
      context,
    });
    return {
      ok: true,
      value: validateDirectorProposalRiskSummaryOutput(raw),
    };
  } catch (error) {
    const code =
      error instanceof DirectorProposalRiskSummaryMutationIntentError
        ? "mutation_intent_blocked"
        : "invalid_output";
    return failure(code, "AI risk summary output was rejected by safety validation.");
  }
}
