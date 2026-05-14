import type { GetWarehouseStatusToolOutput } from "../tools/getWarehouseStatusTool";
import type { AiWarehouseEvidenceRef, AiWarehouseRiskCard } from "./aiWarehouseCopilotTypes";

export const AI_WAREHOUSE_EVIDENCE_BUILDER_CONTRACT = Object.freeze({
  contractId: "ai_warehouse_evidence_builder_v1",
  sourceTool: "get_warehouse_status",
  evidenceRequired: true,
  redactedOnly: true,
  rawRowsReturned: false,
  rawPromptReturned: false,
  rawProviderPayloadReturned: false,
  mutationCount: 0,
  dbWrites: 0,
  externalLiveFetch: false,
  fakeWarehouseCards: false,
} as const);

function evidenceRef(
  type: AiWarehouseEvidenceRef["type"],
  ref: string,
  source: AiWarehouseEvidenceRef["source"] = "get_warehouse_status",
): AiWarehouseEvidenceRef {
  return {
    type,
    ref,
    source,
    redacted: true,
    rawRowsReturned: false,
    rawPromptReturned: false,
    rawProviderPayloadReturned: false,
  };
}

function uniqueEvidenceRefs(refs: readonly AiWarehouseEvidenceRef[]): AiWarehouseEvidenceRef[] {
  const seen = new Set<string>();
  const unique: AiWarehouseEvidenceRef[] = [];
  for (const ref of refs) {
    const key = `${ref.type}:${ref.ref}:${ref.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

export function buildAiWarehouseEvidenceRefs(
  status: GetWarehouseStatusToolOutput | null,
): AiWarehouseEvidenceRef[] {
  if (!status || status.evidence_refs.length === 0) return [];

  const refs: AiWarehouseEvidenceRef[] = status.evidence_refs.map((ref) =>
    evidenceRef("warehouse_status", `${ref}:redacted`),
  );

  if (status.low_stock_flags.some((flag) => flag !== "no_low_stock_flags")) {
    refs.push(evidenceRef("warehouse_low_stock", "warehouse:low_stock_flags:redacted"));
  }
  if (status.movement_summary.item_count > 0) {
    refs.push(evidenceRef("warehouse_movement", "warehouse:movement_summary:redacted"));
  }

  return uniqueEvidenceRefs(refs);
}

export function buildAiWarehouseDraftEvidenceRefs(
  status: GetWarehouseStatusToolOutput | null,
): AiWarehouseEvidenceRef[] {
  const refs = buildAiWarehouseEvidenceRefs(status);
  if (!status || refs.length === 0) return refs;
  return uniqueEvidenceRefs([
    ...refs,
    evidenceRef("warehouse_draft_action", "warehouse:draft_action:preview:redacted", "warehouse_copilot_policy"),
  ]);
}

export function aiWarehouseEvidenceComplete(
  value: { evidenceRefs: readonly AiWarehouseEvidenceRef[] } | null,
): boolean {
  return Boolean(
    value &&
      value.evidenceRefs.length > 0 &&
      value.evidenceRefs.every(
        (ref) =>
          ref.redacted === true &&
          ref.rawRowsReturned === false &&
          ref.rawPromptReturned === false &&
          ref.rawProviderPayloadReturned === false,
      ),
  );
}

export function aiWarehouseRiskCardsHaveEvidence(cards: readonly AiWarehouseRiskCard[]): boolean {
  return cards.every((card) => aiWarehouseEvidenceComplete(card));
}
