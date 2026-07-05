import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  type ExpandedComplexBoqRow,
  type ExpandedComplexCalculatorOutput,
} from "../../src/lib/ai/expandedComplexWorks";
import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";

export type Wave2CExpandedCase = {
  case_id: string;
  prompt: string;
  family_id: string;
  category: string;
};

export const WAVE2C_EXPANDED_CASE_SET = "wave2c-expanded-critical" as const;

export const WAVE2C_EXPANDED_CRITICAL_CASES: readonly Wave2CExpandedCase[] = [
  {
    case_id: "w2c-water-001",
    category: "water_supply",
    family_id: "village_water_supply",
    prompt: "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
  },
  {
    case_id: "w2c-water-002",
    category: "water_supply",
    family_id: "village_water_supply",
    prompt: "наружные сети воды 2 км труба 160 колодцы каждые 50 м",
  },
  {
    case_id: "w2c-water-003",
    category: "water_supply",
    family_id: "village_water_supply",
    prompt: "водонапорная башня для села резервуар 50 м3 скважина и насосы",
  },
  {
    case_id: "w2c-water-004",
    category: "water_supply",
    family_id: "pumping_station",
    prompt: "насосная станция водоснабжения 120 м3 час резервирование автоматика",
  },
  {
    case_id: "w2c-sewer-001",
    category: "sewer_wastewater",
    family_id: "village_sewer_network",
    prompt: "наружная канализация 2 км труба 160 колодцы каждые 50 м",
  },
  {
    case_id: "w2c-sewer-002",
    category: "sewer_wastewater",
    family_id: "stormwater_drainage",
    prompt: "ливневая канализация 1 км лотки колодцы пескоуловители",
  },
  {
    case_id: "w2c-sewer-003",
    category: "sewer_wastewater",
    family_id: "wastewater_treatment_plant",
    prompt: "очистные сооружения сточных вод 500 м3 сутки аэротенки и насосы",
  },
  {
    case_id: "w2c-road-001",
    category: "transport",
    family_id: "road_construction",
    prompt: "строительство дороги 1 км ширина 6 м асфальт 2 слоя основание щебень 20 см",
  },
  {
    case_id: "w2c-road-002",
    category: "transport",
    family_id: "road_construction",
    prompt: "асфальтирование дороги 500 м ширина 5 м щебень 15 см песок 10 см",
  },
  {
    case_id: "w2c-road-003",
    category: "transport",
    family_id: "road_construction",
    prompt: "дорога 2 км ширина 7 м бордюры ливневка разметка",
  },
  {
    case_id: "w2c-road-004",
    category: "transport",
    family_id: "cement_concrete_pavement",
    prompt: "бетонная дорога 800 м ширина 6 м цементобетонное покрытие 220 мм",
  },
  {
    case_id: "w2c-road-005",
    category: "transport",
    family_id: "culverts",
    prompt: "водопропускная труба под дорогой 36 м сечение 2 м бетонные оголовки",
  },
  {
    case_id: "w2c-hydro-001",
    category: "hydraulic",
    family_id: "earth_dam",
    prompt: "строительство дамбы 200 м высота 5 м геотекстиль габионы дренаж",
  },
  {
    case_id: "w2c-hydro-002",
    category: "hydraulic",
    family_id: "earth_dam",
    prompt: "насыпная дамба 150 м высота 4 м щебень геотекстиль",
  },
  {
    case_id: "w2c-hydro-003",
    category: "hydraulic",
    family_id: "earth_dam",
    prompt: "берегоукрепление габионами 80 м высота 3 м",
  },
  {
    case_id: "w2c-hydro-004",
    category: "hydraulic",
    family_id: "irrigation_channel",
    prompt: "канал орошения 1200 м ширина 3 м бетонное крепление откосов",
  },
  {
    case_id: "w2c-power-001",
    category: "electrical",
    family_id: "overhead_power_line_10kv",
    prompt: "ЛЭП 10 кВ 3 км опоры через 50 м провод СИП",
  },
  {
    case_id: "w2c-power-002",
    category: "electrical",
    family_id: "overhead_power_line_10kv",
    prompt: "электрические столбы 1 км 10 кВ опоры через 40 м наружное освещение",
  },
  {
    case_id: "w2c-power-003",
    category: "electrical",
    family_id: "underground_cable_line",
    prompt: "кабельная линия 0.4 кВ 800 м траншея кабель 4х50",
  },
  {
    case_id: "w2c-power-004",
    category: "electrical",
    family_id: "transformer_substation",
    prompt: "трансформаторная подстанция 10 кВ с КТП кабельными вводами",
  },
  {
    case_id: "w2c-utility-001",
    category: "utility_connections",
    family_id: "multi_utility_trench",
    prompt: "подведение инженерных сетей 100 м вода канализация электричество",
  },
  {
    case_id: "w2c-utility-002",
    category: "gas_heat",
    family_id: "gas_pipeline_low_pressure",
    prompt: "газопровод низкого давления 600 м труба 110 шкафной регулятор",
  },
  {
    case_id: "w2c-utility-003",
    category: "gas_heat",
    family_id: "heat_network",
    prompt: "теплосеть 450 м предизолированная труба 159 камеры компенсаторы",
  },
  {
    case_id: "w2c-glazing-001",
    category: "facade_glazing",
    family_id: "high_rise_glazing",
    prompt: "остекление высотного фасада 5000 м2 высота 60 м алюминий стеклопакет",
  },
  {
    case_id: "w2c-glazing-002",
    category: "facade_glazing",
    family_id: "high_rise_glazing",
    prompt: "фасадное остекление 1200 м2 алюминиевый профиль стеклопакеты",
  },
  {
    case_id: "w2c-glazing-003",
    category: "facade_glazing",
    family_id: "high_rise_glazing",
    prompt: "витражное остекление 300 м2 с герметизацией",
  },
  {
    case_id: "w2c-roof-001",
    category: "roofs_mansard",
    family_id: "mansard_roof_with_windows",
    prompt: "мансардная крыша 120 м2 6 окон утепление 200 мм металлочерепица",
  },
  {
    case_id: "w2c-roof-002",
    category: "roofs_mansard",
    family_id: "mansard_roof_with_windows",
    prompt: "устройство мансарды 180 м2 8 окон утепление 150 мм профлист",
  },
  {
    case_id: "w2c-bridge-001",
    category: "bridges_tunnels",
    family_id: "bridge_construction",
    prompt: "мост 30 м ширина 8 м железобетон",
  },
  {
    case_id: "w2c-bridge-002",
    category: "bridges_tunnels",
    family_id: "tunnel_construction",
    prompt: "тоннель 50 м с бетонной обделкой вентиляция освещение",
  },
  {
    case_id: "w2c-bridge-003",
    category: "bridges_tunnels",
    family_id: "retaining_wall",
    prompt: "подпорная стена 60 м высота 4 м бетон дренаж",
  },
  {
    case_id: "w2c-industrial-001",
    category: "industrial",
    family_id: "industrial_shed",
    prompt: "промышленный корпус 5000 м2 металлокаркас",
  },
  {
    case_id: "w2c-industrial-002",
    category: "industrial",
    family_id: "warehouse_building",
    prompt: "склад 1000 м2 стеллажная зона ворота полы",
  },
  {
    case_id: "w2c-industrial-003",
    category: "industrial",
    family_id: "equipment_foundation",
    prompt: "фундамент под оборудование 12 т бетон армирование анкера",
  },
  {
    case_id: "w2c-industrial-004",
    category: "industrial",
    family_id: "pipe_rack",
    prompt: "кабельная эстакада 120 м металлоконструкции опоры лотки",
  },
  {
    case_id: "w2c-industrial-005",
    category: "industrial",
    family_id: "technological_pipeline",
    prompt: "технологический трубопровод DN200 300 м опоры сварка испытания",
  },
  {
    case_id: "w2c-energy-001",
    category: "energy",
    family_id: "thermal_power_plant",
    prompt: "ТЭЦ 100 МВт турбинный зал котлы фундамент генератора",
  },
  {
    case_id: "w2c-energy-002",
    category: "energy",
    family_id: "hydro_power_plant",
    prompt: "ГЭС 5 МВт деривационный водовод машинный зал",
  },
  {
    case_id: "w2c-energy-003",
    category: "energy",
    family_id: "boiler_house",
    prompt: "газовая котельная 1 МВт предварительная смета",
  },
  {
    case_id: "w2c-energy-004",
    category: "energy",
    family_id: "solar_power_plant",
    prompt: "солнечная электростанция 100 кВт панели инверторы крепления",
  },
];

