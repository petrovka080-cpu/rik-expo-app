import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import {
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
} from "../../src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1";
import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";

const prompt = [
  "Монтаж и демонтаж опалубки по измеренной площади контакта RICS NRM 2.",
  "Измеренная площадь контакта: 100 м2;",
  "ссылка на чертёж: FW-149-REV-A;",
  "тип элемента: WALL;",
  "размеры и количество граней: 50 m x 2 m x 1 measured face;",
  "отделка: PLAIN;",
  "класс геометрии: VERTICAL;",
  "сторона опалубки: SINGLE_SIDED;",
  "правило проёмов и пустот: PROJECT_RULE:no openings in measured scope;",
  "тип опалубки: REMOVABLE;",
  "правило измерения проекта: RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A;",
  "согласование сметчика: EST-FW-149.",
].join(" ");

function catalog(): CanonicalEstimateCatalogItem {
  const parameterSchema = ["product_profile_id", ...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS]
    .map((parameterId, ordinal) => ({
      parameterId,
      ordinal,
      valueType: parameterId === "measured_formwork_contact_area_m2" ? "decimal" as const : "text" as const,
      unitId: parameterId === "measured_formwork_contact_area_m2" ? "m2" : null,
      titleRu: parameterId,
      required: true,
      defaultValue: null,
      constraints: parameterId === "measured_formwork_contact_area_m2" ? { min: 0.0001 } : {},
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "PROJECT_DOCUMENTATION" as const,
    }));
  return {
    catalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    releaseId: "00000000-0000-5000-8000-000000000149",
    namespace: "global",
    domain: "concrete",
    workKey: "concrete_foundation_interior_formwork_form_standard",
    titleRu: "Монтаж и демонтаж опалубки по измеренной площади контакта RICS NRM 2",
    definitionVersion: 7,
    applicability: {},
    professionalMetadata: {},
    parameterSchema,
  };
}

describe("consumer RICS NRM2 formwork baseline", () => {
  test("routes every explicit Web prompt value into the canonical compile request", () => {
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(), prompt });

    expect(plan.primaryMeasureParameterId).toBe("measured_formwork_contact_area_m2");
    expect(plan.parameters).toEqual({
      product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
      measured_formwork_contact_area_m2: 100,
      project_drawing_reference: "FW-149-REV-A",
      element_type: "WALL",
      element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
      plain_or_special_finish: "PLAIN",
      vertical_battered_horizontal_or_curved_class: "VERTICAL",
      single_or_double_sided_scope: "SINGLE_SIDED",
      openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
      permanent_or_removable_formwork: "REMOVABLE",
      project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-149-REV-A",
      estimator_approval_reference: "EST-FW-149.",
    });
  });

  test("does not apply the formwork parser to an unrelated schema", () => {
    const unrelated = catalog();
    unrelated.catalogId = "canonical-work:unrelated";
    unrelated.parameterSchema = [{
      ...unrelated.parameterSchema.find(
        (parameter) => parameter.parameterId === "measured_formwork_contact_area_m2",
      )!,
      parameterId: "area_m2",
    }];
    expect(buildCanonicalBaselinePlan({ catalog: unrelated, prompt }).parameters).toEqual({
      area_m2: "100",
    });
  });
});
