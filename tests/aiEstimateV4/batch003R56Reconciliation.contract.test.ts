import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { selectCanonicalArtifactRows } from "../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { canonicalApprovedBaselineRuntimeParameters } from "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
} from "../../scripts/estimate/r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../../scripts/estimate/r5/batch003R56Fixtures";
import {
  DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS,
  DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
  DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingPreparePreliminaryScenarioR1";

const FORBIDDEN_CATEGORIES = new Set(["documentation", "testing", "temporary_work", "subcontract_service"]);
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);
const FORBIDDEN_TEXT = /(?:журнал|акт\b|протокол|фото(?:фиксац|отчет)|обмер\s+и\s+подтвержден|входн(?:ой|ого)\s+контрол|испытани|комплект\s+(?:приемочн|исполнительн|закупочн)|ппе|сиз\b)/iu;
const PREPARE_SOURCE_PACK_PATH = resolve(
  "data/estimate-benchmarks/source-packs/drywall-ceiling-preparation-preliminary-profile-r2.json",
);

type DrywallCeilingPrepareSourcePack = {
  schemaVersion: string;
  authoredIndependentlyFromDefinitionRows: boolean;
  independentRequiredComposition: { rowKey: string }[];
  conditionalRequiredComposition: { rowKey: string }[];
};

function readPrepareSourcePack(): { bytes: Buffer; sourcePack: DrywallCeilingPrepareSourcePack } {
  const bytes = readFileSync(PREPARE_SOURCE_PACK_PATH);
  return {
    bytes,
    sourcePack: JSON.parse(bytes.toString("utf8")) as DrywallCeilingPrepareSourcePack,
  };
}

