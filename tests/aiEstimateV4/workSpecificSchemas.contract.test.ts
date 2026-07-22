import { buildProfessionalWorkPassportV2 } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import { listProfessionalWorkPassportTemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  adaptProfessionalWorkPassportV2ToV4,
  composeWorkSpecificQuestionsV4,
  stableWorkSpecificParameterIdV4,
  validateProfessionalEstimatePassportV4,
  validateWorkSpecificParameterSchemaV4,
} from "../../src/lib/estimate/v4";
import {
  ASPHALT_PARAMETER_SCHEMA_FIXTURE,
  ELECTRICAL_PARAMETER_SCHEMA_FIXTURE,
  fixtureParameter,
  TILE_PARAMETER_SCHEMA_FIXTURE,
} from "./fixtures/workSpecificSchemaFixtures";

describe("work-specific V4 parameter schemas", () => {
  test("tile, electrical and asphalt work IDs own materially different schemas", () => {
    const schemas = [TILE_PARAMETER_SCHEMA_FIXTURE, ELECTRICAL_PARAMETER_SCHEMA_FIXTURE, ASPHALT_PARAMETER_SCHEMA_FIXTURE];
    expect(new Set(schemas.map((schema) => schema.owner_work_id)).size).toBe(3);
    expect(schemas.every((schema) => schema.parameters.every((parameter) => parameter.owner_work_id === schema.owner_work_id))).toBe(true);
    expect(validateWorkSpecificParameterSchemaV4(TILE_PARAMETER_SCHEMA_FIXTURE).ok).toBe(true);
    expect(validateWorkSpecificParameterSchemaV4(ELECTRICAL_PARAMETER_SCHEMA_FIXTURE).ok).toBe(true);
    expect(validateWorkSpecificParameterSchemaV4(ASPHALT_PARAMETER_SCHEMA_FIXTURE).ok).toBe(true);

    const tileKeys = new Set(TILE_PARAMETER_SCHEMA_FIXTURE.parameters.map((parameter) => parameter.canonical_key));
    const electricalKeys = new Set(ELECTRICAL_PARAMETER_SCHEMA_FIXTURE.parameters.map((parameter) => parameter.canonical_key));
    const asphaltKeys = new Set(ASPHALT_PARAMETER_SCHEMA_FIXTURE.parameters.map((parameter) => parameter.canonical_key));
    expect(tileKeys).toEqual(new Set(["area_m2", "tile_size", "substrate_type", "layout_pattern", "joint_width_mm"]));
    expect(electricalKeys).toEqual(new Set(["points_count", "voltage", "power_kw", "installation_method", "route_length_m"]));
    expect(asphaltKeys).toEqual(new Set(["area_m2", "length_m", "width_m", "layer_thickness_mm", "mix_type", "base_type", "delivery_distance_km"]));
    expect(electricalKeys.has("tile_size")).toBe(false);
    expect(tileKeys.has("voltage")).toBe(false);
    expect(asphaltKeys.has("joint_width_mm")).toBe(false);
  });

  test("parameter IDs are stable and every fixture parameter has a professional binding", () => {
    for (const schema of [TILE_PARAMETER_SCHEMA_FIXTURE, ELECTRICAL_PARAMETER_SCHEMA_FIXTURE, ASPHALT_PARAMETER_SCHEMA_FIXTURE]) {
      for (const parameter of schema.parameters) {
        expect(parameter.parameter_id).toBe(stableWorkSpecificParameterIdV4(schema.owner_work_id, parameter.canonical_key));
        expect(
          parameter.formula_dependencies.length +
          parameter.affected_row_ids.length +
          parameter.specification_bindings.length +
          parameter.price_binding_keys.length > 0 ||
          parameter.applicability_condition !== "always",
        ).toBe(true);
      }
    }
  });

  test("family inheritance is accepted only with an owned work-specific overlay", () => {
    const v2 = buildProfessionalWorkPassportV2(listProfessionalWorkPassportTemplateIds()[0]);
    const passport = adaptProfessionalWorkPassportV2ToV4(v2!);
    passport.inheritance.source_contract = "ProfessionalEstimatePassportV4";
    passport.inheritance.family_passport_id = "family:fixture:v4";
    passport.inheritance.work_specific_overlay_id = null;
    expect(validateProfessionalEstimatePassportV4(passport).blockers).toContain("FAMILY_BASE_WITHOUT_WORK_SPECIFIC_OVERLAY");
    passport.inheritance.work_specific_overlay_id = `${passport.identity.stable_work_id}:overlay:v4`;
    expect(validateProfessionalEstimatePassportV4(passport).blockers).not.toContain("FAMILY_BASE_WITHOUT_WORK_SPECIFIC_OVERLAY");
  });

  test("dead and duplicate semantic parameters are detected", () => {
    const schema = JSON.parse(JSON.stringify(TILE_PARAMETER_SCHEMA_FIXTURE)) as typeof TILE_PARAMETER_SCHEMA_FIXTURE;
    const dead = fixtureParameter({
      workId: schema.owner_work_id,
      familyId: schema.owner_family_id,
      key: "unbound_finish_note",
      name: "Примечание по отделке",
      inputKind: "text",
    });
    const duplicate = fixtureParameter({
      workId: schema.owner_work_id,
      familyId: schema.owner_family_id,
      key: "area_duplicate",
      name: "Площадь облицовки",
      unitId: "m2",
      affectedRowIds: ["tile"],
    });
    schema.parameters.push(dead, duplicate);
    const validation = validateWorkSpecificParameterSchemaV4(schema);
    expect(validation.dead_parameter_ids).toContain(dead.parameter_id);
    expect(validation.duplicate_semantic_parameter_ids).toEqual(expect.arrayContaining([
      stableWorkSpecificParameterIdV4(schema.owner_work_id, "area_m2"),
      duplicate.parameter_id,
    ]));
  });

  test("inapplicable and already extracted parameters are not asked again", () => {
    const areaId = stableWorkSpecificParameterIdV4(TILE_PARAMETER_SCHEMA_FIXTURE.owner_work_id, "area_m2");
    const substrateId = stableWorkSpecificParameterIdV4(TILE_PARAMETER_SCHEMA_FIXTURE.owner_work_id, "substrate_type");
    const composition = composeWorkSpecificQuestionsV4({
      schema: TILE_PARAMETER_SCHEMA_FIXTURE,
      facts: [{
        fact_id: "fixture:tile:area-fact",
        parameter_id: areaId,
        value: 45,
        unit_id: "m2",
        provenance: "user_confirmed",
        confirmed: true,
        source_reference: null,
        confidence: "high",
      }],
      parameter_applicability: { [substrateId]: false },
      maximum_questions: 12,
    });
    expect(composition.questions.map((question) => question.parameter_id)).not.toContain(areaId);
    expect(composition.questions.map((question) => question.parameter_id)).not.toContain(substrateId);
    expect(composition.understood_fact_parameter_ids).toContain(areaId);
  });
});
