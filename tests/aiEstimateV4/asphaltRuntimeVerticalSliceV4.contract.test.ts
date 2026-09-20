import fs from "node:fs";
import path from "node:path";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type { EstimateDraftRevisionParam } from "../../src/lib/estimate/estimateDraftRevisionContract";
import {
  ASPHALT_V4_RUNTIME_TEMPLATE_ID,
} from "../../src/lib/estimate/v4/asphalt";
import {
  ASPHALT_PHASE1_COMPLETE_PARAMETERS,
  ASPHALT_PHASE1_CONTROL_TEXT,
} from "./fixtures/asphaltPhase1.fixture";

const CREATED_AT = "2026-07-22T10:00:00.000Z";

function completeRuntimeOverrides(): Record<string, EstimateDraftRevisionParam> {
  const values: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(ASPHALT_PHASE1_COMPLETE_PARAMETERS)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") values[key] = value;
  }
  values.asphalt_layer_count = ASPHALT_PHASE1_COMPLETE_PARAMETERS.asphalt_layers.length;
  ASPHALT_PHASE1_COMPLETE_PARAMETERS.asphalt_layers.forEach((layer, index) => {
    values[`asphalt_layer_${index + 1}_mixture_type`] = layer.mixture_type;
    values[`asphalt_layer_${index + 1}_thickness_mm`] = layer.thickness_mm;
    values[`asphalt_layer_${index + 1}_density_t_m3`] = layer.density_t_m3;
    values[`asphalt_layer_${index + 1}_waste_percent`] = layer.waste_percent;
  });
  values.crushed_layer_count = ASPHALT_PHASE1_COMPLETE_PARAMETERS.crushed_layers.length;
  ASPHALT_PHASE1_COMPLETE_PARAMETERS.crushed_layers.forEach((layer, index) => {
    values[`crushed_layer_${index + 1}_fraction`] = layer.fraction;
    values[`crushed_layer_${index + 1}_thickness_mm`] = layer.thickness_mm;
    values[`crushed_layer_${index + 1}_compaction_factor`] = layer.compaction_factor;
    values[`crushed_layer_${index + 1}_waste_percent`] = layer.waste_percent;
  });
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {
    value,
    source: "edited_by_user" as const,
    lastChangedAt: CREATED_AT,
  }]));
}

function completeRevision() {
  return createEstimateDraftRevision({
    rawInput: ASPHALT_PHASE1_CONTROL_TEXT,
    createdAt: CREATED_AT,
    paramOverrides: completeRuntimeOverrides(),
  });
}

