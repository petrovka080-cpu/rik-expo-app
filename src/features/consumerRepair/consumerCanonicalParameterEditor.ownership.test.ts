import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import { buildConsumerCanonicalPrecompileParameterSession, buildConsumerCanonicalParameterSession, consumerCanonicalPrecompileParameterOverrides } from "./consumerCanonicalParameterEditor";
import publishedMasonry from '../../../data/estimate-benchmarks/fixtures/master33-masonry-published-editor-regression-r1.json';
import { consumerCanonicalMigrationUserParameters } from "./consumerCanonicalReleaseMigration";
import { buildCanonicalParameterCards } from "../../lib/estimatePresentation/buildCanonicalParameterCards";
import {validateCanonicalEstimateParameterInputs} from '../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation';

type Schema = CanonicalEstimateCatalogItem["parameterSchema"][number];

type PublishedEditorCase = {caseId:string;catalogId:string;revision:Parameters<typeof buildConsumerCanonicalParameterSession>[0]['revision']};
it.each(publishedMasonry.cases as unknown as PublishedEditorCase[])(
  'keeps the actual published scope choice and measured geometry editable after save and cold read: $caseId', scenario => {
    const actualCatalog = (publishedMasonry.catalogs as unknown as Record<string,CanonicalEstimateCatalogItem>)[scenario.catalogId]!;
    const before = JSON.stringify({actualCatalog,scenario});
    const session = buildConsumerCanonicalParameterSession({catalog:actualCatalog,revision:scenario.revision,draftId:'published-editor-regression'});
    const cards = buildCanonicalParameterCards({session,revision:null});
    const required = ['m33_masonry_source_system','m33_masonry_wall_length_m','m33_masonry_wall_height_m',
      'm33_masonry_openings_area_m2','m33_masonry_nonmasonry_insert_volume_m3','m33_masonry_storey_height_m'];
    expect(cards).toEqual(expect.arrayContaining(required.map(key=>expect.objectContaining({key,editable:true}))));
    expect(cards.every(card=>card.key.startsWith('m33_masonry_'))).toBe(true);
    expect(cards.some(card=>card.key.includes('unresolved_')||card.inputOwnership==='APPLICATION')).toBe(false);
    const primary = cards.find(card=>card.key==='m33_masonry_wall_length_m')!;
    expect(String(primary.value)).toBe(String(scenario.revision.userInputSnapshot?.[primary.key]));
    expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[{operation:'set_param',paramKey:primary.key,rawValue:'8'}] as never})[primary.key]).toBe('8');
    const cold = buildConsumerCanonicalParameterSession({catalog:actualCatalog,revision:scenario.revision,draftId:'published-editor-regression'});
    expect(buildCanonicalParameterCards({session:cold,revision:null})).toEqual(cards);
    expect(scenario.revision.preliminaryNeeds).toHaveLength(8);
    expect(JSON.stringify({actualCatalog,scenario})).toBe(before);
  },
);
const guide: NonNullable<Schema["guide"]> = { guideKind: "PROJECT_DEFINED", guideValidationPolicy: "MANDATORY_BLOCK", sourceRole: "PROJECT_DOCUMENTATION",
  guideShortRu: "Укажите фактические условия объекта", guideVersion: "test-v1", applicability: "Actual project facts", verifiedAt: "2026-10-10",
  sourceDocument: "approved-project", sourceLocator: "Actual site and supply", sourceSnapshotHash: "a".repeat(64) };
const stock = { parameterId: "stock", semanticParameterKey: "work:stock", titleRu: "Пригодный запас", ordinal: 1,
  valueType: "integer", unitId: "pcs", required: true, defaultValue: null, constraints: { min: 0 },
  visibilityRole: "USER_INPUT", valueSourceRole: "PROJECT_SPECIFIC_INPUT", formulaConsumers: ["order"], resourceBranchConsumers: ["material"], guide } as Schema;
const reference = { ...stock, parameterId: "stock_reference", semanticParameterKey: "work:stock_reference", ordinal: 2,
  titleRu: "Расход и совместимость запаса по документу проекта", valueType: "text", unitId: null, required: false,
  valueSourceRole: "CONDITIONAL_PROJECT_FACT", formulaConsumers: [],
  constraints: { minLength: 1, maxLength: 1000, requiredWhen: { kind: "greater_than", parameterId: "stock", value: 0 } } } as Schema;
const catalog = (schema: Schema[]): CanonicalEstimateCatalogItem => ({ catalogId: "ownership-integration", releaseId: "release",
  namespace: "global", workKey: "ownership-integration", titleRu: "Установка материала", domain: "landscape", definitionVersion: 1,
  applicability: {}, professionalMetadata: {}, parameterSchema: schema });
const build = (schema: Schema[], parameters: Record<string, string | number> = {}, missingParameterIds: string[] = []) =>
  buildConsumerCanonicalPrecompileParameterSession({ catalog: catalog(schema), draftId: "ownership-regression", parameters, missingParameterIds,
    userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [] });

it("keeps a renamed project question reachable and inactive stock references hidden even with stale needs", () => {
  for (const titleRu of [reference.titleRu, "Нормальные условия запаса", "Количество: документ запаса", "Условие = запас пригоден"]) {
    const schema = [stock, { ...reference, titleRu }];
    expect(build(schema, { stock: 0 }, [reference.parameterId]).parameters.some(p => p.parameterId === reference.parameterId)).toBe(false);
    const positive = build(schema, { stock: 1 }, [reference.parameterId]);
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)).toMatchObject({ resourceSelectionInput: true });
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)?.label).toMatch(/[А-Яа-яЁё]/u);
    expect(positive.parameters.find(p => p.parameterId === reference.parameterId)?.label).not.toBe("");
    expect(consumerCanonicalPrecompileParameterOverrides({ session: positive, patches: [{ operation: "set_param", paramKey: reference.parameterId, rawValue: "Паспорт партии 17" }] as never }))
      .toEqual({ stock: 1, stock_reference: "Паспорт партии 17" });
  }
});