describe("BATCH-003 R5.6 canonical successor reconciliation", () => {
  test("projects the exact 36 legacy identities into unique noise-free REAL_WORK definitions", () => {
    const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
    expect(definitions).toHaveLength(36);
    expect(new Set(definitions.map((definition) => definition.definitionSha256)).size).toBe(36);
    expect(new Set(definitions.map((definition) => definition.passport.engineeringSourcePack.sourcePackHash)).size).toBe(36);
    for (const definition of definitions) {
      expect(definition).toMatchObject({
        batchId: "BATCH-003",
        successorVersion: "Batch003CanonicalSuccessorR56",
        disposition: "REAL_WORK",
      });
      expect(definition.resources.length).toBeGreaterThanOrEqual(5);
      expect(definition.resources.length).toBeLessThanOrEqual(49);
      if (definition.operation === "PREPARE") {
        expect(definition.resources).toHaveLength(34);
        expect(definition.resources.some((row) => /:operation_work|:incoming_delivery|:waste_haul|:access_delivery_return$/u.test(row.rowId))).toBe(false);
        expect(definition.resources.filter((row) => row.rowId.endsWith(":access_delivery"))).toHaveLength(1);
        expect(definition.resources.filter((row) => row.rowId.endsWith(":access_return"))).toHaveLength(1);
      } else if (definition.operation === "FRAME") {
        const p113Rows = definition.resources.filter((row) =>
          row.inclusionCondition.includes("frame_quantity_basis=P113_TYPICAL_PRELIMINARY"));
        const projectTakeoffRows = definition.resources.filter((row) =>
          row.inclusionCondition.includes("frame_quantity_basis=PROJECT_TAKEOFF"));
        if (definition.catalogId === "drywall_ceiling_interior_drywall_ceiling_frame_large_area") {
          expect(p113Rows).toHaveLength(27);
          expect(projectTakeoffRows).toHaveLength(22);
          expect(definition.resources).toHaveLength(projectTakeoffRows.length + p113Rows.length);
        } else {
          expect(p113Rows).toHaveLength(0);
          expect(projectTakeoffRows).toHaveLength(0);
          expect(definition.resources).toHaveLength(
            definition.resources.filter((row) => row.category === "material").length + 15,
          );
          if (definition.variant === "standard") expect(definition.resources).toHaveLength(31);
          expect(definition.resources.filter((row) => row.rowId.endsWith(":operation_work"))).toHaveLength(0);
          expect(definition.resources.filter((row) => /:frame_(?:setting_out_work|anchor_work|profile_cutting_work|perimeter_installation_work|hanger_installation_work|profile_grid_installation_work|alignment_work|measurement_equipment|anchor_equipment|assembly_equipment)$/u.test(row.rowId))).toHaveLength(10);
        }
      } else {
        expect(definition.resources.filter((row) => row.rowId.endsWith(":operation_work"))).toHaveLength(1);
        expect(definition.resources.filter((row) => row.rowId.endsWith(":incoming_delivery"))).toHaveLength(1);
        expect(definition.resources.filter((row) => row.rowId.endsWith(":waste_haul"))).toHaveLength(1);
      }
      expect(definition.resources.filter((row) => row.rowId.endsWith(":access_equipment"))).toHaveLength(1);
      expect(definition.resources.every((row) => !FORBIDDEN_CATEGORIES.has(row.category)
        && !FORBIDDEN_UNITS.has(row.outputUnitId)
        && !FORBIDDEN_TEXT.test(row.titleRu))).toBe(true);
      expect(definition.passport).toMatchObject({
        predecessorNoiseRowsCarriedForwardCount: 0,
        hiddenQuantitativeAssumptionCount: 0,
        documentationBoqRowCount: 0,
        genericHourBoqRowCount: 0,
      });
    }
  });

  test("binds the source pack exactly to formula and price inputs with fail-closed provenance", () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
      const expected = new Set([
        ...definition.formulas.flatMap((formula) => formula.inputParameterIds),
        ...definition.resources.flatMap((resource) => resource.priceRoute?.kind === "RUNTIME_VALIDATED_INPUT"
          ? [resource.priceRoute.unit_price_parameter_id] : []),
      ]);
      const bindings = definition.passport.engineeringSourcePack.quantitativeBindings;
      expect(new Set(bindings.map((binding) => binding.parameterId))).toEqual(expected);
      expect(bindings.every((binding) => binding.hiddenDefault === false
        && binding.missingValuePolicy === "FAIL_CLOSED"
        && binding.sourceIds.length > 0
        && binding.formulaConsumerIds.length > 0)).toBe(true);
      expect(definition.parameters.every((parameter) => parameter.defaultValue == null
        && parameter.missingValuePolicy === "FAIL_CLOSED")).toBe(true);
    }
  });

  test("keeps the technical-room gypsum ceiling preparation package explicit, complete and understandable", () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === "drywall_ceiling_interior_drywall_ceiling_prepare_technical_room"
    );
    expect(definition).toBeDefined();
    const titles = definition?.resources.map((row) => row.titleRu) ?? [];
    expect(titles).toEqual(expect.arrayContaining([
      "Полиэтиленовая защитная плёнка 4×50 м для укрытия пола и оборудования",
      "Малярная лента выбранной ширины, рулон 50 м, для укрытий и примыканий",
      "Прочные строительные мешки для упаковки, пыли и отходов шпаклевания",
      "Финишная шпаклёвочная паста выбранного продукта и фасовки",
      "Абразивный круг P240, совместимый с выбранной шлифовальной машиной",
      "Защитные очки для шпаклевания и шлифования потолка",
      "Защитные перчатки для работы с финишной шпаклёвкой",
      "Респиратор для защиты органов дыхания при шпаклевании и шлифовании",
      "Шпаклёвочная смесь для ремонта швов и локальных дефектов ГКЛ",
      "Выбранная грунтовка, совместимая с картонной поверхностью ГКЛ",
      "Бумажная армирующая лента для ремонтируемых швов ГКЛ",
      "Осмотр потолка из ГКЛ, простукивание и разметка трещин, отслоений и повреждённых швов",
      "Очистка потолка из ГКЛ от пыли, слабых участков и загрязнений",
      "Промышленный строительный пылесос класса пыли M с насадкой для потолка",
      "Шлифовальная машина для стен и потолков с подключением пылеудаления",
      "Передвижная вышка-тура с ограждением для подтверждённых условий рабочей зоны",
      "Переносное рабочее освещение для контроля поверхности потолка",
      "Доставка подтверждённого средства доступа на объект",
      "Возврат подтверждённого средства доступа поставщику",
    ]));
    expect(definition?.parameters.some((parameter) => parameter.parameterId === "working_height_m")).toBe(true);
    expect(definition?.resources.find((row) => row.rowId.endsWith(":access_equipment"))?.procurementEligible).toBe(true);
  });

  test("binds the complete applicable first-estimate scope to an independent source pack", async () => {
    const { bytes, sourcePack } = readPrepareSourcePack();
    expect(sourcePack).toMatchObject({
      schemaVersion: "drywall-ceiling-preparation-preliminary-profile-r2.v2",
      authoredIndependentlyFromDefinitionRows: true,
    });
    expect(sourcePack.independentRequiredComposition).toHaveLength(25);
    expect(sourcePack.conditionalRequiredComposition).toHaveLength(6);

    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID
    );
    expect(definition).toBeDefined();
    const compiled = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
      },
    });
    const expectedRowIds = sourcePack.independentRequiredComposition.map(({ rowKey }) =>
      `${DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID}:successor-r56:row:${rowKey}`
    );

    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe(DRYWALL_CEILING_PREPARE_SOURCE_PACK_SHA256);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id).sort())
      .toEqual([...DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS].sort());
    expect(compiled.rows.map((row) => row.row_id).sort()).toEqual([...expectedRowIds].sort());
  });

  test("compiles 36/36 through the single shared core and selects the exact procurement subset", async () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
      const compiled = await compileBatch003R56ThroughSharedCore({
        definition,
        values: batch003R56FixtureValues(definition),
      });
      const expectedFixtureRowCount = definition.resources.filter((resource) =>
        !resource.inclusionCondition.includes("preparation_operation=THIN_FINISH_PASTE")
        && !resource.inclusionCondition.includes("frame_quantity_basis=P113_TYPICAL_PRELIMINARY")).length;
      expect(compiled.rows).toHaveLength(expectedFixtureRowCount);
      expect(compiled.totals).toMatchObject({
        includedRowCount: expectedFixtureRowCount,
        excludedRowCount: 0,
        pricedRowCount: expectedFixtureRowCount,
        unpricedRowCount: 0,
        currencyCode: "KGS",
      });
      const selected = selectCanonicalArtifactRows(compiled.rows);
      expect(selected.estimateRows).toHaveLength(compiled.rows.length);
      expect(selected.procurementRows.map((row) => row.row_id)).toEqual(
        compiled.rows.filter((row) => row.procurement_eligible).map((row) => row.row_id),
      );
      const withoutAccess = await compileBatch003R56ThroughSharedCore({
        definition,
        values: definition.operation === "PREPARE"
          ? { ...batch003R56FixtureValues(definition), elevated_work_requirement_state: "NOT_REQUIRED" }
          : { ...batch003R56FixtureValues(definition), access_equipment_required: false },
      });
      const conditionalAccessRowCount = definition.resources.filter((row) =>
        !row.inclusionCondition.includes("preparation_operation=THIN_FINISH_PASTE")
        && !row.inclusionCondition.includes("frame_quantity_basis=P113_TYPICAL_PRELIMINARY")
        && (row.inclusionCondition.includes("access_equipment_required=true")
          || row.inclusionCondition.includes("elevated_work_requirement_state=REQUIRED"))
      ).length;
      expect(withoutAccess.rows).toHaveLength(compiled.rows.length - conditionalAccessRowCount);
      expect(withoutAccess.rows.some((row) => /:access_(?:equipment|operations|temporary_works|delivery|return)$/u.test(row.row_id))).toBe(false);
    }
  });

  test("keeps every missing primary quantity as an honest row-level need and permits explicitly unknown prices", async () => {
    for (const definition of buildAllBatch003R56CanonicalSuccessorDefinitions()) {
      const completeValues = batch003R56FixtureValues(definition);
      const complete = await compileBatch003R56ThroughSharedCore({ definition, values: completeValues });
      const values = { ...completeValues };
      const quantityId = definition.operation === "FINISH_JOINT"
        ? "joint_length_m"
        : definition.operation === "REPAIR" ? "defect_area_m2" : "area_m2";
      delete values[quantityId];
      const incomplete = await compileBatch003R56ThroughSharedCore({ definition, values });
      const affectedRowIds = complete.rows.filter((row) => {
        const trace = row.calculation_trace as { inputParameterIds?: unknown } | undefined;
        return Array.isArray(trace?.inputParameterIds) && trace.inputParameterIds.includes(quantityId);
      }).map((row) => row.row_id);
      const unaffectedRowIds = complete.rows
        .filter((row) => !affectedRowIds.includes(row.row_id))
        .map((row) => row.row_id);

      expect(affectedRowIds.length).toBeGreaterThan(0);
      expect(incomplete.rows.map((row) => row.row_id)).toEqual(unaffectedRowIds);
      expect(incomplete.preliminaryNeeds.map((need) => need.row_id)).toEqual(affectedRowIds);
      expect(incomplete.preliminaryNeeds.every((need) =>
        need.need_state === "QUANTITY_REQUIRED"
        && need.quantity === null
        && need.missing_parameter_ids.length === 1
        && need.missing_parameter_ids[0] === quantityId
      )).toBe(true);
      expect(new Set([
        ...incomplete.rows.map((row) => row.row_id),
        ...incomplete.preliminaryNeeds.map((need) => need.row_id),
      ])).toEqual(new Set(complete.rows.map((row) => row.row_id)));

      await expect(compileBatch003R56ThroughSharedCore({
        definition,
        values: { ...completeValues, [quantityId]: -1 },
      })).rejects.toBeDefined();

      const withoutPrice = { ...completeValues };
      const genericFrame = definition.operation === "FRAME"
        && definition.catalogId !== "drywall_ceiling_interior_drywall_ceiling_frame_large_area";
      const removedPriceParameterId = genericFrame
        ? "unit_price_successor_frame_setting_out_work_kgs"
        : "unit_price_successor_operation_work_kgs";
      delete withoutPrice[removedPriceParameterId];
      const unpriced = await compileBatch003R56ThroughSharedCore({ definition, values: withoutPrice });
      if (definition.operation !== "PREPARE") {
        expect(unpriced.totals.unpricedRowCount).toBe(1);
        expect(unpriced.rows.filter((row) => row.unit_price == null).map((row) => row.row_id))
          .toEqual([expect.stringMatching(genericFrame ? /:frame_setting_out_work$/u : /:operation_work$/u)]);
      }
    }
  });

  test("applies the selected 0.3 mm finish-paste system without adding primer or repair", async () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === "drywall_ceiling_interior_drywall_ceiling_prepare_large_area"
    );
    expect(definition).toBeDefined();
    const values = {
      ...batch003R56FixtureValues(definition!),
      area_m2: 500,
      preparation_operation: "THIN_FINISH_PASTE",
      repair_requirement_state: "NOT_REQUIRED",
      primer_requirement_state: "NOT_REQUIRED_BY_SELECTED_SYSTEM",
      finish_product_reference: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
      finish_paste_consumption_kg_m2: 0.48,
      finish_paste_order_reserve_percent: 5,
      finish_paste_package_kg: 18,
      finish_abrasive_product_reference: "Абразивный круг P240 для выбранной шлифовальной машины",
      finish_abrasive_productivity_m2_per_item: 50,
      elevated_work_requirement_state: "NOT_REQUIRED",
      fall_protection_requirement_state: "NOT_REQUIRED",
    };

    const compiled = await compileBatch003R56ThroughSharedCore({ definition: definition!, values });
    const bySuffix = (suffix: string) => compiled.rows.find((row) => row.row_id.endsWith(`:${suffix}`));

    expect(bySuffix("finish_paste")).toMatchObject({
      title_ru: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
      quantity: "14",
      unit_id: "item",
    });
    expect(bySuffix("finish_abrasive")).toMatchObject({
      title_ru: "Абразивный круг P240 для выбранной шлифовальной машины",
      quantity: "10",
      unit_id: "item",
    });
    expect(bySuffix("finish_paste_application")?.quantity).toBe("500");
    expect(bySuffix("finish_sanding")?.quantity).toBe("500");
    expect(bySuffix("post_sanding_dust_removal")?.quantity).toBe("500");
    expect(bySuffix("finish_paste")?.normative_trace).toEqual(expect.arrayContaining([
      expect.objectContaining({ source_id: "KNAUF_ROTBAND_PASTA_PROFI_IL_2025_02" }),
    ]));
    expect(compiled.rows.some((row) => row.row_id.endsWith(":primer")
      || row.row_id.endsWith(":primer_application")
      || row.row_id.endsWith(":joint_compound")
      || row.row_id.endsWith(":joint_tape"))).toBe(false);
    const netConsumptionKg = 500 * 0.48;
    const orderMassKg = netConsumptionKg * 1.05;
    expect(netConsumptionKg).toBe(240);
    expect(orderMassKg).toBe(252);
    expect(Math.ceil(orderMassKg / Number(values.finish_paste_package_kg))).toBe(14);
    expect(definition?.formulas.find((formula) => formula.formulaId.endsWith(":finish_paste"))?.expressionSource)
      .toBe("ceil(area_m2 * finish_paste_consumption_kg_m2 * (1 + finish_paste_order_reserve_percent / 100) / finish_paste_package_kg)");
  });

  test("builds a useful first finish estimate from geometry before voluntary refinements", async () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID
    );
    expect(definition).toBeDefined();

    const preliminary = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
      },
    });
    const bySuffix = (suffix: string) => preliminary.rows.find((row) =>
      row.row_id.endsWith(`:${suffix}`)
    );

    expect(bySuffix("finish_paste")).toMatchObject({
      title_ru: DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1.finish_product_reference,
      quantity: "14",
      unit_id: "item",
      unit_price: null,
      amount: null,
    });
    expect(bySuffix("finish_paste_application")?.quantity).toBe("500");
    expect(bySuffix("finish_sanding")?.quantity).toBe("500");
    expect(DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1.repair_requirement_state)
      .toBe("NEEDS_SITE_INPUT");
    expect(preliminary.rows.some((row) => /:(?:primer|primer_application|joint_compound|joint_tape)$/u
      .test(row.row_id))).toBe(false);
    expect(preliminary.rows).toHaveLength(25);
    expect(preliminary.rows.every((row) => Number(row.quantity) > 0)).toBe(true);
    expect(preliminary.preliminaryNeeds.map((need) => need.row_id).sort())
      .toEqual([...DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS].sort());

    const refined = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      operation: "recalculate",
      values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
        finish_paste_order_reserve_percent: 10,
      },
    });
    expect(refined.rows.find((row) => row.row_id.endsWith(":finish_paste")))
      .toMatchObject({ quantity: "15", unit_id: "item", unit_price: null, amount: null });
  });

  test("preserves the complete profile through the approved-baseline runtime filter", async () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID
    );
    expect(definition).toBeDefined();
    const runtimeProfile = canonicalApprovedBaselineRuntimeParameters({
      input_values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
      },
      input_classification: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
        area_m2: "VALIDATION_FIXTURE",
      },
    });
    const compiled = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      values: { ...runtimeProfile, area_m2: 500 } as Record<string, string | number | boolean>,
    });

    expect(runtimeProfile).not.toHaveProperty("area_m2");
    expect(runtimeProfile).toMatchObject({
      repair_requirement_state: "NEEDS_SITE_INPUT",
      fall_protection_requirement_state: "INCLUDED_IN_ACCESS_SYSTEM",
    });
    expect(compiled.preliminaryNeeds.map((need) => need.row_id).sort())
      .toEqual([...DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS].sort());
    expect(compiled.rows).toHaveLength(25);
  });

  test("keeps repair conditional until survey and calculates it only from measured defects", async () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID
    );
    expect(definition).toBeDefined();

    const confirmedRepair = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      operation: "recalculate",
      values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
        repair_requirement_state: "REQUIRED",
        repair_area_share_percent: 8,
        repair_compound_kg_per_repair_m2: 1.2,
        repair_joint_length_m: 65,
        abrasive_productivity_m2_per_item: 8,
      },
    });
    expect(confirmedRepair.preliminaryNeeds).toEqual([]);
    expect(confirmedRepair.rows).toHaveLength(31);
    expect(confirmedRepair.rows.find((row) => row.row_id.endsWith(":joint_compound"))?.quantity)
      .toBe("48");
    expect(confirmedRepair.rows.find((row) => row.row_id.endsWith(":joint_tape"))?.quantity)
      .toBe("65");

    const surveyedSound = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      operation: "recalculate",
      values: {
        ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        area_m2: 500,
        repair_requirement_state: "NOT_REQUIRED",
      },
    });
    expect(surveyedSound.preliminaryNeeds).toEqual([]);
    expect(surveyedSound.rows).toHaveLength(25);
    expect(surveyedSound.rows.some((row) =>
      (DRYWALL_CEILING_PREPARE_CONDITIONAL_REQUIRED_ROW_IDS as readonly string[])
        .includes(row.row_id)
    )).toBe(false);
  });

  test("applies the selected P 113 preliminary rates and keeps perimeter geometry independent of area", async () => {
    const definition = buildAllBatch003R56CanonicalSuccessorDefinitions().find((candidate) =>
      candidate.catalogId === "drywall_ceiling_interior_drywall_ceiling_frame_large_area"
    );
    expect(definition).toBeDefined();
    const baseValues = {
      ...batch003R56FixtureValues(definition!),
      frame_quantity_basis: "P113_TYPICAL_PRELIMINARY",
      area_m2: 158,
      room_length_m: 15.8,
      room_width_m: 10,
      perimeter_sealing_required: true,
      structural_substrate_type: "REINFORCED_CONCRETE_SLAB",
      ceiling_load_verification_state: "P113_PRELIMINARY_PENDING_PROJECT_CHECK",
      hanger_system_reference: "Прямой подвес для ПП 60×27 системы П 113",
      structural_anchor_reference: "Анкерный элемент для железобетонного основания — уточнить по проекту",
      frame_access_system_type: "MOBILE_TOWER",
      material_delivery_trip_count: 1,
      access_return_trip_count: 1,
      waste_removal_trip_count: 1,
    };
    const compiled = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      values: baseValues,
    });
    const bySuffix = (suffix: string) => compiled.rows.find((row) => row.row_id.endsWith(`:${suffix}`));

    expect(compiled.rows.some((row) => row.row_id.includes(":material:"))).toBe(false);
    expect(compiled.rows).toHaveLength(27);
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(bySuffix("p113_ceiling_profile")?.quantity).toBe("458.2");
    expect(bySuffix("p113_perimeter_track")?.quantity).toBe("51.6");
    expect(bySuffix("p113_profile_extensions")?.quantity).toBe("32");
    expect(bySuffix("p113_single_level_connectors")?.quantity).toBe("269");
    expect(bySuffix("p113_direct_hangers")?.quantity).toBe("111");
    expect(bySuffix("p113_hanger_anchors")?.quantity).toBe("111");
    expect(bySuffix("p113_ln9_screws")?.quantity).toBe("222");
    expect(bySuffix("p113_perimeter_fasteners")?.quantity).toBe("104");
    expect(bySuffix("p113_sealing_tape")?.quantity).toBe("51.6");
    expect(bySuffix("p113_axis_setting_out")?.quantity).toBe("158");
    expect(bySuffix("p113_hanger_installation")?.quantity).toBe("111");
    expect(bySuffix("p113_access_equipment")?.quantity).toBe("4");
    expect(bySuffix("p113_material_delivery")?.quantity).toBe("1");
    expect(bySuffix("p113_access_return")?.quantity).toBe("1");
    expect(bySuffix("p113_waste_removal")?.quantity).toBe("1");
    expect(bySuffix("p113_ceiling_profile")?.normative_trace).toEqual(expect.arrayContaining([
      expect.objectContaining({ source_id: "KNAUF_P113_SYSTEM_PAGE_2026" }),
    ]));

    const sameAreaDifferentPerimeter = await compileBatch003R56ThroughSharedCore({
      definition: definition!,
      values: { ...baseValues, room_length_m: 31.6, room_width_m: 5 },
    });
    const changedPerimeter = sameAreaDifferentPerimeter.rows.find((row) =>
      row.row_id.endsWith(":p113_perimeter_track"));
    expect(changedPerimeter?.quantity).toBe("73.2");
    expect(Number(changedPerimeter?.quantity) - Number(bySuffix("p113_perimeter_track")?.quantity)).toBeCloseTo(21.6, 8);
  });
});
