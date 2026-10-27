import type { AiDomain } from "../policy/aiRolePolicy";
import type {
  AiWorkdayTaskEvidenceRef,
  AiWorkdayTaskEvidenceType,
  AiWorkdayTaskSourceCard,
} from "./aiWorkdayTaskTypes";

export const AI_WORKDAY_EMPTY_STATE_REASON =
  "No eligible evidence-backed workday tasks were available in staging data.";

function evidenceTypeForCard(card: Pick<AiWorkdayTaskSourceCard, "domain" | "type">): AiWorkdayTaskEvidenceType {
  if (card.type === "approval_pending" || card.domain === "control") return "approval";
  if (card.type === "warehouse_low_stock" || card.domain === "warehouse") return "warehouse";
  if (card.type === "finance_risk" || card.domain === "finance") return "finance";
  if (card.type === "report_ready" || card.domain === "reports") return "report";
  if (card.type === "missing_document" || card.domain === "subcontracts") return "act";
  if (card.type === "supplier_price_change" || card.domain === "marketplace") return "supplier";
  if (card.domain === "procurement") return "request";
  return "task_stream";
}

function evidenceSourceForDomain(domain: AiDomain): AiWorkdayTaskEvidenceRef["source"] {
  if (domain === "procurement") return "procurement_request_context";
  if (domain === "marketplace") return "marketplace_supplier_compare";
  if (domain === "warehouse") return "warehouse_status";
  if (domain === "finance") return "finance_summary";
  if (domain === "reports") return "draft_report_readiness";
  if (domain === "subcontracts") return "draft_act_readiness";
  if (domain === "control" || domain === "documents") return "approval_inbox";
  return "command_center_task_stream";
}

export function normalizeAiWorkdayEvidenceRef(value: string): string | null {
  const ref = value.trim();
  if (!ref) return null;
  return ref;
}

export function hasAiWorkdayEvidenceRefs(refs: readonly string[]): boolean {
  return refs.some((ref) => normalizeAiWorkdayEvidenceRef(ref) !== null);
}

export function toAiWorkdayEvidenceRefs(
  card: Pick<AiWorkdayTaskSourceCard, "domain" | "type" | "evidenceRefs">,
): AiWorkdayTaskEvidenceRef[] {
  const type = evidenceTypeForCard(card);
  const source = evidenceSourceForDomain(card.domain);
  const seen = new Set<string>();
  const evidence: AiWorkdayTaskEvidenceRef[] = [];

  for (const rawRef of card.evidenceRefs) {
    const ref = normalizeAiWorkdayEvidenceRef(rawRef);
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    evidence.push({
      type,
      ref,
      source,
      redacted: true,
      rawPayloadStored: false,
      rawRowsReturned: false,
      rawPromptStored: false,
    });
  }

  return evidence;
}
