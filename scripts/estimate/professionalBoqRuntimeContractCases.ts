import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import { validateProfessionalBoqRuntimeContract } from "../../src/lib/estimate/professionalBoqRuntimeValidator";

export const PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET = "professional-boq-runtime-contract-18" as const;

export type ProfessionalBoqRuntimeContractCase = {
  case_id: string;
  category: string;
  prompt: string;
  high_risk: boolean;
};

export const PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES: readonly ProfessionalBoqRuntimeContractCase[] = [
  {
    case_id: "runtime-diamond-001",
    category: "concrete",
    prompt: "алмазное бурение отверстий в бетоне 20 шт диаметр 110 мм глубина 200 мм",
    high_risk: true,
  },
  {
    case_id: "runtime-fence-001",
    category: "fencing",
    prompt: "забор из профлиста 80 м высота 2 м",
    high_risk: true,
  },
  {
    case_id: "runtime-water-001",
    category: "water_supply",
    prompt: "водоснабжение села 5 км труба ПНД 110",
    high_risk: true,
  },
  {
    case_id: "runtime-road-001",
    category: "roadworks",
    prompt: "Полное строительство дорожной одежды, длина 1 км, ширина 6 м",
    high_risk: true,
  },
  {
    case_id: "runtime-dam-001",
    category: "hydraulic",
    prompt: "строительство дамбы 200 м высота 5 м",
    high_risk: true,
  },
  {
    case_id: "runtime-power-001",
    category: "electrical",
    prompt: "ЛЭП 10 кВ 3 км опоры через 50 м",
    high_risk: true,
  },
  {
    case_id: "runtime-glazing-001",
    category: "facade",
    prompt: "высотное остекление фасада 5000 м2 высота 60 м",
    high_risk: true,
  },
  {
    case_id: "runtime-roof-001",
    category: "roofing",
    prompt: "мансардная крыша 120 м2 6 окон утепление 200 мм",
    high_risk: true,
  },
  {
    case_id: "runtime-bridge-001",
    category: "bridge",
    prompt: "мост 30 м ширина 8 м",
    high_risk: true,
  },
  {
    case_id: "runtime-tunnel-001",
    category: "tunnel",
    prompt: "тоннель 50 м бетонная обделка",
    high_risk: true,
  },
  {
    case_id: "runtime-boiler-001",
    category: "gas_heat",
    prompt: "газовая котельная 1 МВт",
    high_risk: true,
  },
  {
    case_id: "runtime-demolition-001",
    category: "demolition",
    prompt: "демонтаж несущей стены 12 м2",
    high_risk: true,
  },
  {
    case_id: "runtime-sewer-001",
    category: "sewer",
    prompt: "наружная канализация 2 км труба 160 колодцы каждые 50 м",
    high_risk: true,
  },
  {
    case_id: "runtime-cable-001",
    category: "electrical",
    prompt: "кабельная линия 0.4 кВ 800 м траншея кабель 4x50",
    high_risk: true,
  },
  {
    case_id: "runtime-paint-001",
    category: "painting",
    prompt: "покраска стен 200 м2 2 слоя грунтовка",
    high_risk: false,
  },
  {
    case_id: "runtime-tile-001",
    category: "tile",
    prompt: "укладка плитки 60 м2 клей затирка плинтус",
    high_risk: false,
  },
  {
    case_id: "runtime-plaster-001",
    category: "plastering",
    prompt: "штукатурка стен 120 м2 слой 20 мм",
    high_risk: false,
  },
  {
    case_id: "runtime-foundation-001",
    category: "industrial",
    prompt: "фундамент под оборудование 12 т бетон армирование анкера",
    high_risk: true,
  },
];

const RAW_PUBLIC_TEXT_RE =
  /\b(?:PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json|expandedComplexCalculator|rowCode|round_to|normFactor|PARTIAL_PRICE_MISSING|price date|confidence\s+\d|region\s+[A-Z]{2})\b/i;

const DRAWINGS_REQUIRED_STOP_RE =
  /(?:черт[её]ж[и]?\s+обязательн.{0,40}(?:расчет|расчёт|смет)|drawings_required_stop)/i;

