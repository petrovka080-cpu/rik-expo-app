import {
  composeWorkSpecificQuestionsV4,
  stableWorkSpecificParameterIdV4,
  type WorkSpecificParameterSchemaV4,
} from "../../src/lib/estimate/v4";
import { fixtureParameter } from "./fixtures/workSpecificSchemaFixtures";

const WORK_ID = "fixture_question_controls";
const FAMILY_ID = "fixture_controls";

const schema: WorkSpecificParameterSchemaV4 = {
  schema_id: `${WORK_ID}:schema:v4-fixture`,
  schema_version: "WorkSpecificParameterSchemaV4",
  owner_work_id: WORK_ID,
  owner_family_id: FAMILY_ID,
  compatibility_source: "native_v4",
  question_budget: { initial_maximum: 12, hard_maximum: 12 },
  mutually_exclusive_input_groups: [],
  parameters: [
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "area_m2", name: "Площадь работ", inputKind: "quantity", unitId: "m2", displayUnitIds: ["m2", "kg", "mm"], necessity: "critical", affectedRowIds: ["area_row"] }),
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "surface_state", name: "Состояние поверхности", inputKind: "enum", choices: ["готова", "требует подготовки"], affectedRowIds: ["preparation"] }),
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "milling_required", name: "Требуется фрезерование", inputKind: "boolean", applicability: "existing_surface_present", affectedRowIds: ["milling"] }),
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "project_document", name: "Проект или спецификация", inputKind: "document", specificationBindings: ["project_specification"] }),
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "site_location", name: "Город, адрес или площадка", inputKind: "location", priceBindingKeys: ["regional_price"] }),
    fixtureParameter({ workId: WORK_ID, familyId: FAMILY_ID, key: "derived_volume", name: "Расчётный объём", inputKind: "derived", necessity: "derived", formulaDependencies: ["volume_formula"] }),
  ],
};

describe("QuestionComposerV4 controls", () => {
  test("renders professional controls and only compatible units", () => {
    const questions = composeWorkSpecificQuestionsV4({ schema, maximum_questions: 12 }).questions;
    const byKey = (key: string) => questions.find((question) => question.parameter_id === stableWorkSpecificParameterIdV4(WORK_ID, key))!;

    expect(byKey("area_m2")).toMatchObject({
      control: "numeric_input",
      canonical_unit_id: "m2",
      required_tier: "critical",
      range: { minimum: 0, maximum: null },
      example_ru: expect.stringContaining("100"),
    });
    expect(byKey("area_m2").display_units.map((unit) => unit.unit_id)).toEqual(["m2"]);
    expect(byKey("surface_state")).toMatchObject({ control: "single_select", canonical_unit_id: null });
    expect(byKey("surface_state").choices).toHaveLength(2);
    expect(byKey("surface_state").display_units).toEqual([]);
    expect(byKey("milling_required").choices.map((choice) => choice.label_ru)).toEqual(["Да", "Нет", "Неизвестно"]);
    expect(byKey("project_document").control).toBe("file_upload");
    expect(byKey("project_document").how_to_answer_ru).toContain("Загрузите");
    expect(byKey("project_document").how_to_answer_ru).not.toContain("Новое значение");
    expect(byKey("site_location").control).toBe("location_input");
    expect(byKey("site_location").how_to_answer_ru).toContain("город");
    expect(byKey("site_location").display_units).toEqual([]);
    expect(questions.map((question) => question.parameter_id)).not.toContain(stableWorkSpecificParameterIdV4(WORK_ID, "derived_volume"));
  });

  test("every question carries explanation, fill guidance, impact, provenance and skip consequence", () => {
    const questions = composeWorkSpecificQuestionsV4({ schema, maximum_questions: 12 }).questions;
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      expect(question.title_ru).not.toBe("");
      expect(question.why_it_matters_ru).not.toBe("");
      expect(question.how_to_answer_ru).not.toBe("");
      expect(question.example_ru).not.toBe("");
      expect(["critical", "recommended", "optional"]).toContain(question.required_tier);
      expect(question.changes_in_estimate_ru).not.toBe("");
      expect(question.provenance).toBe("not_provided");
      expect(question.current_value_source_ru).not.toBe("");
      expect(question.missing_value_consequence_ru).not.toBe("");
    }
  });

  test("does not ask an inapplicable parameter or a fact already extracted from user text", () => {
    const booleanId = stableWorkSpecificParameterIdV4(WORK_ID, "milling_required");
    const areaId = stableWorkSpecificParameterIdV4(WORK_ID, "area_m2");
    const result = composeWorkSpecificQuestionsV4({
      schema,
      maximum_questions: 12,
      parameter_applicability: { [booleanId]: false },
      facts: [{
        fact_id: "fixture:area:user-text",
        parameter_id: areaId,
        value: 1000,
        unit_id: "m2",
        provenance: "user_confirmed",
        confirmed: true,
        source_reference: "user_text",
        confidence: "high",
      }],
    });
    expect(result.questions.map((question) => question.parameter_id)).not.toEqual(expect.arrayContaining([booleanId, areaId]));
    expect(result.understood_fact_parameter_ids).toContain(areaId);
  });
});
