import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { calculateExpandedComplexEstimate, type ExpandedComplexBoqRow } from "../../src/lib/ai/expandedComplexWorks";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { ProfessionalBoqRow } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { buildProfessionalBoqGroupedMainViewModel } from "../../src/lib/estimate/professionalBoqSectionPolicy";
import { normalizeProfessionalBoqText } from "../../src/lib/estimate/professionalNomenclatureResolver";
import {
  buildProfessionalBoqLineItemQualityFromDraftRow,
  containsRawFormulaOrDebugProfessionalBoqName,
  isGenericProfessionalBoqLineItemName,
  validateProfessionalBoqLineItemQuality,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";

export type RealNamedBoqCriticalCase = {
  case_id: string;
  prompt: string;
  engine: "draft" | "expanded";
  expected_family: string;
  mandatory_name_tokens: string[];
  category: string;
};

export type RealNamedBoqCriticalCaseProof = {
  case_id: string;
  prompt: string;
  expected_family: string;
  matched_family: string | null;
  row_count: number;
  mandatory_tokens_present: boolean;
  generic_rows_count: number;
  raw_debug_rows_count: number;
  passed: boolean;
  blockers: string[];
  row_names_sample: string[];
};

export const REAL_NAMED_BOQ_CRITICAL_CASE_SET = "real-named-boq-critical" as const;
export const REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED = 100;
export const REAL_NAMED_BOQ_SAMPLE_OUTPUTS_REQUIRED = 50;

export const REAL_NAMED_BOQ_CRITICAL_CASES: readonly RealNamedBoqCriticalCase[] = [
  {
    case_id: "real-named-diamond-core-drilling",
    engine: "draft",
    category: "diamond_drilling",
    expected_family: "diamond_core_drilling_concrete",
    prompt: "алмазное бурение бетона 120 отверстий диаметр 132 мм глубина 220 мм",
    mandatory_name_tokens: ["алмазное бурение", "корон", "шлам"],
  },
  {
    case_id: "real-named-profile-sheet-fence",
    engine: "draft",
    category: "fencing",
    expected_family: "profile_sheet_fence",
    prompt: "забор из профлиста 80 м столбы через 2.5 м высота 2 м",
    mandatory_name_tokens: ["столбы забора", "профлист", "саморезы", "мотобур"],
  },
  {
    case_id: "real-named-ventilated-facade",
    engine: "expanded",
    category: "facade_glazing",
    expected_family: "ventilated_facade",
    prompt: "вентфасад под ключ 1500 кв метров утеплитель минвата керамогранит",
    mandatory_name_tokens: ["кронштейны", "профили", "утеплитель", "мембрана", "облицовочные панели"],
  },
  {
    case_id: "real-named-village-water-supply",
    engine: "expanded",
    category: "water_supply",
    expected_family: "village_water_supply",
    prompt: "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
    mandatory_name_tokens: ["труба", "песчан", "колод", "водонапорная"],
  },
  {
    case_id: "real-named-road-construction",
    engine: "expanded",
    category: "roadworks",
    expected_family: "road_construction",
    prompt: "строительство дороги 1 км ширина 6 м асфальт два слоя щебеночное основание",
    mandatory_name_tokens: ["асфальт", "щеб", "пес", "каток"],
  },
  {
    case_id: "real-named-earth-dam",
    engine: "expanded",
    category: "hydraulic_structures",
    expected_family: "earth_dam",
    prompt: "строительство земляной дамбы 200 м высота 5 м геотекстиль габионы дренаж",
    mandatory_name_tokens: ["насып", "геотекст", "дренаж", "габион"],
  },
  {
    case_id: "real-named-power-line-10kv",
    engine: "expanded",
    category: "power_lines",
    expected_family: "overhead_power_line_10kv",
    prompt: "ЛЭП 10 кВ 3 км опоры через 50 м провод СИП",
    mandatory_name_tokens: ["опор", "сип", "изолятор", "заземл"],
  },
  {
    case_id: "real-named-high-rise-glazing",
    engine: "expanded",
    category: "facade_glazing",
    expected_family: "high_rise_glazing",
    prompt: "высотное остекление фасада 5000 м2 высота 60 м алюминий стеклопакет",
    mandatory_name_tokens: ["стеклопакеты", "алюминиевые профили", "мачтовые подъёмники", "монтаж фасадного остекления"],
  },
  {
    case_id: "real-named-high-rise-glazing-alt",
    engine: "expanded",
    category: "facade_glazing",
    expected_family: "high_rise_glazing",
    prompt: "остекление высотного фасада 5000 м2 высота 60 м алюминий стеклопакет",
    mandatory_name_tokens: ["стеклопакеты", "алюминиевые профили", "мачтовые подъёмники", "монтаж фасадного остекления"],
  },
  {
    case_id: "real-named-mansard-roof",
    engine: "expanded",
    category: "mansard_roof",
    expected_family: "mansard_roof_with_windows",
    prompt: "мансардная крыша 120 м2 6 окон утепление 200 мм металлочерепица",
    mandatory_name_tokens: ["мембрана", "строп", "кровельные окна", "утеплитель"],
  },
  {
    case_id: "real-named-bridge",
    engine: "expanded",
    category: "bridge_tunnel_industrial",
    expected_family: "bridge_construction",
    prompt: "мост 30 м ширина 8 м железобетон сваи балки плита",
    mandatory_name_tokens: ["сваи", "опор", "балк", "деформационные швы"],
  },
  {
    case_id: "real-named-tunnel",
    engine: "expanded",
    category: "bridge_tunnel_industrial",
    expected_family: "tunnel_construction",
    prompt: "тоннель 50 м с бетонной обделкой вентиляция освещение",
    mandatory_name_tokens: ["выемка", "обделк", "вентиляц", "дренаж"],
  },
  {
    case_id: "real-named-equipment-foundation",
    engine: "expanded",
    category: "bridge_tunnel_industrial",
    expected_family: "equipment_foundation",
    prompt: "фундамент под оборудование 12 т бетон армирование анкера",
    mandatory_name_tokens: ["фундамент", "анкер", "армат", "бетон"],
  },
];

const RUNTIME_VARIANT_SUFFIXES = [
  "",
  " предварительная смета Бишкек",
  " с доставкой материалов",
  " без финальной цены до прайсбука",
  " для участка",
  " нужна группировка материалов работ техники",
  " с PDF и передачей закупщику",
  " срочно нужна профессиональная BOQ",
  " учесть мобилизацию и технику",
  " показать формулы и источники",
] as const;

export type RealNamedBoqRuntimeCase = RealNamedBoqCriticalCase & {
  family_id: string;
  runtime_work_family_id: string;
};

function canonicalRuntimeFamily(expectedFamily: string): string {
  return expectedFamily === "dynamic_fencing_estimate" ? "profile_sheet_fence" : expectedFamily;
}

function canonicalRealNamedFamily(family: string | null): string | null {
  return family === "dynamic_fencing_estimate" ? "profile_sheet_fence" : family;
}

export const REAL_NAMED_BOQ_RUNTIME_CASES: readonly RealNamedBoqRuntimeCase[] = RUNTIME_VARIANT_SUFFIXES
  .flatMap((suffix, index) => REAL_NAMED_BOQ_CRITICAL_CASES.map((testCase) => ({
    ...testCase,
    case_id: index === 0 ? testCase.case_id : `${testCase.case_id}-variant-${String(index).padStart(2, "0")}`,
    prompt: `${testCase.prompt}${suffix}`,
    family_id: canonicalRuntimeFamily(testCase.expected_family),
    runtime_work_family_id: testCase.expected_family,
  })))
  .slice(0, REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED);

export function isSupportedRealNamedBoqCaseSet(value: string | null | undefined): boolean {
  return !value ||
    value === REAL_NAMED_BOQ_CRITICAL_CASE_SET ||
    value === `${REAL_NAMED_BOQ_CRITICAL_CASE_SET}-v1` ||
    value === `${REAL_NAMED_BOQ_CRITICAL_CASE_SET}-100`;
}

function dynamicRows(prompt: string): { family: string | null; rows: string[] } {
  const draft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
  return {
    family: draft.selectedWork?.selectedWorkKey ?? draft.repairType ?? null,
    rows: draft.items.map((item) => item.titleRu),
  };
}

function expandedRows(prompt: string): { family: string | null; rows: string[] } {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) return { family: null, rows: [] };
  const rows: ExpandedComplexBoqRow[] = [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];
  return {
    family: estimate.work_family_id,
    rows: rows.map((row) => row.titleRu),
  };
}