it("does not expose protected sources through active needs or a benign label and excludes them from migration", () => {
  const norm = { ...stock, parameterId: "labor_rate", semanticParameterKey: "work:labor_rate", titleRu: "Площадь объекта",
    valueSourceRole: "UNRESOLVED_APPLICATION_NORM", provenance: { consumer_input_role_v1: "OBJECT_FACT" } } as Schema;
  expect(build([stock, reference, norm], { stock: 1 }, [norm.parameterId]).parameters.some(p => p.parameterId === norm.parameterId)).toBe(false);
  expect(consumerCanonicalMigrationUserParameters(catalog([stock, reference, norm]), { stock: 1, stock_reference: "Паспорт партии 17", labor_rate: 8 }))
    .toEqual({ stock: 1, stock_reference: "Паспорт партии 17" });
});

it('keeps measured thickness editable when its bound resource consumers are reached through derived formulas',()=>{
  const thickness={...stock,parameterId:'layer_thickness_mm',semanticParameterKey:'work:layer_thickness_mm',
    titleRu:'Толщина штукатурного слоя, мм',valueType:'decimal',unitId:'mm',valueSourceRole:'USER_INPUT',
    formulaConsumers:[],resourceBranchConsumers:['mixture','labor'],constraints:{min:.001,max:20},
    guide:{...guide,guideKind:'MEASUREMENT_RULE',sourceRole:'USER_INPUT'}}as Schema;
  const session=build([thickness],{layer_thickness_mm:10.5});
  const cards=buildCanonicalParameterCards({session,revision:null});
  expect(cards).toEqual([expect.objectContaining({key:'layer_thickness_mm',value:10.5,editable:true})]);
  expect(session.parameters[0].validation).toMatchObject({min:.001,max:20});
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[{operation:'set_param',paramKey:'layer_thickness_mm',rawValue:'10,25'}]as never}))
    .toEqual({layer_thickness_mm:'10,25'});
  expect(validateCanonicalEstimateParameterInputs({schema:[thickness],rawInputs:{layer_thickness_mm:20.1}}).issues)
    .toEqual([{code:'MAX',parameterId:'layer_thickness_mm'}]);
  for(const changed of [
    {...thickness,resourceBranchConsumers:[]},
    {...thickness,valueSourceRole:'UNRESOLVED_APPLICATION_NORM'},
    {...thickness,guide:{...thickness.guide!,guideKind:'MANDATORY_NORM_VALUE',sourceRole:'PRIMARY_SOURCE_NORM'}},
  ]as Schema[])expect(build([changed],{layer_thickness_mm:10.5}).parameters).toEqual([]);
});

it("retains a supplied optional project branch in actual cards and pending Apply without making it required", () => {
  const choice = { ...stock, parameterId: "mechanism_fulfillment", semanticParameterKey: "work:mechanism_fulfillment",
    titleRu: "Нормальные условия = свой или арендованный механизм", valueType: "enum", unitId: null, required: false,
    valueSourceRole: "CONDITIONAL_PROJECT_FACT", constraints: { values: ["own", "hired"] }, formulaConsumers: [] } as Schema;
  const saved = build([choice], { mechanism_fulfillment: "own" });
  expect(saved.parameters[0].requiredLevel).toBe("OPTIONAL");
  expect(buildCanonicalParameterCards({ session: saved, revision: null })).toEqual([expect.objectContaining({ key: choice.parameterId, value: "own" })]);
  expect(consumerCanonicalPrecompileParameterOverrides({ session: saved, patches: [] })).toEqual({ mechanism_fulfillment: "own" });
  expect(consumerCanonicalPrecompileParameterOverrides({ session: saved, patches: [{ operation: "set_param", paramKey: choice.parameterId, rawValue: "hired" }] as never }))
    .toEqual({ mechanism_fulfillment: "hired" });
  const legacyDocument = { ...choice, parameterId: "product_profile_id", semanticParameterKey: undefined, valueSourceRole: "PROJECT_SPECIFIC_INPUT", guide: undefined } as Schema;
  expect(build([legacyDocument]).parameters).toEqual([]);
});

it("distinguishes the two measured facade areas and retains safe generic wording for an internal title", () => {
  const area = { ...stock, parameterId: 'q', semanticParameterKey: 'work:q', valueType: 'decimal',
    unitId: 'm2', valueSourceRole: 'USER_MEASURED', titleRu: 'Площадь окраски за вычетом проёмов, м²' } as Schema;
  const gross = { ...area, parameterId: 'facade_norm_area_m2', semanticParameterKey: 'work:gross',
    titleRu: 'Площадь фасада вместе с проёмами, м²' } as Schema;
  const cards = buildCanonicalParameterCards({ session: build([area, gross]), revision: null });
  expect(cards.map(c => c.labelRu)).toEqual([area.titleRu, gross.titleRu]);
  expect(build([{ ...area, titleRu: 'q_m2' }]).parameters[0].label).toBe('Объем работ');
  const protectedArea = { ...area, valueSourceRole: 'UNRESOLVED_APPLICATION_NORM' } as Schema;
  expect(build([protectedArea], {}, ['q']).parameters).toEqual([]);
});
