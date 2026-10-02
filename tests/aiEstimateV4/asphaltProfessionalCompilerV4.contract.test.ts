import {
  GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE,
  auditAsphaltProfessionalEstimateV4,
  buildAsphaltRoadEngineerReviewPackageV4,
  compileAsphaltProfessionalEstimateV4,
  extractAsphaltUserFactsV4,
} from "../../src/lib/estimate/v4/asphalt";
import {
  ASPHALT_PHASE1_CONTROL_TEXT,
  asphaltPhase1CompleteInput,
} from "./fixtures/asphaltPhase1.fixture";

describe("Asphalt V4 professional compiler", () => {
  test.each([
    ["Дороги, транспорт и площадки: асфальтобетонное покрытие, 1000 метров длина и ширина 32 метра", 1000, 32, 32000],
    ["Асфальтобетонное покрытие, длина 1000 м, ширина 32 м", 1000, 32, 32000],
    ["Асфальтобетонное покрытие, 1000 метров длиной и 32 метра шириной", 1000, 32, 32000],
    ["Дорога 3 км на 14 м", 3000, 14, 42000],
    ["Протяжённость 3000 м, средняя ширина 8 м", 3000, 8, 24000],
    ["Участок 500 × 7 м", 500, 7, 3500],
    ["Асфальтирование 2 км дороги шириной 9 метров", 2000, 9, 18000],
  ])("extracts road geometry from %s", (rawText, length, width, area) => {
    const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: rawText });
    expect(compilation.quantity_basis).toEqual(expect.objectContaining({
      basis_type: "project",
      length_m: length,
      width_m: width,
      area_m2: area,
    }));
  });

  test("keeps a 15000 m road request linear until width is known", () => {
    const rawText =
      "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — 15 000 м";
    const preliminary = compileAsphaltProfessionalEstimateV4({ raw_text: rawText });
    const geometryAssumptions = preliminary.preliminary_assembly_policy.assumptions.filter(
      (assumption) => ["geometry_method", "area_m2"].includes(assumption.canonical_key),
    );

    expect(preliminary.quantity_basis).toMatchObject({
      basis_type: "reference",
      length_m: 15_000,
      width_m: null,
      area_m2: 1_000,
      source: "reference_policy",
      formula_trace: "area_m2",
    });
    expect(geometryAssumptions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        canonical_key: "area_m2",
        value: 1_000,
        user_confirmed: false,
      }),
    ]));
    expect(preliminary.compiled_rows.length).toBeGreaterThan(0);
    expect(preliminary.compiled_rows.every((row) => row.quantity > 0)).toBe(true);
    expect(preliminary.compiled_rows.every((row) =>
      row.included_in_procurement === false
      && row.definition.procurement_eligible === false
      && row.definition.informational === true
      && row.definition.costing_mode === "ANALYTICAL_ONLY"
    )).toBe(true);
    expect(preliminary.passport.procurement_lines).toEqual([]);
    expect(preliminary.passport.commercial_lines).toEqual([]);
    expect(preliminary.price_coverage.total_rows).toBe(0);
    expect(preliminary.clarification.critical_required).toEqual(expect.arrayContaining([
      expect.objectContaining({
        parameter_id: "asphalt_concrete_pavement:parameter:width_m:v4",
      }),
    ]));
    expect(preliminary.clarification.understood).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label_ru: "Площадь покрытия",
        value_ru: "1 000 м²",
        provenance_ru: "Предварительное допущение — уточнить",
      }),
      expect.objectContaining({
        label_ru: "Длина участка",
        value_ru: "15 000 м",
        provenance_ru: "Из текста пользователя",
      }),
    ]));
    expect(preliminary.compiled_rows.some((row) =>
      /цементобетон|cement[_ -]?concrete/iu.test([
        row.definition.row_id,
        row.definition.professional_name_ru,
        row.definition.technical_specification_ru,
      ].join(" "))
    )).toBe(false);

    expect(() => compileAsphaltProfessionalEstimateV4({
      raw_text: rawText,
      assumption_policy: "FORBID_QUANTITY_ASSUMPTIONS",
    })).toThrow(
      "ASPHALT_V4_QUANTITY_BASIS_MISSING;area=null;length=15000;width=null;geometry_method=null",
    );
  });

  test("turns the same linear road into object procurement only after width is explicit", () => {
    const project = compileAsphaltProfessionalEstimateV4({
      raw_text:
        "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — длина 15 000 м, ширина 7 м",
    });

    expect(project.quantity_basis).toMatchObject({
      basis_type: "project",
      length_m: 15_000,
      width_m: 7,
      area_m2: 105_000,
    });
    expect(project.compiled_rows.some((row) => row.included_in_procurement)).toBe(true);
    expect(project.passport.procurement_lines.length).toBeGreaterThan(0);
  });

  test("seals the complete vertical slice with every Phase 1 counter at zero", () => {
    const compilation = compileAsphaltProfessionalEstimateV4(asphaltPhase1CompleteInput());
    const audit = auditAsphaltProfessionalEstimateV4(compilation);

    expect(audit.final_status).toBe(
      GREEN_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE_SOFTWARE_SEALED_READY_FOR_ROAD_ENGINEER_REVIEW_NO_RELEASE,
    );
    expect(Object.keys(audit.counters)).toHaveLength(26);
    expect(Object.values(audit.counters).every((value) => value === 0)).toBe(true);
    expect(audit.compile_blockers).toEqual([]);
    expect(audit.unresolved_requirements).toEqual([]);
    expect(audit.source_trace_complete).toBe(true);
    expect(audit.other_works_migrated).toBe(0);
    expect(audit.release_claimed).toBe(false);
  });

  test("keeps quantities, prices, formulas and sources as separate truths", () => {
    const compilation = compileAsphaltProfessionalEstimateV4(asphaltPhase1CompleteInput());

    expect(compilation.compiled_rows.length).toBeGreaterThan(10);
    expect(compilation.compiled_rows.every((row) => row.quantity > 0)).toBe(true);
    expect(compilation.passport.formulas.every((formula) =>
      formula.input_parameter_ids.length > 0 &&
      formula.dimensional_status === "valid" &&
      formula.explanation_trace_ru.length > 20,
    )).toBe(true);
    expect(compilation.price_coverage).toMatchObject({
      priced_rows: 0,
      missing_price_rows: compilation.price_coverage.total_rows,
      total_amount: null,
      display_total_ru: "Итог не рассчитан: цены не заполнены",
    });
    expect(compilation.price_coverage.total_rows).toBeGreaterThan(0);
    expect(compilation.passport.boq_rows.every((row) =>
      row.applicability && row.inclusion_reason_ru && row.exclusion_rule && row.source_id,
    )).toBe(true);
  });

  test("extracts the control phrase without asking for facts already supplied", () => {
    const extraction = extractAsphaltUserFactsV4(ASPHALT_PHASE1_CONTROL_TEXT);
    const compilation = compileAsphaltProfessionalEstimateV4({ raw_text: ASPHALT_PHASE1_CONTROL_TEXT });
    const understood = compilation.clarification.understood.map((item) => `${item.label_ru}:${item.value_ru}`).join("|");
    const questions = [
      ...compilation.clarification.critical_required,
      ...compilation.clarification.recommended,
      ...compilation.clarification.optional_or_assumption,
    ];

    expect(extraction.facts.length).toBeGreaterThanOrEqual(5);
    expect(understood).toContain("Площадь покрытия:1 000 м²");
    expect(understood).toContain("Новое строительство или ремонт:Ремонт существующего покрытия");
    expect(understood).toContain("Асфальтобетонные слои:2 сл.; толщины 60 и 40 мм");
    expect(understood).toContain("Регион или город:Бишкек");
    expect(questions.map((item) => item.parameter_id)).not.toContain(
      "asphalt_concrete_pavement:parameter:area_m2:v4",
    );
    expect(questions.every((item) =>
      item.title_ru && item.why_it_matters_ru && item.how_to_answer_ru &&
      item.example_ru && item.changes_in_estimate_ru && item.missing_value_consequence_ru,
    )).toBe(true);
  });

  test.each([
    "Устройство асфальтобетонного покрытия 900 м² толщиной 50 мм",
    "Устройство асфальтобетонного покрытия 900 м² × 50 мм",
    "Устройство верхнего слоя асфальтобетонного покрытия 900 м² толщиной 50 мм",
    "Устройство асфальтобетонного покрытия 900 м², верхний слой 50 мм.",
  ])("keeps the explicit 900 m2 by 50 mm wearing-layer geometry: %s", (rawText) => {
    const extraction = extractAsphaltUserFactsV4(rawText);
    const compilation = compileAsphaltProfessionalEstimateV4({
      raw_text: rawText,
      profile_override: "new_full_road_pavement",
    });
    const upper = compilation.compiled_rows.find((row) =>
      row.definition.row_id === "asphalt_layer_2_material"
    );

    expect(extraction.extracted_parameter_keys).toEqual(expect.arrayContaining([
      "area_m2",
      "asphalt_layer_2_thickness_mm",
    ]));
    expect(upper?.formula_input_values).toEqual(expect.objectContaining({
      area_m2: 900,
      asphalt_layer_2_thickness_mm: 50,
    }));
    expect(upper?.quantity).toBe(107.865);
  });

  test("builds an explicit road-engineer package without claiming expert sign-off", () => {
    const compilation = compileAsphaltProfessionalEstimateV4(asphaltPhase1CompleteInput());
    const review = buildAsphaltRoadEngineerReviewPackageV4(compilation);

    expect(review.revision_hash).toBe(compilation.passport.deterministic_hash);
    expect(review.formulas).toHaveLength(compilation.passport.formulas.length);
    expect(review.example_boq).toHaveLength(compilation.compiled_rows.length);
    expect(review.procurement_output.length).toBeGreaterThan(0);
    expect(review.ai_professional_truth_claimed).toBe(false);
    expect(review.road_engineer_sign_off_required).toBe(true);
  });
});
