import capture from "../../../data/estimate-benchmarks/fixtures/master24-ordinary-geometry-current-catalogs-r1.json";
import type { CanonicalEstimateCatalogItem, CanonicalEstimateParameterInputValue } from "../../lib/estimate/backendPlatform/contracts";
import {buildCanonicalBaselinePlan} from "../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1";
import { buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides } from "./consumerCanonicalParameterEditor";
import { buildCanonicalParameterCards } from "../../lib/estimatePresentation/buildCanonicalParameterCards";

const catalogs = capture.items as unknown as Record<"compact" | "bridge" | "ceiling", CanonicalEstimateCatalogItem>;

it("maps the ordinary compaction area to the passport's active measure, retaining unrelated unresolved obligations", () => {
  const catalog = catalogs.compact;
  expect(catalog.applicability?.primaryMeasureParameterId).toBe("r567_compaction_area_m2");
  let parameters: Record<string, unknown>;
  let missing: string[] = [];
  try {
    parameters = buildCanonicalBaselinePlan({ catalog,
      prompt: "Уплотнение асфальтобетонного покрытия тремя катками, площадь 1000 м², толщина 60 мм." }).parameters;
  } catch (error) {
    const gap = error as Error & { parameters: Record<string, unknown>; missingParameterIds: string[] };
    if (gap.name !== "CanonicalBaselineContractMissingError") throw error;
    parameters = gap.parameters;
    missing = gap.missingParameterIds;
  }
  expect(String(parameters.r567_compaction_area_m2)).toBe("1000");
  expect(parameters).not.toHaveProperty("area_m2");
  expect(missing).not.toContain("r567_compaction_area_m2");
});

it("uses both explicitly stated asphalt layer thicknesses instead of the lower-layer profile assumption", () => {
  const catalog = catalogs.bridge;
  const before = JSON.stringify(catalog);
  const plan = buildCanonicalBaselinePlan({ catalog,
    prompt: "Устройство полной системы асфальтобетонного покрытия мостового полотна. Длина 20 м, ширина 10 м, площадь 200 м²; нижний слой 40 мм, верхний слой 30 мм." });
  expect(String(plan.parameters.area_m2)).toBe("200");
  expect(String(plan.parameters.bridge_length_m)).toBe("20");
  expect(String(plan.parameters.bridge_width_m)).toBe("10");
  expect(String(plan.parameters.binder_layer_thickness_mm)).toBe("40");
  expect(String(plan.parameters.wearing_layer_thickness_mm)).toBe("30");
  expect(Object.keys(plan.parameters).sort()).toEqual([
    "area_m2", "binder_layer_thickness_mm", "bridge_length_m", "bridge_width_m", "wearing_layer_thickness_mm",
  ]);
  expect(JSON.stringify(catalog)).toBe(before);
});

it("accepts ordinary P112.1 geometry without submitting a derived area or validation-fixture inputs", () => {
  const catalog = catalogs.ceiling;
  const before = JSON.stringify(catalog);
  const plan = buildCanonicalBaselinePlan({ catalog,
    prompt: "Потолок ГКЛ П112.1: усиленный каркас и один слой. Длина помещения 20 м, ширина помещения 15 м, площадь потолка 300 м², высота потолка от пола 3 м, опуск потолка 0,1 м." });
  expect(String(plan.parameters.room_length_m)).toBe("20");
  expect(String(plan.parameters.room_width_m)).toBe("15");
  expect(String(plan.parameters.ceiling_height_m)).toBe("3");
  expect(String(plan.parameters.ceiling_drop_m)).toBe("0.1");
  expect(Object.keys(plan.parameters).sort()).toEqual([
    "ceiling_drop_m", "ceiling_height_m", "room_length_m", "room_width_m",
  ]);
  expect(JSON.stringify(catalog)).toBe(before);
});

it.each([
  ['Прямоугольное помещение 10×10 м, высота готового потолка 3 м, опуск 0,1 м.', '10', '10'],
  ['Комната 1125 х 1000 см, высота готового потолка от пола 300 см, опуск 10 см.', '11.25', '10'],
])('accepts the measured room rectangle and finished ceiling height: %s', (prompt, length, width) => {
  const catalog = catalogs.ceiling, before = JSON.stringify(catalog);
  const plan = buildCanonicalBaselinePlan({ catalog, prompt });
  expect(plan.parameters).toEqual({ room_length_m: length, room_width_m: width,
    ceiling_height_m: '3', ceiling_drop_m: '0.1' });
  expect(JSON.stringify(catalog)).toBe(before);
});

it.each([
  'Листы ГСП 1200×2500 мм. Высота готового потолка 3 м, опуск 0,1 м.',
  'Помещение 10×10×3 м, опуск 0,1 м.',
  'Комната 10×10 м и комната 20×15 м. Высота готового потолка 3 м, опуск 0,1 м.',
])('does not guess room dimensions from product sizes or ambiguous rectangles: %s', prompt => {
  const plan = buildCanonicalBaselinePlan({ catalog: catalogs.ceiling, prompt });
  // Missing geometry remains a preliminary calculation under this passport.
  // The text extractor must leave these fields absent rather than invent them.
  expect(plan.parameters).not.toHaveProperty('room_length_m');
  expect(plan.parameters).not.toHaveProperty('room_width_m');
});

it("keeps the sourced direct-hanger geometry limit when an invalid drop is explicitly supplied", () => {
  const catalog = catalogs.ceiling;
  expect(catalog.parameterSchema.find(parameter => parameter.parameterId === "ceiling_drop_m")?.constraints.max).toBe(0.15);
  expect(() => buildCanonicalBaselinePlan({ catalog,
    prompt: "Длина помещения 20 м, ширина помещения 15 м, высота потолка от пола 3 м, опуск потолка 0,25 м." })).toThrow();
});

