const RAW_INTERNAL_ID_PATTERN = /\b(?:source_sha|draft_id|revision_id|ledger_id|raw_ai_json|formula_id|template_id)\b/i;
const FAKE_FINAL_TOTAL_PATTERN = /(?:финальный итог|точная окончательная стоимость|owner approval|approved by owner)/i;
const INVENTED_BUSINESS_PATTERN = /\b(?:supplier approved|warehouse reserved|payment created|rfq bypassed)\b/i;
const PRICE_FAKE_PATTERN = /(?:цена\s+\d|итого\s+\d).*(?:без источника|missing price)/i;

export function validateAiGrounding(input: { text: string; missingPrice?: boolean; insufficientInput?: boolean }) {
  const text = input.text ?? "";
  const finalTotalExplicitlyNotCalculated = /(?:финальный\s+итог|итог)\s+не\s+рассчитан/i.test(text);
  const blockers = [
    RAW_INTERNAL_ID_PATTERN.test(text) ? "raw_internal_id_visible" : "",
    FAKE_FINAL_TOTAL_PATTERN.test(text) && !finalTotalExplicitlyNotCalculated ? "fake_final_or_owner_approval" : "",
    INVENTED_BUSINESS_PATTERN.test(text) ? "supplier_warehouse_payment_invented" : "",
    input.missingPrice && PRICE_FAKE_PATTERN.test(text) ? "missing_price_faked" : "",
    input.insufficientInput && !/уточн|не хватает|нужно/i.test(text) ? "missing_questions_absent" : "",
  ].filter(Boolean);
  return {
    ok: blockers.length === 0,
    missing_price_not_faked: !blockers.includes("missing_price_faked"),
    fake_final_total_rejected: !blockers.includes("fake_final_or_owner_approval"),
    owner_approval_not_faked: !/owner approval|approved by owner/i.test(text),
    supplier_warehouse_payment_not_invented: !blockers.includes("supplier_warehouse_payment_invented"),
    raw_internal_ids_not_visible: !blockers.includes("raw_internal_id_visible"),
    insufficient_input_shows_missing_questions: !input.insufficientInput || /уточн|не хватает|нужно/i.test(text),
    blockers,
  };
}