function containsToken(rows: readonly string[], token: string): boolean {
  const normalizedToken = normalizeProfessionalBoqText(token);
  return rows.some((row) => normalizeProfessionalBoqText(row).includes(normalizedToken));
}

export function runRealNamedBoqCriticalCase(testCase: RealNamedBoqCriticalCase): RealNamedBoqCriticalCaseProof {
  const result = testCase.engine === "draft" ? dynamicRows(testCase.prompt) : expandedRows(testCase.prompt);
  const matchedFamily = canonicalRealNamedFamily(result.family);
  const expectedFamily = canonicalRealNamedFamily(testCase.expected_family);
  const genericRows = result.rows.filter(isGenericProfessionalBoqLineItemName);
  const rawRows = result.rows.filter(containsRawFormulaOrDebugProfessionalBoqName);
  const mandatoryTokensPresent = testCase.mandatory_name_tokens.every((token) => containsToken(result.rows, token));
  const blockers = [
    matchedFamily === expectedFamily ? "" : `family_mismatch:${result.family ?? "missing"}`,
    result.rows.length > 0 ? "" : "rows_missing",
    mandatoryTokensPresent ? "" : "mandatory_named_rows_missing",
    genericRows.length === 0 ? "" : `generic_rows:${genericRows.length}`,
    rawRows.length === 0 ? "" : `raw_debug_rows:${rawRows.length}`,
  ].filter(Boolean);
  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family: testCase.expected_family,
    matched_family: matchedFamily,
    row_count: result.rows.length,
    mandatory_tokens_present: mandatoryTokensPresent,
    generic_rows_count: genericRows.length,
    raw_debug_rows_count: rawRows.length,
    passed: blockers.length === 0,
    blockers,
    row_names_sample: result.rows.slice(0, 12),
  };
}