const SPECIALIST_NOTE_RE =
  /(?:специалист|подрядчик|допуск|обследован|инженер|проект)/i;

function currentRevision(bundle: ReturnType<typeof approveConsumerRepairRequestDraft>) {
  return bundle.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

function publicText(input: {
  aiDraft: ReturnType<typeof buildConsumerRepairAiDraft>;
  viewModel: ReturnType<typeof buildRequestEstimateViewModel>;
  pdfBody: string;
}): string {
  return [
    input.aiDraft.titleRu,
    input.aiDraft.summaryRu,
    input.aiDraft.safetyMessageRu,
    ...input.aiDraft.missingData,
    input.viewModel?.title,
    input.viewModel?.summary,
    ...(input.viewModel?.assumptionRows.flatMap((row) => [row.label, row.value]) ?? []),
    input.pdfBody,
  ].filter(Boolean).join("\n");
}

function itemCounts(items: ReturnType<typeof buildConsumerRepairAiDraft>["items"]) {
  return {
    work_rows_count: items.filter((item) => item.itemType === "work").length,
    material_rows_count: items.filter((item) => item.itemType === "material").length,
    service_rows_count: items.filter((item) => item.itemType === "service").length,
    other_rows_count: items.filter((item) => item.itemType !== "work" && item.itemType !== "material" && item.itemType !== "service").length,
  };
}

export type ProfessionalBoqRuntimeContractCaseProof = {
  case_id: string;
  category: string;
  prompt: string;
  repair_type: string;
  selected_work_key: string | null;
  row_count: number;
  work_rows_count: number;
  material_rows_count: number;
  service_rows_count: number;
  other_rows_count: number;
  first_work_title: string | null;
  first_material_title: string | null;
  first_service_title: string | null;
  grouped_sections_count: number;
  assumption_rows_count: number;
  missing_inputs_count: number;
  risk_level: string | null;
  risk_notes_visible: boolean;
  assumptions_visible: boolean;
  professional_defaults_applied: boolean;
  specialist_review_note_visible: boolean;
  dangerous_work_not_refused: boolean;
  drawings_not_required_for_preliminary_boq: boolean;
  missing_inputs_visible: boolean;
  final_contract_status_blocked_until_review: boolean;
  all_rows_have_row_type: boolean;
  all_rows_have_canonical_unit: boolean;
  all_rows_have_norm_source: boolean;
  all_rows_have_calculation_trace: boolean;
  all_rows_have_runtime_contract_marker: boolean;
  no_raw_dump: boolean;
  no_fake_final_total_without_source: boolean;
  snapshot_created: boolean;
  snapshot_row_count: number;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_bound_to_snapshot: boolean;
  pdf_storage_object_exists: boolean;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_work_rows_count: number;
  passed: boolean;
  blocking_reasons: string[];
};

export function runProfessionalBoqRuntimeContractCase(
  testCase: ProfessionalBoqRuntimeContractCase,
): ProfessionalBoqRuntimeContractCaseProof {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(testCase.prompt, { city: "Bishkek", currency: "KGS" });
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: `professional-boq-runtime-${testCase.case_id}`,
    problemText: testCase.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "runtime-contract-redacted-address",
    preferredTimeText: "today",
    contactPhone: "0700000000",
    aiDraft,
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: draft.draft.id,
    userId: draft.draft.consumerUserId,
    generatedAt: "2026-07-05T00:00:00.000Z",
  });
  const revision = currentRevision(approved);
  const snapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
  const requestPdf = approved.pdfs[0] ?? null;
  const pdfStorage = requestPdf
    ? getConsumerRepairPdfStorageObject({
      storageBucket: requestPdf.storageBucket,
      storageKey: requestPdf.storageKey,
    })
    : null;
  const viewModel = buildRequestEstimateViewModel(approved);
  const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const buyerWorkRowsCount = handoff.items.filter((item) => String(item.itemType) === "work").length;
  const text = publicText({ aiDraft, viewModel, pdfBody: pdfStorage?.body ?? "" });
  const validation = validateProfessionalBoqRuntimeContract({
    prompt: testCase.prompt,
    draft: aiDraft,
    viewModel,
    approvedBundle: approved,
    pdfBody: pdfStorage?.body ?? "",
    buyerHandoff: handoff,
  });
  const counts = itemCounts(aiDraft.items);
  const firstContractItem = aiDraft.items.find((item) => item.sourceParameters?.professionalBoqRuntimeContract);
  const riskLevel = typeof firstContractItem?.sourceParameters?.professionalBoqRiskLevel === "string"
    ? firstContractItem.sourceParameters.professionalBoqRiskLevel
    : null;
  const professionalDefaultsApplied = firstContractItem?.sourceParameters?.professionalBoqDefaultsApplied === true;
  const drawingsNotRequiredByContract =
    firstContractItem?.sourceParameters?.professionalBoqDrawingsNotRequiredForPreliminaryBoq === true &&
    firstContractItem?.sourceParameters?.professionalBoqDrawingsRequiredForDraft === false;
  const finalContractBlockedUntilReview =
    firstContractItem?.sourceParameters?.professionalBoqFinalContractStatusBlockedUntilReview === true;
  const riskNotesVisible = Boolean(
    aiDraft.safetyMessageRu ||
    viewModel?.assumptionRows.some((row) => /риск|допуск/i.test(`${row.label} ${row.value}`)) ||
    /риск|допуск|обследован|специалист|подрядчик/i.test(text),
  );
  const assumptionsVisible = Boolean(
    viewModel?.assumptionRows.some((row) => /допущен|цены|чертеж/i.test(`${row.label} ${row.value}`)),
  );
  const missingInputsVisible = Boolean(
    aiDraft.missingData.length > 0 &&
    viewModel?.assumptionRows.some((row) => /недостающ|вводн/i.test(`${row.label} ${row.value}`)),
  );
  const specialistReviewNoteVisible = !testCase.high_risk || SPECIALIST_NOTE_RE.test(text);
  const allRowsHaveNormSource = aiDraft.items.every((item) => item.normId && item.normFamilyId && item.normSourceId && item.normVersion);
  const allRowsHaveTrace = aiDraft.items.every((item) => item.formulaId && item.quantityFormula && item.calculationTrace);
  const allRowsHaveMarker = aiDraft.items.every((item) => item.sourceParameters?.professionalBoqRuntimeContract === "professional_boq_runtime_contract_v1");
  const pricedRowsWithoutAcceptedSource = aiDraft.items.filter((item) =>
    item.unitPrice != null &&
    !item.priceTrace &&
    item.priceStatus !== "CATALOG_PRICE_VERIFIED" &&
    item.priceStatus !== "PRICEBOOK_VERIFIED" &&
    item.priceStatus !== "REFERENCE_PRICE_ESTIMATE" &&
    item.priceStatus !== "USER_PRICE_OVERRIDE" &&
    item.priceStatus !== "USER_ENTERED_PRICE"
  ).length;
  const blockers = [
    ...validation.failures,
    aiDraft.items.length > 0 ? "" : "empty_estimate",
    !aiDraft.dangerousDiyBlocked ? "" : "dangerous_work_refused",
    riskNotesVisible ? "" : "risk_notes_missing",
    assumptionsVisible ? "" : "assumptions_missing",
    professionalDefaultsApplied ? "" : "professional_defaults_missing",
    specialistReviewNoteVisible ? "" : "specialist_review_note_missing",
    drawingsNotRequiredByContract ? "" : "drawings_not_required_contract_marker_missing",
    DRAWINGS_REQUIRED_STOP_RE.test(text) ? "drawings_required_stop_visible" : "",
    missingInputsVisible ? "" : "missing_inputs_missing",
    finalContractBlockedUntilReview ? "" : "final_contract_status_not_blocked_until_review",
    RAW_PUBLIC_TEXT_RE.test(text) ? "raw_dump_visible" : "",
    aiDraft.items.every((item) => item.itemType) ? "" : "row_type_missing",
    aiDraft.items.every((item) => item.unit) ? "" : "unit_missing",
    allRowsHaveNormSource ? "" : "norm_source_missing",
    allRowsHaveTrace ? "" : "calculation_trace_missing",
    allRowsHaveMarker ? "" : "runtime_contract_marker_missing",
    pricedRowsWithoutAcceptedSource === 0 ? "" : `priced_rows_without_source:${pricedRowsWithoutAcceptedSource}`,
    approved.editableEstimateSnapshot && revision ? "" : "snapshot_missing",
    requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id ? "" : "pdf_not_bound_to_revision",
    requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash ? "" : "pdf_rows_hash_mismatch",
    pdfStorage ? "" : "pdf_storage_missing",
    handoff.items.length > 0 ? "" : "buyer_handoff_missing",
    buyerWorkRowsCount === 0 ? "" : `buyer_handoff_contains_work_rows:${buyerWorkRowsCount}`,
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    category: testCase.category,
    prompt: testCase.prompt,
    repair_type: aiDraft.repairType,
    selected_work_key: aiDraft.selectedWork?.selectedWorkKey ?? null,
    row_count: aiDraft.items.length,
    ...counts,
    first_work_title: aiDraft.items.find((item) => item.itemType === "work")?.titleRu ?? null,
    first_material_title: aiDraft.items.find((item) => item.itemType === "material")?.titleRu ?? null,
    first_service_title: aiDraft.items.find((item) => item.itemType === "service")?.titleRu ?? null,
    grouped_sections_count: viewModel?.previewSections.length ?? 0,
    assumption_rows_count: viewModel?.assumptionRows.length ?? 0,
    missing_inputs_count: aiDraft.missingData.length,
    risk_level: riskLevel,
    risk_notes_visible: riskNotesVisible,
    assumptions_visible: assumptionsVisible,
    professional_defaults_applied: professionalDefaultsApplied,
    specialist_review_note_visible: specialistReviewNoteVisible,
    dangerous_work_not_refused: !aiDraft.dangerousDiyBlocked && aiDraft.items.length > 0,
    drawings_not_required_for_preliminary_boq: drawingsNotRequiredByContract && !DRAWINGS_REQUIRED_STOP_RE.test(text),
    missing_inputs_visible: missingInputsVisible,
    final_contract_status_blocked_until_review: finalContractBlockedUntilReview,
    all_rows_have_row_type: aiDraft.items.every((item) => Boolean(item.itemType)),
    all_rows_have_canonical_unit: !validation.failures.some((failure) => failure.startsWith("canonical_unit_blockers")),
    all_rows_have_norm_source: allRowsHaveNormSource,
    all_rows_have_calculation_trace: allRowsHaveTrace,
    all_rows_have_runtime_contract_marker: allRowsHaveMarker,
    no_raw_dump: !RAW_PUBLIC_TEXT_RE.test(text),
    no_fake_final_total_without_source: pricedRowsWithoutAcceptedSource === 0,
    snapshot_created: Boolean(approved.editableEstimateSnapshot && revision),
    snapshot_row_count: snapshotRows.length,
    pdf_generated_from_snapshot: Boolean(requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id),
    pdf_rows_bound_to_snapshot: Boolean(requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash),
    pdf_storage_object_exists: Boolean(pdfStorage),
    buyer_handoff_created: handoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: handoff.items.length > 0 && buyerWorkRowsCount === 0,
    buyer_work_rows_count: buyerWorkRowsCount,
    passed: blockers.length === 0,
    blocking_reasons: blockers,
  };
}

export function runProfessionalBoqRuntimeContractCases(): ProfessionalBoqRuntimeContractCaseProof[] {
  return PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.map(runProfessionalBoqRuntimeContractCase);
}

if (require.main === module) {
  const results = runProfessionalBoqRuntimeContractCases();
  const failed = results.filter((result) => !result.passed);
  console.log(JSON.stringify({
    case_set: PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASE_SET,
    passed: `${results.length - failed.length}/${results.length}`,
    failed: failed.map((result) => ({
      case_id: result.case_id,
      blocking_reasons: result.blocking_reasons,
    })),
  }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}