export type Wave2CExpandedCaseDomainProof = {
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
  price_state: ExpandedComplexCalculatorOutput["price_state"] | null;
  first_work_title: string | null;
  first_material_title: string | null;
  first_service_or_equipment_title: string | null;
  blocking_reasons: string[];
};

function allRows(estimate: ExpandedComplexCalculatorOutput): ExpandedComplexBoqRow[] {
  return [
    ...estimate.material_rows,
    ...estimate.work_rows,
    ...estimate.equipment_rows,
    ...estimate.service_rows,
  ];
}

function countSections(rows: readonly ExpandedComplexBoqRow[]): number {
  return new Set(rows.map((row) => row.group)).size;
}

function currentRevision(bundle: ReturnType<typeof approveConsumerRepairRequestDraft>) {
  return bundle.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

function unitValidationBlockers(estimate: ExpandedComplexCalculatorOutput, rows: readonly ExpandedComplexBoqRow[]): string[] {
  return rows.flatMap((row) => validateProfessionalBoqUnit({
    unit: row.unit,
    rowCode: row.code,
    rowLabel: row.titleRu,
    rowKind: row.lineType,
    workFamily: estimate.work_family_id,
    normId: row.normId,
    normPackId: row.normFamilyId,
    normSourceId: row.normSourceId,
  }).blocking_reasons.map((reason) => `${row.code}:${reason}`));
}

export function runWave2CExpandedCaseDomainProof(testCase: Wave2CExpandedCase): Wave2CExpandedCaseDomainProof {
  __resetConsumerRepairRequestStoreForTests();
  const estimate = calculateExpandedComplexEstimate({
    prompt: testCase.prompt,
    familyId: testCase.family_id,
  });
  const unforcedEstimate = calculateExpandedComplexEstimate({ prompt: testCase.prompt });
  const aiDraft = buildConsumerRepairAiDraft(testCase.prompt, { city: "Bishkek", currency: "KGS" });
  const rows = estimate ? allRows(estimate) : [];
  const snapshot = estimate ? buildExpandedComplexSnapshot(estimate) : null;
  const pdf = snapshot ? buildExpandedComplexPdfModel(snapshot) : null;
  const buyer = snapshot ? buildExpandedComplexBuyerHandoff(snapshot) : null;
  const buyerRows = buyer
    ? [...buyer.procurement_materials, ...buyer.equipment_to_purchase, ...buyer.delivery_procurement_services]
    : [];
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: `wave2c-expanded-${testCase.case_id}`,
    problemText: testCase.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "wave2c-redacted-address",
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
  const snapshotRows = revision?.editable_estimate_snapshot?.rows.filter((row) => !row.removed) ?? [];
  const requestPdf = approved.pdfs[0] ?? null;
  const pdfStorage = requestPdf
    ? getConsumerRepairPdfStorageObject({
      storageBucket: requestPdf.storageBucket,
      storageKey: requestPdf.storageKey,
    })
    : null;
  const procurementHandoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const viewModel = buildRequestEstimateViewModel(approved);
  const viewModelSummary = viewModel?.summary ?? "";
  const viewModelTotalLabel = viewModel?.totalLabel ?? "";
  const buyerWorkRowsCount = procurementHandoff.items.filter((item) => String(item.itemType) === "work").length;
  const unitBlockers = estimate ? unitValidationBlockers(estimate, rows) : ["estimate_missing"];
  const fakeFinalTotal =
    estimate?.price_state.finalTotalAllowed !== false ||
    approved.items.some((item) => item.unitPrice != null || item.totalPrice != null) ||
    /\d[\d\s.,]*(?:KGS|сом|\$|€)/i.test(viewModelTotalLabel);
  const noRawDump = !/PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(
    `${viewModelSummary}\n${pdfStorage?.body ?? ""}`,
  );
  const domainBlockers = [
    estimate ? "" : "estimate_missing",
    estimate?.work_family_id === testCase.family_id ? "" : `forced_family_mismatch:${estimate?.work_family_id ?? "missing"}`,
    unforcedEstimate?.work_family_id === testCase.family_id ? "" : `prompt_family_mismatch:${unforcedEstimate?.work_family_id ?? "missing"}`,
    aiDraft.selectedWork?.selectedWorkKey === testCase.family_id ? "" : `request_ai_family_mismatch:${aiDraft.selectedWork?.selectedWorkKey ?? "missing"}`,
    rows.length > 0 ? "" : "empty_estimate",
    estimate && estimate.work_rows.length > 0 ? "" : "work_rows_missing",
    estimate && estimate.material_rows.length > 0 ? "" : "material_rows_missing",
    estimate && (estimate.service_rows.length > 0 || estimate.equipment_rows.length > 0) ? "" : "service_or_equipment_rows_missing",
    unitBlockers.length === 0 ? "" : `unit_blockers:${unitBlockers.slice(0, 5).join(",")}`,
    estimate && rows.every((row) => row.normId && row.normFamilyId && row.normSourceId && row.normSourceTitle && row.normVersion) ? "" : "norm_source_missing",
    estimate && estimate.calculation_trace.length >= rows.length && estimate.calculation_trace.every((trace) =>
      trace.includes("formula=") && trace.includes("result=") && trace.includes("normSource=")
    ) ? "" : "formula_trace_missing",
    pdf?.rows_equal_snapshot === true ? "" : "expanded_pdf_mapping_invalid",
    buyer && buyer.forbidden_rows_present === false && buyerRows.length > 0 && buyerRows.every((row) => row.lineType !== "work") ? "" : "expanded_buyer_handoff_invalid",
    aiDraft.items.length > 0 ? "" : "request_ai_draft_empty",
    !aiDraft.dangerousDiyBlocked ? "" : "refusal_or_dangerous_diy_block",
    !/drawings_required_stop|чертежи обязательны для расчета/i.test(aiDraft.summaryRu) ? "" : "drawings_required_stop",
    approved.editableEstimateSnapshot && revision ? "" : "request_snapshot_missing",
    requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id ? "" : "request_pdf_not_bound_to_snapshot",
    requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash ? "" : "request_pdf_rows_hash_mismatch",
    pdfStorage ? "" : "request_pdf_storage_missing",
    procurementHandoff.items.length > 0 ? "" : "request_buyer_handoff_missing",
    buyerWorkRowsCount === 0 ? "" : `buyer_work_rows:${buyerWorkRowsCount}`,
    !fakeFinalTotal ? "" : "fake_final_total",
    noRawDump ? "" : "raw_dump_visible",
  ].filter(Boolean);

  return {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family_id: testCase.family_id,
    matched_family_id: estimate?.work_family_id ?? null,
    unforced_family_id: unforcedEstimate?.work_family_id ?? null,
    calculator_id: estimate?.calculatorId ?? null,
    row_count: rows.length,
    work_rows_count: estimate?.work_rows.length ?? 0,
    material_rows_count: estimate?.material_rows.length ?? 0,
    service_rows_count: estimate?.service_rows.length ?? 0,
    equipment_rows_count: estimate?.equipment_rows.length ?? 0,
    grouped_sections_count: countSections(rows),
    units_valid: unitBlockers.length === 0,
    assumptions_visible_contract: Boolean(estimate && estimate.assumptions.length > 0),
    risk_notes_visible_contract: Boolean(estimate && (estimate.limitations.length > 0 || estimate.missing_design_inputs.length > 0)),
    no_refusal: !aiDraft.dangerousDiyBlocked && aiDraft.items.length > 0,
    no_drawings_required_stop: !/drawings_required_stop|чертежи обязательны для расчета/i.test(aiDraft.summaryRu),
    no_raw_dump: noRawDump,
    snapshot_created: Boolean(approved.editableEstimateSnapshot && revision),
    snapshot_id: revision?.snapshot_id ?? approved.editableEstimateSnapshot?.snapshotId ?? null,
    snapshot_row_count: snapshotRows.length,
    pdf_generated_from_snapshot: Boolean(requestPdf?.revisionId && requestPdf.revisionId === revision?.revision_id),
    pdf_rows_equal_snapshot_rows: Boolean(requestPdf?.revisionRowsHash && requestPdf.revisionRowsHash === revision?.rows_hash),
    pdf_storage_object_exists: Boolean(pdfStorage),
    pdf_text_sample: (pdfStorage?.body ?? "").slice(0, 1000),
    buyer_handoff_created: procurementHandoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: procurementHandoff.items.length > 0 && buyerWorkRowsCount === 0,
    buyer_work_rows_count: buyerWorkRowsCount,
    fake_final_total: fakeFinalTotal,
    price_state: estimate?.price_state ?? null,
    first_work_title: estimate?.work_rows[0]?.titleRu ?? null,
    first_material_title: estimate?.material_rows[0]?.titleRu ?? null,
    first_service_or_equipment_title: estimate?.service_rows[0]?.titleRu ?? estimate?.equipment_rows[0]?.titleRu ?? null,
    blocking_reasons: domainBlockers,
  };
}

export type Wave2CSampleOutputManifest = {
  output_dir: string;
  sample_count: number;
  sample_paths: string[];
};

function sectionsFromRows(rows: readonly ExpandedComplexBoqRow[]) {
  const sections = new Map<string, ExpandedComplexBoqRow[]>();
  for (const row of rows) {
    sections.set(row.group, [...(sections.get(row.group) ?? []), row]);
  }
  return [...sections.entries()].map(([section, sectionRows]) => ({
    section,
    rows: sectionRows.map((row) => ({
      code: row.code,
      titleRu: row.titleRu,
      lineType: row.lineType,
      quantity: row.quantity,
      unit: row.unit,
      formula: row.quantityFormula,
      normSourceId: row.normSourceId,
      normSourceTitle: row.normSourceTitle,
    })),
  }));
}

export function writeWave2CSampleOutputs(outputDir: string, sampleCount = 30): Wave2CSampleOutputManifest {
  mkdirSync(outputDir, { recursive: true });
  const samplePaths: string[] = [];
  for (const testCase of WAVE2C_EXPANDED_CRITICAL_CASES.slice(0, sampleCount)) {
    __resetConsumerRepairRequestStoreForTests();
    const estimate = calculateExpandedComplexEstimate({
      prompt: testCase.prompt,
      familyId: testCase.family_id,
    });
    if (!estimate) continue;
    const aiDraft = buildConsumerRepairAiDraft(testCase.prompt, { city: "Bishkek", currency: "KGS" });
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: `wave2c-sample-${testCase.case_id}`,
      problemText: testCase.prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "wave2c-redacted-address",
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
    const requestPdf = approved.pdfs[0] ?? null;
    const pdfStorage = requestPdf
      ? getConsumerRepairPdfStorageObject({
        storageBucket: requestPdf.storageBucket,
        storageKey: requestPdf.storageKey,
      })
      : null;
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const rows = allRows(estimate);
    const pdfPath = path.join(outputDir, `${testCase.case_id}.pdf.txt`);
    const buyerHandoffPath = path.join(outputDir, `${testCase.case_id}.buyer-handoff.json`);
    const samplePath = path.join(outputDir, `${testCase.case_id}.sample.json`);
    writeFileSync(pdfPath, pdfStorage?.body ?? "", "utf8");
    writeFileSync(buyerHandoffPath, `${JSON.stringify(handoff, null, 2)}\n`, "utf8");
    writeFileSync(samplePath, `${JSON.stringify({
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      matched_template: `${estimate.work_family_id}_${estimate.estimate_level.toLowerCase()}_expanded_complex_v1`,
      family: estimate.work_family_id,
      recognized_params: estimate.input_parameters,
      assumptions: estimate.assumptions,
      risk_notes: [...estimate.limitations, ...estimate.missing_design_inputs],
      sections: sectionsFromRows(rows),
      rows: rows.map((row) => ({
        code: row.code,
        titleRu: row.titleRu,
        lineType: row.lineType,
        quantity: row.quantity,
        unit: row.unit,
        quantityFormula: row.quantityFormula,
        normId: row.normId,
        normFamilyId: row.normFamilyId,
        normSourceId: row.normSourceId,
        normSourceTitle: row.normSourceTitle,
        normVersion: row.normVersion,
      })),
      units: [...new Set(rows.map((row) => row.unit))],
      source_trace: estimate.calculation_trace,
      snapshot_id: revision?.snapshot_id ?? approved.editableEstimateSnapshot?.snapshotId ?? null,
      pdf_path: path.relative(process.cwd(), pdfPath).replace(/\\/g, "/"),
      buyer_handoff_path: path.relative(process.cwd(), buyerHandoffPath).replace(/\\/g, "/"),
      price_state: estimate.price_state,
      fake_final_total: false,
    }, null, 2)}\n`, "utf8");
    samplePaths.push(path.relative(process.cwd(), samplePath).replace(/\\/g, "/"));
  }
  return {
    output_dir: path.relative(process.cwd(), outputDir).replace(/\\/g, "/"),
    sample_count: samplePaths.length,
    sample_paths: samplePaths,
  };
}