describe("Asphalt V4 runtime vertical slice", () => {
  test.each([
    [undefined, "free-text"],
    ["asphalt_concrete_pavement", "selected canonical work"],
  ])("keeps ambiguous asphalt scope fail-closed for %s (%s)", (selectedWorkKey, _label) => {
    const rawInput = "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — 15 000 м";
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput,
      currency: "KGS",
      selectedWorkKey,
    });

    expect(result).toMatchObject({
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "road_scope_selection_required",
      roadScopeResolution: {
        resolverStatus: "NEEDS_SCOPE_SELECTION",
        originalText: rawInput,
        selectedScopeId: null,
      },
    });
    expect(result.parseResult.extractedParams.length_m).toEqual(expect.objectContaining({
      value: 15000,
      canonicalUnit: "m",
    }));
  });

  test("does not replace missing width with reference area after scope selection", () => {
    const rawInput = "Дороги, транспорт и площадки: устройство асфальтобетонного покрытия — 15 000 м";
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput,
      selectedWorkKey: "asphalt_concrete_pavement",
      paramOverrides: {
        selectedRoadScope: { value: "ROAD_SURFACING_ONLY", source: "user_input" },
      },
    });

    expect(result).toMatchObject({
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "ROAD_GEOMETRY_REQUIRED",
      roadScopeResolution: {
        resolverStatus: "RESOLVED",
        selectedScopeId: "ROAD_SURFACING_ONLY",
      },
    });
    expect(result.v4ClarificationExperience?.understood).toEqual(expect.arrayContaining([
      expect.objectContaining({ label_ru: "Длина участка", value_ru: "15 000 м" }),
    ]));
    expect(result.v4ClarificationExperience?.critical_required.map((item) => item.parameter_id))
      .toEqual(expect.arrayContaining([
        "asphalt_concrete_pavement:parameter:geometry_method:v4",
        "asphalt_concrete_pavement:parameter:width_m:v4",
      ]));
  });

  test("requires an explicit main measure when area conflicts with length and width", () => {
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput: "Уложить асфальт по готовому основанию: площадь 1000 м², длина 100 м, ширина 8 м",
      selectedWorkKey: "asphalt_concrete_pavement",
    });

    expect(result).toMatchObject({
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "ROAD_GEOMETRY_CONFLICT",
    });
  });

  test.each([
    ["asphalt_concrete_pavement", "Устройство цементобетонного дорожного покрытия длина 100 м ширина 6 м"],
    ["cement_concrete_pavement", "Устройство асфальтобетонного покрытия длина 100 м ширина 6 м"],
  ])("blocks a catalog/text surface conflict for %s", (selectedWorkKey, rawInput) => {
    const result = buildEstimateFromInlineWorkPrompt({ rawInput, selectedWorkKey });

    expect(result).toMatchObject({
      draft: null,
      canBuildPreliminaryEstimate: false,
      blockingReason: "ROAD_SURFACE_TECHNOLOGY_CONFLICT",
      roadSurfaceTechnologyResolution: {
        status: "CONFLICT",
        conflictId: "ROAD_SURFACE_TECHNOLOGY_CONFLICT",
        messageRu: expect.stringContaining("противоречит"),
      },
    });
  });

  test("enters through natural language without an explicit template id", () => {
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput: ASPHALT_PHASE1_CONTROL_TEXT,
      currency: "KGS",
    });

    expect(result.canBuildPreliminaryEstimate).toBe(true);
    const rowCodes = result.draft?.items.map((item) => item.sourceParameters?.rowCode) ?? [];
    expect(rowCodes).toEqual(expect.arrayContaining([
      "asphalt_layer_1_material",
      "asphalt_layer_1_paving",
      "asphalt_layer_2_material",
      "asphalt_layer_2_paving",
      "asphalt_layer_1_delivery",
      "asphalt_layer_2_delivery",
    ]));
    expect(rowCodes.length).toBeGreaterThan(0);
    expect(result.draft?.items.every((item) => item.templateId === ASPHALT_V4_RUNTIME_TEMPLATE_ID)).toBe(true);
    expect(result.v4ClarificationExperience?.heading_ru).toBe("Я понял");
  });

  test("persists V4 identity, human parameter cards and work-specific clarification", () => {
    const revision = completeRevision();
    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    const visibleText = cards.map((card) => `${card.labelRu} ${card.displayValueRu}`).join(" ");

    expect(revision.selectedTemplateId).toBe(ASPHALT_V4_RUNTIME_TEMPLATE_ID);
    expect(revision.matchedFamily).toBe("asphalt_concrete_pavement");
    expect(revision.professionalClarification?.heading_ru).toBe("Я понял");
    expect(cards.some((card) => card.key === "asphalt_layer_1_thickness_mm" && card.unitRu === "мм")).toBe(true);
    expect(cards.some((card) => card.key === "asphalt_layer_1_density_t_m3" && card.unitRu === "т/м³")).toBe(true);
    expect(visibleText).not.toMatch(/PRELIMINARY_BOQ|scope driver|revision[_ ]id|work[_ ]id/iu);
  });

  test("recalculates only the first layer and dependent logistics after a thickness edit", () => {
    const initial = completeRevision();
    const result = applyAiEstimateParameterOverride({
      revision: initial,
      operation: "update_param",
      paramKey: "asphalt_layer_1_thickness_mm",
      rawValue: "80",
      createdAt: "2026-07-22T10:01:00.000Z",
    });
    const changed = new Set(result.diff.changedRows.map((row) => row.rowId));

    expect(changed).toEqual(new Set([
      "asphalt_layer_1_delivery",
      "asphalt_layer_1_material",
      "asphalt_layer_1_truck_trips",
      "dump_trucks_layer_1",
    ]));
    expect(result.revision.boq.rows.find((row) => row.rowId === "asphalt_layer_2_material")?.quantity)
      .toBe(initial.boq.rows.find((row) => row.rowId === "asphalt_layer_2_material")?.quantity);
    expect(result.revision.artifacts.pdfArtifactId).toBeNull();
    expect(result.revision.artifacts.buyerHandoffId).toBeNull();
  });

  test("renders the same revision to PDF and a procurement-only buyer handoff", () => {
    const revision = completeRevision();
    const pdf = renderPdfFromDraftRevision({ revision });
    const buyer = createBuyerHandoffFromDraftRevision({ revision, snapshot: pdf.snapshot });
    const procurementIds = revision.boq.rows.filter((row) => row.includedInProcurement).map((row) => row.rowId).sort();

    expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
    expect(pdf.pdf.body).toContain("Асфальтобетонная смесь для нижнего связующего слоя");
    expect(pdf.pdf.body).toContain("Стоимость не рассчитана");
    expect(pdf.pdf.body).not.toContain("Итого: 0 сом");
    expect(buyer.buyerHandoff.items.map((item) => item.rowId).sort()).toEqual(procurementIds);
    expect(buyer.buyerHandoff.items.every((item) => item.normId && item.normSourceId)).toBe(true);
    expect(buyer.buyerHandoff.forbiddenWorkRowsPresent).toBe(false);
    expect(buyer.buyerHandoff.revisionId).toBe(revision.revisionId);
    expect(buyer.buyerHandoff.rowsHash).toBe(pdf.pdf.rowsHash);
  });

  test("shows contextual controls and the understood/priority groups in the shared Web/Android panel", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx"),
      "utf8",
    );

    expect(source).toContain("request-estimate-asphalt-v4-understood");
    expect(source).toContain("Критически необходимо уточнить");
    expect(source).toContain("Рекомендуется уточнить");
    expect(source).toContain("Можно оставить допущением");
    expect(source).toContain("editable-param-options-");
    expect(source).not.toContain('placeholder="Новое значение"');
  });
});
