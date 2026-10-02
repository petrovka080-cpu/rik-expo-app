import { buildConsumerCanonicalParameterSession } from "../../src/features/consumerRepair/consumerCanonicalParameterEditor";
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";
import {
  PRESSURE_SEWER_PIPELINE_CATALOG_ID,
  PRESSURE_SEWER_PIPELINE_FORMULAS,
  PRESSURE_SEWER_PIPELINE_PARAMETERS,
  PRESSURE_SEWER_PIPELINE_RESOURCES,
  PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION,
  PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
} from "../../src/lib/estimate/v4/pressureSewerPipelineR1";
import { buildCanonicalParameterCards } from "../../src/lib/estimatePresentation/buildCanonicalParameterCards";

const RELEASE_ID = "cff26f4d-563f-5b93-8aae-378a20922a8a";

describe("S27.27 pressure-sewer application profile in the consumer parameter panel", () => {
  it("shows all 46 application values with an editable accepted reference", () => {
    const parameterSchema: CanonicalEstimateCatalogItem["parameterSchema"] =
      PRESSURE_SEWER_PIPELINE_PARAMETERS.map((parameter) => {
        const parameterId = parameter.parameter_id;
        const truth = parameter.truth_metadata as Record<string, unknown>;
        const constraints = parameter.constraints_json ?? {};
        const formulaConsumers = PRESSURE_SEWER_PIPELINE_FORMULAS
          .filter((formula) => formula.input_parameter_ids.includes(parameterId))
          .map((formula) => formula.formula_id);
        const resourceBranchConsumers = PRESSURE_SEWER_PIPELINE_RESOURCES
          .filter((resource) =>
            formulaConsumers.includes(resource.formula_id)
            || JSON.stringify(resource.resource_graph).includes(`"${parameterId}"`)
            || JSON.stringify(resource.inclusion_ast).includes(`"${parameterId}"`)
          )
          .map((resource) => resource.row_id);
        return {
          parameterId,
          ordinal: parameter.ordinal,
          valueType: parameter.value_type as CanonicalEstimateCatalogItem["parameterSchema"][number]["valueType"],
          unitId: parameter.unit_id,
          titleRu: parameter.title_ru,
          required: parameter.required,
          preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
          defaultValue: parameter.default_value,
          constraints,
          visibilityRole: truth.visibility_role as "USER_INPUT",
          valueSourceRole: truth.value_source_role as never,
          runtimeProfileClassification:
            PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION[parameterId],
          requiredWhen: constraints.requiredWhen as Record<string, unknown> | undefined,
          formulaConsumers,
          resourceBranchConsumers,
        };
      });
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: PRESSURE_SEWER_PIPELINE_CATALOG_ID,
      releaseId: RELEASE_ID,
      namespace: "global",
      domain: "water_sewer",
      workKey: "pressure_sewer_pipeline",
      titleRu: "Строительство напорного канализационного трубопровода",
      definitionVersion: 2,
      applicability: {},
      professionalMetadata: {},
      parameterSchema,
    };
    const revision: CanonicalEstimateRevisionView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "559595a7-61a0-458a-97e3-cc527cd5bfa4",
      parentRevisionId: null,
      releaseId: RELEASE_ID,
      catalogId: PRESSURE_SEWER_PIPELINE_CATALOG_ID,
      revisionNumber: 1,
      status: "ready",
      currencyCode: "KGS",
      parameters: {
        psp_route_length_m: 100,
        ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
      },
      userInputSnapshot: { psp_route_length_m: 100 },
      acceptedBaselineSnapshot: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
      assumptionSnapshot: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT },
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      totals: { amount: null },
      rowCount: 47,
      checksumSha256: "e".repeat(64),
      compilerVersion: "canonical-backend.s27-27",
      parameterSchemaHash: "pressure-sewer-s27-27",
      createdAt: "2026-10-02T00:00:00.000+06:00",
    };

    const session = buildConsumerCanonicalParameterSession({
      catalog,
      revision,
      draftId: "pressure-sewer-100m",
    });
    const profileIds = Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT);
    const profileParameters = session.parameters.filter((parameter) =>
      profileIds.includes(parameter.parameterId)
    );
    const cards = buildCanonicalParameterCards({ session, revision: null });
    const profileCards = cards.filter((card) => profileIds.includes(card.key));

    expect(profileIds).toHaveLength(46);
    expect(session.parameters).toHaveLength(54);
    expect(session.contractMissingParameterIds).toHaveLength(7);
    expect(cards).toHaveLength(54);
    expect(cards.every((card) => card.editable)).toBe(true);
    expect(session.parameters.find((parameter) =>
      parameter.parameterId === "psp_pipe_designation"
    )).toMatchObject({ value: null, source: "MISSING" });
    expect(profileParameters).toHaveLength(46);
    expect(profileParameters.every((parameter) =>
      parameter.source === "ASSUMED"
      && parameter.referenceValue === parameter.value
    )).toBe(true);
    expect(profileCards).toHaveLength(46);
    expect(profileCards.every((card) =>
      card.source === "catalog_default" && card.editable
    )).toBe(true);
    expect(profileCards).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "psp_excavator_productivity_m3_h", value: 35 }),
      expect.objectContaining({ key: "psp_pipe_expected_loss_fraction", value: 0.02 }),
      expect.objectContaining({ key: "psp_crossing_casing_mode", value: "NOT_REQUIRED" }),
    ]));
    for (const parameterId of [
      "psp_crossing_casing_mode", "psp_dewatering_mode", "psp_road_restoration_mode",
    ]) {
      expect(cards.find((card) => card.key === parameterId)?.choices).toEqual([
        { value: "NOT_REQUIRED", labelRu: "Не требуется" },
        { value: "REQUIRED", labelRu: "Требуется" },
      ]);
    }

    const filledParameters = {
      ...revision.parameters,
      psp_pipe_designation: "ПНД напорная",
      psp_pipe_outside_diameter_mm: 110,
      psp_average_trench_depth_m: 1.8,
      psp_fitting_quantity_piece: 4,
      psp_isolation_valve_quantity_piece: 2,
      psp_air_valve_quantity_piece: 1,
      psp_washout_quantity_piece: 1,
    };
    const filledSession = buildConsumerCanonicalParameterSession({
      catalog,
      revision: {
        ...revision,
        revisionId: "f4c81949-d6e1-40b6-a20f-b5f2c1872d3f",
        parameters: filledParameters,
        userInputSnapshot: Object.fromEntries(
          Object.entries(filledParameters).filter(([parameterId]) =>
            !profileIds.includes(parameterId)
          ),
        ),
      },
      draftId: "pressure-sewer-100m-filled",
    });
    const filledCards = buildCanonicalParameterCards({ session: filledSession, revision: null });
    expect(filledSession.contractMissingParameterIds).toEqual([]);
    expect(filledCards).toHaveLength(54);
    expect(filledCards.find((card) => card.key === "psp_pipe_designation"))
      .toMatchObject({ value: "ПНД напорная", editable: true });
  });
});