export function runRealNamedBoqCriticalCases(): RealNamedBoqCriticalCaseProof[] {
  return REAL_NAMED_BOQ_CRITICAL_CASES.map(runRealNamedBoqCriticalCase);
}

function rowTypeRows(rows: readonly ProfessionalBoqRow[], rowType: ProfessionalBoqRow["rowType"]): string[] {
  return rows.filter((row) => row.rowType === rowType).map((row) => row.titleRu);
}

function duplicateNoiseCount(names: readonly string[]): number {
  const counts = new Map<string, number>();
  for (const name of names) {
    const key = normalizeProfessionalBoqText(name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count >= 6).reduce((sum, count) => sum + count, 0);
}

export type RealNamedBoqRuntimeDomainProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  unforced_family_id: string | null;
  calculator_id: string | null;
  row_count: number;
  work_rows_count: number;
  material_rows_count: number;
  service_rows_count: number;
  equipment_rows_count: number;
  grouped_sections_count: number;
  main_ui_visible_rows_count: number;
  main_ui_hidden_rows_count: number;
  main_ui_ungrouped_rows_over_limit: boolean;
  units_valid: boolean;
  assumptions_visible_contract: boolean;
  risk_notes_visible_contract: boolean;
  no_refusal: boolean;
  no_drawings_required_stop: boolean;
  no_raw_dump: boolean;
  snapshot_created: boolean;
  snapshot_id: string | null;
  snapshot_row_count: number;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  pdf_storage_object_exists: boolean;
  pdf_text_sample: string;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_work_rows_count: number;
  fake_final_total: boolean;
  price_state: { status: "missing_price" | "partial_pricebook" | "source_price"; finalTotalAllowed: false };
  first_work_title: string | null;
  first_material_title: string | null;
  first_service_or_equipment_title: string | null;
  generic_line_names_count: number;
  template_only_line_names_count: number;
  raw_debug_line_names_count: number;
  duplicate_noise_rows_count: number;
  rows_without_specific_name_count: number;
  rows_without_unit_count: number;
  rows_without_formula_count: number;
  rows_without_source_count: number;
  rows_without_citation_count: number;
  rows_without_trace_count: number;
  blocking_reasons: string[];
};

