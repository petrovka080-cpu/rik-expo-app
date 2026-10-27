import type { AiRunInput } from "../kernel/AiRuntimeKernelContract";
import { enforceAiContextBudget } from "./AiContextBudget";
import type { AiBuiltContext, AiContextBuilder, AiContextSource } from "./AiContextContract";
import { aiContextRedactionPassed, redactAiContextText } from "./AiContextRedaction";

function contextSources(input: AiRunInput): AiContextSource[] {
  const refs = input.contextRef ?? {};
  const sources: AiContextSource[] = [];
  if (refs.screenId) sources.push({ sourceId: "screen", kind: "screen", ref: refs.screenId, freshness: "live" });
  if (refs.requestId) sources.push({ sourceId: "request", kind: "request", ref: refs.requestId, freshness: "snapshot" });
  if (refs.estimateId) sources.push({ sourceId: "estimate", kind: "estimate", ref: refs.estimateId, freshness: "snapshot" });
  if (refs.revisionId) sources.push({ sourceId: "revision", kind: "revision", ref: refs.revisionId, freshness: "snapshot" });
  if (refs.ledgerId) sources.push({ sourceId: "ledger", kind: "ledger", ref: refs.ledgerId, freshness: "snapshot" });
  if (refs.objectId) sources.push({ sourceId: "object", kind: "object", ref: refs.objectId, freshness: "unknown" });
  if (input.userText) sources.push({ sourceId: "user_text", kind: "user_text", ref: "input.userText", freshness: "live" });
  return sources;
}

export function createAiContextBuilder(maxInputChars?: number): AiContextBuilder {
  return {
    build(input: AiRunInput): AiBuiltContext {
      const sources = contextSources(input);
      const rawUserText = [
        `surface=${input.surface}`,
        `intent=${input.intent}`,
        `mode=${input.mode}`,
        input.userText ? `userText=${input.userText}` : "",
      ].filter(Boolean).join("\n");
      const redacted = redactAiContextText(rawUserText);
      const budgeted = enforceAiContextBudget({ text: redacted.text, maxInputChars });
      return {
        flowId: input.flowId,
        messages: [
          {
            role: "system",
            content: "AI platform kernel: obey policy, use redacted context only, never execute mutations directly.",
            sourceRef: "ai_platform_policy",
          },
          {
            role: "user",
            content: budgeted.text,
            sourceRef: "user_text",
          },
        ],
        sourceMapping: sources,
        redactedFields: redacted.redactedFields,
        budget: budgeted.budget,
        redactionPassed: aiContextRedactionPassed(budgeted.text),
      };
    },
  };
}
