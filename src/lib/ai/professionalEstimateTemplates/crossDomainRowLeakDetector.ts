import { resolveProfessionalWorkTemplate } from "./workTemplateResolver";
import type {
  ProfessionalEstimateLine,
  ProfessionalEstimateRecipeRow,
  ProfessionalGroupKey,
} from "./professionalEstimateTypes";

export type ProfessionalRowForLeakDetection =
  | ProfessionalEstimateRecipeRow
  | ProfessionalEstimateLine;

export type ProfessionalCrossDomainRowLeak = {
  status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK";
  selected_work_key: string;
  leaked_row_key: string;
  leaked_row: string;
  leaked_domain: ProfessionalGroupKey | "unknown";
  expected_domain: ProfessionalGroupKey;
  reason:
    | "ROW_DOMAIN_MISMATCH"
    | "ROW_NOT_ALLOWED_FOR_WORK"
    | "ROW_FORBIDDEN_FOR_WORK"
    | "FORBIDDEN_TERM_FOR_DOMAIN";
  matched_term?: string;
  fake_green_claimed: false;
};

const FORBIDDEN_TERMS_BY_EXPECTED_DOMAIN: Partial<Record<ProfessionalGroupKey, readonly RegExp[]>> = {
  flooring: [
    /кирпич|brick/i,
    /(^|[^а-яё])(?:кладка|кладоч|masonry)([^а-яё]|$)/i,
    /арматур|rebar/i,
    /бетон\s*b?\s*25|concrete\s*b?\s*25/i,
    /кровельн|roofing\s+membrane/i,
    /водопровод|water\s+pipe|plumbing\s+pipe/i,
    /кабель|cable/i,
  ],
  tile_stone: [/кровельн|(^|[^a-z])roofing([^a-z]|$)|стропил|rafter/i],
  roofing: [/водопровод|канализац|plumbing|ppr\s+pipe|sewer\s+pipe/i],
  electrical_power: [/бетон\s*b?\s*25|concrete\s*b?\s*25|арматур|rebar/i],
  plumbing_sewerage: [/low\s+voltage|слаботоч|cctv|домофон|internet|network\s+cable/i],
  foundation_concrete: [/ковролин|carpet|линолеум|linoleum|ламинат|laminate/i],
};

function rowAllowedForWork(row: ProfessionalRowForLeakDetection, selectedWorkKey: string): boolean {
  const allowed = "allowed_work_keys" in row ? row.allowed_work_keys : [selectedWorkKey];
  return allowed.length === 0 || allowed.includes(selectedWorkKey);
}

function rowForbiddenForWork(row: ProfessionalRowForLeakDetection, selectedWorkKey: string): boolean {
  const forbidden = "forbidden_work_keys" in row ? row.forbidden_work_keys : [];
  return forbidden.includes(selectedWorkKey);
}

function detectForbiddenTerm(input: {
  selectedWorkKey: string;
  expectedDomain: ProfessionalGroupKey;
  rowText: string;
}): string | null {
  const patterns = [
    ...(FORBIDDEN_TERMS_BY_EXPECTED_DOMAIN[input.expectedDomain] ?? []),
    ...(input.selectedWorkKey === "roof_waterproofing" ? [/ванн|санузел|кафель|bathroom|tile/i] : []),
  ];
  const match = patterns.find((pattern) => pattern.test(input.rowText));
  return match?.source ?? null;
}

export function detectCrossDomainRowLeaks(input: {
  selected_work_key: string;
  expected_domain?: ProfessionalGroupKey;
  rows: readonly ProfessionalRowForLeakDetection[];
}): ProfessionalCrossDomainRowLeak[] {
  const template = resolveProfessionalWorkTemplate(input.selected_work_key);
  const expectedDomain = input.expected_domain ?? template?.group_key;
  if (!expectedDomain) {
    throw new Error(`PROFESSIONAL_TEMPLATE_NOT_SUPPORTED:${input.selected_work_key}`);
  }

  const leaks: ProfessionalCrossDomainRowLeak[] = [];
  for (const row of input.rows) {
    if (row.row_domain !== expectedDomain) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain ?? "unknown",
        expected_domain: expectedDomain,
        reason: "ROW_DOMAIN_MISMATCH",
        fake_green_claimed: false,
      });
      continue;
    }

    if (!rowAllowedForWork(row, input.selected_work_key)) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "ROW_NOT_ALLOWED_FOR_WORK",
        fake_green_claimed: false,
      });
      continue;
    }

    if (rowForbiddenForWork(row, input.selected_work_key)) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "ROW_FORBIDDEN_FOR_WORK",
        fake_green_claimed: false,
      });
      continue;
    }

    const matchedTerm = detectForbiddenTerm({
      selectedWorkKey: input.selected_work_key,
      expectedDomain,
      rowText: row.visible_name_ru,
    });
    if (matchedTerm) {
      leaks.push({
        status: "BLOCKED_CROSS_DOMAIN_ROW_LEAK",
        selected_work_key: input.selected_work_key,
        leaked_row_key: row.row_key,
        leaked_row: row.visible_name_ru,
        leaked_domain: row.row_domain,
        expected_domain: expectedDomain,
        reason: "FORBIDDEN_TERM_FOR_DOMAIN",
        matched_term: matchedTerm,
        fake_green_claimed: false,
      });
    }
  }

  return leaks;
}
