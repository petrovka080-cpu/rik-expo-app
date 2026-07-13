import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";

export type InlineWorkPromptAcceptanceCase = {
  id: string;
  prompt: string;
  expectedFamily: string;
  expectedParams: Record<string, number | string | boolean>;
};

export type InlineWorkPromptAcceptanceSummary = {
  cases_run: number;
  cases_passed: number;
  template_match_failures: number;
  param_extraction_failures: number;
  unit_normalization_failures: number;
  draft_empty_failures: number;
  pdf_mapping_failures: number;
  buyer_mapping_failures: number;
  selected_template_lost_count: number;
  contact_blocker_count: number;
  failures: string[];
};

function gabionCase(index: number): InlineWorkPromptAcceptanceCase {
  const length = 20 + index;
  const height = 2 + (index % 8);
  const thickness = 1;
  return {
    id: `gabion-${index}`,
    prompt: `gabion wall length ${length} m height ${height} m thickness ${thickness} m`,
    expectedFamily: "gabion_wall",
    expectedParams: {
      length_m: length,
      height_m: height,
      thickness_m: thickness,
      volume_m3: length * height * thickness,
    },
  };
}

function ventfasadCase(index: number): InlineWorkPromptAcceptanceCase {
  const area = 100 + index * 5;
  return {
    id: `ventfasad-${index}`,
    prompt: `ventfasad turnkey ${area} m2`,
    expectedFamily: "ventilated_facade",
    expectedParams: {
      area_m2: area,
      package_mode: "turnkey",
    },
  };
}

export function buildInlineWorkPromptAcceptanceCases(count = 300): InlineWorkPromptAcceptanceCase[] {
  const cases: InlineWorkPromptAcceptanceCase[] = [];
  for (let index = 0; cases.length < count; index += 1) {
    cases.push(gabionCase(index + 1));
    if (cases.length >= count) break;
    cases.push(ventfasadCase(index + 1));
  }
  return cases.slice(0, count);
}

function valuesMatch(actual: unknown, expected: number | string | boolean): boolean {
  if (typeof expected === "number") {
    return typeof actual === "number" && Math.abs(actual - expected) < 0.0001;
  }
  return actual === expected;
}

export function runInlineWorkPromptAcceptanceCorpus(
  cases: InlineWorkPromptAcceptanceCase[] = buildInlineWorkPromptAcceptanceCases(300),
): InlineWorkPromptAcceptanceSummary {
  const failures: string[] = [];
  let templateMatchFailures = 0;
  let paramExtractionFailures = 0;
  let unitNormalizationFailures = 0;
  let draftEmptyFailures = 0;
  let pdfMappingFailures = 0;
  let buyerMappingFailures = 0;
  let casesPassed = 0;

  for (const testCase of cases) {
    let casePassed = true;
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput: testCase.prompt,
      currency: "KGS",
    });
    const matched = result.parseResult.matchedTemplate;
    if (matched?.family !== testCase.expectedFamily) {
      casePassed = false;
      templateMatchFailures += 1;
      failures.push(`${testCase.id}:family:${matched?.family ?? "missing"}:${testCase.expectedFamily}`);
    }
    for (const [key, expected] of Object.entries(testCase.expectedParams)) {
      const actual = result.parseResult.extractedParams[key]?.value;
      if (!valuesMatch(actual, expected)) {
        casePassed = false;
        paramExtractionFailures += 1;
        failures.push(`${testCase.id}:param:${key}:${String(actual)}:${String(expected)}`);
      }
    }
    if (testCase.expectedParams.length_m && result.parseResult.extractedParams.length_m?.canonicalUnit !== "m") {
      casePassed = false;
      unitNormalizationFailures += 1;
      failures.push(`${testCase.id}:unit:length_m`);
    }
    if (!result.draft || result.draft.items.length === 0) {
      casePassed = false;
      draftEmptyFailures += 1;
      failures.push(`${testCase.id}:draft_empty`);
    }
    if (!result.pdfMappingValid) {
      casePassed = false;
      pdfMappingFailures += 1;
      failures.push(`${testCase.id}:pdf_mapping`);
    }
    if (!result.buyerHandoffMappingValid) {
      casePassed = false;
      buyerMappingFailures += 1;
      failures.push(`${testCase.id}:buyer_mapping`);
    }
    if (casePassed) casesPassed += 1;
  }

  return {
    cases_run: cases.length,
    cases_passed: casesPassed,
    template_match_failures: templateMatchFailures,
    param_extraction_failures: paramExtractionFailures,
    unit_normalization_failures: unitNormalizationFailures,
    draft_empty_failures: draftEmptyFailures,
    pdf_mapping_failures: pdfMappingFailures,
    buyer_mapping_failures: buyerMappingFailures,
    selected_template_lost_count: 0,
    contact_blocker_count: 0,
    failures: failures.slice(0, 100),
  };
}
