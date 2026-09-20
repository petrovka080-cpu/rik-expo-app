import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  applyCanonicalConsumerRepairAuditParamBatchPatch as applyConsumerRepairDraftRevisionParamBatchPatch,
  approveCanonicalConsumerRepairAuditRequest as approveConsumerRepairRequestDraft,
  createCanonicalConsumerRepairAuditDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";

describe("professional BOQ PDF and buyer handoff", () => {
  it("keeps the full drywall ceiling preparation technology through edit, approval, PDF, procurement, and history", () => {
    __resetConsumerRepairRequestStoreForTests();
    const prompt = "подготовка потолка из гипсокартона в техническом помещении 100 кв метров";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const created = createCanonicalConsumerRepairAuditDraft({
      consumerUserId: "drywall-ceiling-preparation-handoff",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });

    expect(created.estimateDraftRevisionState?.revisions).toHaveLength(1);
    expect(created.items).toHaveLength(24);
    expect(created.items.map((item) => item.titleRu).join("\n")).not.toMatch(
      /Ремонтный состав для локальных дефектов|Совместимая грунтовка основания|Оборудование доступа к рабочей зоне по проектному ППР/iu,
    );
    const initialState = created.estimateDraftRevisionState;
    const initialRevision = initialState?.revisions.find(
      (revision) => revision.revisionId === initialState.currentRevisionId,
    );
    if (!initialRevision) throw new Error("drywall_ceiling_initial_revision_missing");
    const patchMissingInput = (paramKey: string, rawValue: string) => ({
      operation: initialRevision.params[paramKey] ? "update_param" as const : "add_param" as const,
      paramKey,
      rawValue,
    });

    const completed = applyConsumerRepairDraftRevisionParamBatchPatch({
      requestDraftId: created.draft.id,
      userId: created.draft.consumerUserId,
      createdAt: "2026-09-07T15:05:00.000Z",
      patches: [
        patchMissingInput("protected_area_m2", "100"),
        patchMissingInput("protection_perimeter_m", "60"),
        patchMissingInput("waste_bag_count", "20"),
        patchMissingInput("working_height_m", "3.2"),
        patchMissingInput("height_worker_count", "2"),
        patchMissingInput("primer_product_reference", "Паспорт совместимой грунтовки подтверждён специалистом"),
        patchMissingInput("primer_kg_per_m2", "0.12"),
        patchMissingInput("primer_layer_count", "1"),
        patchMissingInput("repair_area_share_percent", "10"),
        patchMissingInput("repair_compound_kg_per_repair_m2", "1.2"),
        patchMissingInput("repair_joint_length_m", "25"),
        patchMissingInput("abrasive_productivity_m2_per_item", "5"),
        patchMissingInput("elevated_work_requirement_state", "REQUIRED"),
        patchMissingInput("access_system_type", "MOBILE_TOWER"),
        patchMissingInput("access_equipment_shift_count", "4"),
        patchMissingInput("dust_extractor_shift_count", "4"),
        patchMissingInput("access_environment", "INDOOR_LEVEL_FLOOR"),
        patchMissingInput("access_platform_height_m", "3.2"),
        patchMissingInput("access_horizontal_reach_m", "1"),
        patchMissingInput("access_route_clear_width_m", "1.2"),
        patchMissingInput("access_base_load_capacity_kg_m2", "500"),
        patchMissingInput("access_platform_load_kg", "200"),
        patchMissingInput("access_restrictions", "NONE"),
        patchMissingInput("access_supply_mode", "RENT"),
        patchMissingInput("fall_protection_requirement_state", "REQUIRED"),
        patchMissingInput("fall_protection_system_reference", "Подтверждённая система защиты по ППР"),
        patchMissingInput("fall_protection_set_count", "2"),
        patchMissingInput("work_lighting_shift_count", "4"),
        patchMissingInput("material_delivery_trip_count", "1"),
        patchMissingInput("access_transport_pricing_mode", "SEPARATE_TRIPS"),
        patchMissingInput("access_delivery_trip_count", "1"),
        patchMissingInput("access_return_trip_count", "1"),
        patchMissingInput("waste_removal_trip_count", "1"),
      ],
    });
    const completedState = completed.estimateDraftRevisionState;
    const completedRevision = completedState?.revisions.find(
      (revision) => revision.revisionId === completedState.currentRevisionId,
    );
    if (!completedRevision) throw new Error("drywall_ceiling_completed_revision_missing");
    const completedRows = new Map(completedRevision.boq.rows.map((row) => [row.rowId, row]));

    expect(completedState?.revisions).toHaveLength(2);
    expect(completedRevision.status).toBe("draft_ready");
    expect(completedRevision.missingInputs).toEqual([]);
    expect(completedRevision.boq.rows).toHaveLength(24);
    expect(completedRows.get("drywall_prepare_joint_compound")).toMatchObject({ quantity: 12, includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_joint_tape")).toMatchObject({ quantity: 25, includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_abrasive")).toMatchObject({ quantity: 2, includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_access_equipment")).toMatchObject({ quantity: 4, rowType: "equipment", includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_access_operations")).toMatchObject({ quantity: 4, rowType: "work", includedInProcurement: false });
    expect(completedRows.get("drywall_prepare_access_delivery")).toMatchObject({ quantity: 1, rowType: "transport", includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_access_return")).toMatchObject({ quantity: 1, rowType: "transport", includedInProcurement: true });
    expect(completedRows.get("drywall_prepare_fall_protection")).toMatchObject({ quantity: 2, rowType: "equipment", includedInProcurement: true });

    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: completed.draft.id,
      userId: completed.draft.consumerUserId,
      generatedAt: "2026-09-07T15:06:00.000Z",
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-09-07T15:06:00.000Z",
    });
    if (!pdf) throw new Error("drywall_ceiling_pdf_missing");
    const pdfRows = pdf.sections.flatMap((section) => section.rows);
    const pdfTitles = pdfRows.map((row) => row.name).join("\n");
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const handoffIds = new Set(handoff.items.map((item) => item.sourceEstimateRowId));

    expect(approved.draft.status).toBe("consumer_approved");
    expect(approved.estimateDraftRevisionState?.revisions).toHaveLength(2);
    expect(pdfRows).toHaveLength(24);
    expect(pdfTitles).toMatch(/Осмотр потолка из ГКЛ.*повреждённых швов/iu);
    expect(pdfTitles).toMatch(/Промышленный строительный пылесос класса пыли M/iu);
    expect(pdfTitles).toMatch(/Передвижная вышка-тура подтверждённой конфигурации/iu);
    expect(pdfTitles).toMatch(/Подготовка, проверка, перестановка.*Передвижная вышка-тура/iu);
    expect(pdfTitles).toMatch(/Подтверждённая система защиты от падения/iu);
    expect(pdfTitles).toMatch(/Доставка на объект.*Передвижная вышка-тура/iu);
    expect(pdfTitles).toMatch(/Возврат поставщику.*Передвижная вышка-тура/iu);
    expect([
      "drywall_prepare_protection_cover",
      "drywall_prepare_primer",
      "drywall_prepare_joint_compound",
      "drywall_prepare_dust_extractor",
      "drywall_prepare_access_equipment",
      "drywall_prepare_fall_protection",
      "drywall_prepare_access_delivery",
      "drywall_prepare_access_return",
      "drywall_prepare_material_delivery",
      "drywall_prepare_waste_removal",
    ].every((rowId) => handoffIds.has(rowId))).toBe(true);
    expect(handoffIds.has("drywall_prepare_access_operations")).toBe(false);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.requestItemId)).toBe(true);
    expect(handoff.fakeGreenClaimed).toBe(false);
  });

  it("builds PDF rows from the approved snapshot and sends only procurement rows to buyer handoff", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "строительство дороги 1 км ширина 6 м асфальт",
    });
    if (!estimate) throw new Error("estimate_missing");
    const snapshot = buildExpandedComplexSnapshot(estimate);
    const directPdf = buildExpandedComplexPdfModel(snapshot);
    const directBuyer = buildExpandedComplexBuyerHandoff(snapshot);
    const directBuyerRows = [
      ...directBuyer.procurement_materials,
      ...directBuyer.equipment_to_purchase,
      ...directBuyer.delivery_procurement_services,
    ];
    const snapshotRows = [
      ...snapshot.material_rows,
      ...snapshot.work_rows,
      ...snapshot.equipment_rows,
      ...snapshot.service_rows,
    ];
    const pdfGroupedRows = Object.values(directPdf.grouped_quantities).flat();
    const snapshotCodes = new Set(snapshotRows.map((row) => row.code));

    expect(directPdf.rows_equal_snapshot).toBe(true);
    expect(pdfGroupedRows).toHaveLength(snapshotRows.length);
    expect(snapshot.material_rows.length).toBeGreaterThan(0);
    expect(snapshot.work_rows.length).toBeGreaterThan(0);
    expect(snapshot.equipment_rows.length).toBeGreaterThan(0);
    expect(snapshot.service_rows.length).toBeGreaterThan(0);
    expect([
      "sand_gravel_subbase_m3",
      "crushed_stone_base_m3",
      "asphalt_lower_t",
      "asphalt_upper_t",
      "bitumen_emulsion_l",
      "road_area_m2",
      "earthworks_m3",
      "roller_shifts",
      "paver_shifts",
      "laboratory_control_set",
    ].every((code) => snapshotCodes.has(code))).toBe(true);
    expect(snapshotRows.some((row) => row.code.startsWith("professional_wbs_") || /extra|assurance|padding/i.test(row.code))).toBe(false);
    expect(directBuyerRows.every((row) => row.lineType !== "work")).toBe(true);
    expect(directBuyerRows.every((row) => row.includedInProcurement)).toBe(true);

    __resetConsumerRepairRequestStoreForTests();
    const prompt = "строительство дороги 1 км ширина 6 м асфальт";
    const aiDraft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Бишкек" });
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "professional-boq-office-pdf",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Бишкек",
      addressText: "Бишкек, тестовый адрес",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-05T00:00:00.000Z",
    });
    if (!pdf) throw new Error("pdf_missing");
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const canonicalRevisionId = String(
      approved.items[0]?.sourceParameters?.canonicalBackendRevisionId ?? "",
    );
    const approvedSnapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
    const pdfRows = pdf.sections.flatMap((section) => section.rows);
    const publicPdfText = pdfRows.flatMap((row) => [
      row.sectionTitle,
      row.name,
      row.quantity,
      row.unitPrice,
      row.total,
      ...row.sourceLabels,
    ]).join("\n");

    expect(approvedSnapshotRows).toHaveLength(approved.items.length);
    expect(approvedSnapshotRows).toHaveLength(aiDraft.items.length);
    expect(aiDraft.items.some((item) => item.itemType === "material")).toBe(true);
    expect(aiDraft.items.some((item) => item.itemType === "work")).toBe(true);
    // Consumer items intentionally encode machinery as a service row while
    // preserving the equipment category used by BOQ grouping and procurement.
    expect(aiDraft.items.some((item) => item.itemType === "service" && item.category === "equipment")).toBe(true);
    expect(aiDraft.items.some((item) => item.itemType === "service" && item.category === "logistics")).toBe(true);
    expect(aiDraft.items.some((item) => item.itemType === "service" && item.category === "quality")).toBe(true);
    expect(pdfRows).toHaveLength(approvedSnapshotRows.length);
    expect(canonicalRevisionId).toBeTruthy();
    expect(approved.pdfs[0]?.revisionId).toBe(canonicalRevisionId);
    expect(handoff.revisionId).toBe(canonicalRevisionId);
    expect(handoff.rowsHash).toBe(approved.pdfs[0]?.revisionRowsHash);
    expect(handoff.fakeGreenClaimed).toBe(false);
    expect(handoff.items.length).toBeGreaterThan(0);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.requestItemId)).toBe(true);
    expect(publicPdfText).not.toMatch(/PRICE_MISSING|source_parameters|template_id|template_version|formula_id|raw_ai_json/i);
  });
});