it('opens the existing editable precompile form for an invalid supplied ceiling drop and retains the rejected value',()=>{
  const catalog=catalogs.ceiling,before=JSON.stringify(catalog);
  let captured:unknown;
  try{buildCanonicalBaselinePlan({catalog,prompt:'Длина помещения 20 м, ширина 15 м, высота потолка от пола 3 м, опуск потолка 250 мм.'});}
  catch(error){captured=error;}
  expect(captured).toBeInstanceOf(Error);
  const error=captured as Error&{parameters:Record<string,CanonicalEstimateParameterInputValue>;missingParameterIds:string[]};
  expect(error.name).toBe('CanonicalBaselineContractMissingError');
  expect(error.missingParameterIds).toEqual(['ceiling_drop_m']);
  expect(String(error.parameters.ceiling_drop_m)).toBe('0.25');
  const session=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_INVALID_DROP',
    parameters:error.parameters,missingParameterIds:error.missingParameterIds});
  expect(session.status).toBe('INVALID');
  expect(session.invalidParameterIds).toContain('ceiling_drop_m');
  const cards=buildCanonicalParameterCards({session,revision:null});
  expect(cards.some(card=>card.key==='ceiling_drop_m')).toBe(true);
  const corrected=buildCanonicalBaselinePlan({catalog,prompt:'Длина помещения 20 м, ширина 15 м, высота потолка от пола 3 м, опуск потолка 250 мм.',
    parameterOverrides:{ceiling_drop_m:'0.1'}});
  expect(String(corrected.parameters.ceiling_drop_m)).toBe('0.1');
  expect(catalog.parameterSchema.find(parameter=>parameter.parameterId==='ceiling_drop_m')!.constraints.max).toBe(0.15);
  expect(JSON.stringify(catalog)).toBe(before);
});

it.each([['0,1','0.1'],[' 0.10 ','0.10'],['0,100000000000000001','0.100000000000000001']])(
  'normalizes a precompile geometry edit %s through the existing validator without losing decimal digits',(rawValue,expected)=>{
    const catalog=catalogs.ceiling,prompt='Длина помещения 20 м, ширина 15 м, высота потолка от пола 3 м, опуск потолка 250 мм.';
    const session=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_DECIMAL_TRANSPORT',
      parameters:{room_length_m:'20',room_width_m:'15',ceiling_height_m:'3',ceiling_drop_m:'0.25'},
      missingParameterIds:['ceiling_drop_m']});
    const before=JSON.stringify(session);
    const parameterOverrides=consumerCanonicalPrecompileParameterOverrides({session,
      patches:[{operation:'update_param',paramKey:'ceiling_drop_m',rawValue}]});
    const plan=buildCanonicalBaselinePlan({catalog,prompt,parameterOverrides});
    expect(plan.parameters.ceiling_drop_m).toBe(expected);
    expect(Object.keys(plan.parameters).sort()).toEqual(['ceiling_drop_m','ceiling_height_m','room_length_m','room_width_m']);
    expect(JSON.stringify(session)).toBe(before);
  },
);

it.each(["role", "classification", "inputRole", "sourceHash", "consumers"])(
  "does not identify an unproven legacy internal primary measure after changing %s", field => {
    const catalog = structuredClone(catalogs.ceiling);
    const primary = catalog.parameterSchema.find(parameter => parameter.parameterId === "area_m2")!;
    if (field === "role") primary.valueSourceRole = "BACKEND_DERIVED";
    if (field === "classification") primary.runtimeProfileClassification = "ASSUMPTION";
    if (field === "inputRole") primary.provenance = {};
    if (field === "sourceHash") primary.guide = { ...primary.guide!, sourceSnapshotHash: "" };
    if (field === "consumers") primary.formulaConsumers = [];
    expect(() => buildCanonicalBaselinePlan({ catalog,
      prompt: "Длина помещения 20 м, ширина помещения 15 м, высота потолка от пола 3 м, опуск потолка 0,1 м.",
    })).toThrow("CANONICAL_PRIMARY_MEASURE_NOT_RESOLVED");
  },
);

it("keeps editable geometry while removing legacy consumption norms from the consumer parameter cards", () => {
  const catalog = catalogs.bridge;
  const before = JSON.stringify(catalog);
  const savedStates: Record<string, CanonicalEstimateParameterInputValue>[] = [{}, {
    bridge_reinforcement_mesh_kg_per_m2: 4.44, bridge_continuous_tack_coat_rate_l_per_m2: 0.3,
  }];
  for (const parameters of savedStates) {
    const session = buildConsumerCanonicalPrecompileParameterSession({ catalog, draftId: "TEST_ONLY_MASTER24",
      parameters, missingParameterIds: [], userExplicitParameterIds: [], textExtractedParameterIds: [] });
    const cards = buildCanonicalParameterCards({ session, revision: null });
    const ids = cards.map(card => card.key);
    expect(ids).toContain("binder_layer_thickness_mm");
    expect(ids).toContain("wearing_layer_thickness_mm");
    expect(ids).toContain("bridge_length_m");
    expect(ids).toContain("bridge_width_m");
    for (const id of ["bridge_reinforcement_mesh_kg_per_m2", "bridge_continuous_tack_coat_rate_l_per_m2"]) {
      expect(catalog.parameterSchema.some(parameter => parameter.parameterId === id)).toBe(true);
      expect(ids).not.toContain(id);
    }
  }
  expect(JSON.stringify(catalog)).toBe(before);
});