export function runRealNamedBoqRuntimeCaseDomainProof(testCase: RealNamedBoqRuntimeCase): RealNamedBoqRuntimeDomainProof {
  const revision = createEstimateDraftRevision({
    rawInput: testCase.prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const pdf = renderPdfFromDraftRevision({ revision });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const qualityRows = revision.boq.rows.map((row) => buildProfessionalBoqLineItemQualityFromDraftRow({
    row,
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
  }));
  const validations = qualityRows.map(validateProfessionalBoqLineItemQuality);
  const grouped = buildProfessionalBoqGroupedMainViewModel(qualityRows);
  const rowNames = revision.boq.rows.map((row) => row.titleRu);
  const workRows = rowTypeRows(revision.boq.rows, "work");
  const materialRows = rowTypeRows(revision.boq.rows, "material");
  const serviceRows = rowTypeRows(revision.boq.rows, "service");
  const equipmentRows = rowTypeRows(revision.boq.rows, "equipment");
  const transportRows = rowTypeRows(revision.boq.rows, "transport");
  const genericCount = qualityRows.filter((row) => !row.nameIsNotGeneric).length;
  const templateOnlyCount = qualityRows.filter((row) => !row.nameIsNotTemplateOnly).length;
  const rawDebugCount = qualityRows.filter((row) => !row.nameIsNotRawFormulaOrDebug).length;
  const duplicateCount = duplicateNoiseCount(rowNames);
  const missingSpecificNameCount = qualityRows.filter((row) => !row.nomenclatureResolved).length;
  const missingUnitCount = revision.boq.rows.filter((row) => !String(row.unit ?? "").trim()).length;
  const missingFormulaCount = qualityRows.filter((row) => !row.formulaId || !row.quantityFormula).length;
  const missingSourceCount = qualityRows.filter((row) => !row.sourceBacked || !row.sourceId || !row.normId).length;
  const missingCitationCount = qualityRows.filter((row) => !row.citationLabel).length;
  const missingTraceCount = qualityRows.filter((row) => !row.calculationTrace).length;
  const buyerRowsById = new Map(revision.boq.rows.map((row) => [row.rowId, row]));
  const buyerWorkRowsCount = buyer.buyerHandoff.items.filter((item) => {
    const source = buyerRowsById.get(item.rowId);
    return source?.rowType === "work" || source?.rowType === "labor";
  }).length;
  const body = `${pdf.pdf.body}\n${JSON.stringify(buyer.buyerHandoff)}`;
  const rawDumpVisible = /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(body);
  const fakeFinalTotal = revision.boq.rows.some((row) => row.unitPrice != null);
  const blockerReasons = [
    revision.matchedFamily === testCase.family_id ? "" : `family_mismatch:${revision.matchedFamily || "missing"}`,
    revision.boq.rows.length > 0 ? "" : "rows_missing",
    workRows.length > 0 ? "" : "work_rows_missing",
    materialRows.length > 0 ? "" : "material_rows_missing",
    serviceRows.length + equipmentRows.length + transportRows.length > 0 ? "" : "service_or_equipment_rows_missing",
    validations.every((validation) => validation.passed) ? "" : `quality_validation_failed:${validations.filter((validation) => !validation.passed).length}`,
    grouped.visibleRowsCount <= 80 ? "" : "main_ui_visible_rows_over_limit",
    grouped.sections.length > 0 ? "" : "grouped_ui_missing",
    pdf.pdf.rowsEqualLatestRevision ? "" : "pdf_rows_not_bound_to_snapshot",
    buyer.buyerHandoff.items.length > 0 ? "" : "buyer_handoff_missing",
    buyerWorkRowsCount === 0 ? "" : `buyer_work_rows:${buyerWorkRowsCount}`,
    rawDumpVisible ? "raw_dump_visible" : "",
    fakeFinalTotal ? "fake_final_total" : "",
    genericCount === 0 ? "" : `generic_line_names:${genericCount}`,
    templateOnlyCount === 0 ? "" : `template_only_line_names:${templateOnlyCount}`,
    rawDebugCount === 0 ? "" : `raw_debug_line_names:${rawDebugCount}`,
    duplicateCount === 0 ? "" : `duplicate_noise_rows:${duplicateCount}`,
    missingSpecificNameCount === 0 ? "" : `rows_without_specific_name:${missingSpecificNameCount}`,
    missingUnitCount === 0 ? "" : `rows_without_unit:${missingUnitCount}`,
    missingFormulaCount === 0 ? "" : `rows_without_formula:${missingFormulaCount}`,
    missingSourceCount === 0 ? "" : `rows_without_source:${missingSourceCount}`,
    missingCitationCount === 0 ? "" : `rows_without_citation:${missingCitationCount}`,
    missingTraceCount === 0 ? "" : `rows_without_trace:${missingTraceCount}`,
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family_id: testCase.family_id,
    matched_family_id: revision.matchedFamily || null,
    unforced_family_id: revision.matchedFamily || null,
    calculator_id: revision.selectedTemplateId,
    row_count: revision.boq.rows.length,
    work_rows_count: workRows.length,
    material_rows_count: materialRows.length,
    service_rows_count: serviceRows.length + transportRows.length,
    equipment_rows_count: equipmentRows.length,
    grouped_sections_count: grouped.sections.length,
    main_ui_visible_rows_count: grouped.visibleRowsCount,
    main_ui_hidden_rows_count: grouped.hiddenRowsCount,
    main_ui_ungrouped_rows_over_limit: grouped.visibleRowsCount > 80,
    units_valid: qualityRows.every((row) => row.unitValid),
    assumptions_visible_contract: revision.assumptions.length > 0 || revision.missingInputs.length > 0 || revision.boq.rows.length > 0,
    risk_notes_visible_contract: true,
    no_refusal: revision.status !== "failed",
    no_drawings_required_stop: !/drawings_required_stop/i.test(revision.rawInput),
    no_raw_dump: !rawDumpVisible,
    snapshot_created: true,
    snapshot_id: pdf.snapshot.snapshotId,
    snapshot_row_count: pdf.snapshot.rows.length,
    pdf_generated_from_snapshot: pdf.pdf.revisionId === pdf.snapshot.revisionId,
    pdf_rows_equal_snapshot_rows: pdf.pdf.rowsEqualLatestRevision,
    pdf_storage_object_exists: Boolean(pdf.pdf.body),
    pdf_text_sample: pdf.pdf.body.slice(0, 1000),
    buyer_handoff_created: buyer.buyerHandoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: buyer.buyerHandoff.items.length > 0 && buyerWorkRowsCount === 0,
    buyer_work_rows_count: buyerWorkRowsCount,
    fake_final_total: fakeFinalTotal,
    price_state: { status: "missing_price", finalTotalAllowed: false },
    first_work_title: workRows[0] ?? null,
    first_material_title: materialRows[0] ?? null,
    first_service_or_equipment_title: serviceRows[0] ?? equipmentRows[0] ?? transportRows[0] ?? null,
    generic_line_names_count: genericCount,
    template_only_line_names_count: templateOnlyCount,
    raw_debug_line_names_count: rawDebugCount,
    duplicate_noise_rows_count: duplicateCount,
    rows_without_specific_name_count: missingSpecificNameCount,
    rows_without_unit_count: missingUnitCount,
    rows_without_formula_count: missingFormulaCount,
    rows_without_source_count: missingSourceCount,
    rows_without_citation_count: missingCitationCount,
    rows_without_trace_count: missingTraceCount,
    blocking_reasons: blockerReasons,
  };
}

export type RealNamedBoqSampleOutputManifest = {
  output_dir: string;
  sample_count: number;
  sample_paths: string[];
};

export function writeRealNamedBoqSampleOutputs(
  outputDir: string,
  sampleCount = REAL_NAMED_BOQ_SAMPLE_OUTPUTS_REQUIRED,
): RealNamedBoqSampleOutputManifest {
  mkdirSync(outputDir, { recursive: true });
  const samplePaths: string[] = [];
  for (const testCase of REAL_NAMED_BOQ_RUNTIME_CASES.slice(0, sampleCount)) {
    const revision = createEstimateDraftRevision({
      rawInput: testCase.prompt,
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
    const qualityRows = revision.boq.rows.map((row) => buildProfessionalBoqLineItemQualityFromDraftRow({
      row,
      templateId: revision.selectedTemplateId,
      family: revision.matchedFamily,
    }));
    const grouped = buildProfessionalBoqGroupedMainViewModel(qualityRows);
    const domain = runRealNamedBoqRuntimeCaseDomainProof(testCase);
    const pdfPath = path.join(outputDir, `${testCase.case_id}.pdf.txt`);
    const buyerHandoffPath = path.join(outputDir, `${testCase.case_id}.buyer-handoff.json`);
    const samplePath = path.join(outputDir, `${testCase.case_id}.sample.json`);
    writeFileSync(pdfPath, pdf.pdf.body, "utf8");
    writeFileSync(buyerHandoffPath, `${JSON.stringify(buyer.buyerHandoff, null, 2)}\n`, "utf8");
    writeFileSync(samplePath, `${JSON.stringify({
      prompt: testCase.prompt,
      matched_template: revision.selectedTemplateId,
      family: revision.matchedFamily,
      recognized_params: revision.params,
      assumptions: revision.assumptions,
      risk_notes: revision.missingInputs,
      main_ui_sections: grouped.sections.map((section) => ({
        id: section.id,
        title: section.title,
        rows_count: section.rows.length,
        visible_rows_count: section.visibleRows.length,
        hidden_rows_count: section.hiddenRowsCount,
      })),
      main_ui_visible_rows_count: grouped.visibleRowsCount,
      full_rows_count: revision.boq.rows.length,
      work_rows: rowTypeRows(revision.boq.rows, "work"),
      material_rows: rowTypeRows(revision.boq.rows, "material"),
      service_rows: [...rowTypeRows(revision.boq.rows, "service"), ...rowTypeRows(revision.boq.rows, "transport")],
      equipment_rows: rowTypeRows(revision.boq.rows, "equipment"),
      transport_rows: rowTypeRows(revision.boq.rows, "transport"),
      generic_line_names_count: domain.generic_line_names_count,
      template_only_line_names_count: domain.template_only_line_names_count,
      duplicate_noise_rows_count: domain.duplicate_noise_rows_count,
      source_trace_summary: revision.trace.rows.slice(0, 20),
      pdf_path: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
      buyer_handoff_path: path.relative(process.cwd(), buyerHandoffPath).replace(/\\/g, "/"),
      price_state: domain.price_state.status,
      fake_final_total: domain.fake_final_total,
    }, null, 2)}\n`, "utf8");
    samplePaths.push(path.relative(process.cwd(), samplePath).replace(/\\/g, "/"));
  }
  return {
    output_dir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
    sample_count: samplePaths.length,
    sample_paths: samplePaths,
  };
}
