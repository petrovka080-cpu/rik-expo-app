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
      missing_price_rows: compilation.compiled_rows.length,
      total_amount: null,
      display_total_ru: "Итог не рассчитан: цены не заполнены",
    });
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
