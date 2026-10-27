import {ct54MeasuredModelFromActualReferenceR930} from '../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import {compileCanonicalEstimateCore} from '../../lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {buildCanonicalRevisionCommitPayload} from '../../lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalEstimateStableJson} from '../../lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {ct54ReferencePublicationModelR613 as ct54IntakeModel} from '../../../scripts/estimate/r4a13/prepareCt54ReferencePublicationR613';
import ct54IntakePack from '../../../data/estimate-benchmarks/source-packs/ct54-actual-project-quantity-plan-r1.json';
import ct54IntakeReference from '../../../data/estimate-benchmarks/source-packs/ct54-manual-reference-project-system-r608.json';
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

// Prospective ordinary UI contract, SOURCE_ONLY/UNRUN. No DB, publication,
// actual project or native cold reopen is asserted by these TEST_ONLY snapshots.
function ct54IntakeCatalog(d=ct54IntakeModel('ACTUAL_PROJECT_PLAN_R1')):CanonicalEstimateCatalogItem{
 return{catalogId:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',releaseId:'TEST_ONLY_CT54_INTAKE_RELEASE',
  namespace:'global',workKey:'plaster_paint_interior_paint_wall_paint_standard',titleRu:'Окраска внутренних стен',domain:'construction',
  definitionVersion:11,applicability:{},professionalMetadata:{},parameterSchema:d.parameters.map(p=>{
   const t=p.truth_metadata,g=t.guide as Record<string,unknown>;
   return{parameterId:p.parameter_id,ordinal:p.ordinal,valueType:p.value_type,unitId:p.unit_id,titleRu:p.title_ru,
    required:p.required,defaultValue:p.default_value,constraints:p.constraints_json,semanticParameterKey:t.semantic_parameter_key,
    visibilityRole:t.visibility_role,valueSourceRole:t.value_source_role,provenance:t.provenance,
    preliminaryCompilationAllowed:t.preliminary_compilation_allowed,requiredWhen:t.required_when,visibleWhen:t.visible_when,
    formulaConsumers:t.formula_consumers,resourceBranchConsumers:t.resource_branch_consumers,
    guide:{guideKind:g.guide_kind,guideValidationPolicy:g.guide_validation_policy,sourceRole:g.source_role,
     sourceDocument:g.source_document,sourceLocator:g.source_locator,sourceSnapshotHash:g.source_snapshot_hash,
     guideShortRu:g.guide_short_ru,guideVersion:g.guide_version,applicability:g.applicability,verifiedAt:g.verified_at}} as Schema;
  })};
}
const ct54IntakeDirect=ct54IntakePack.rules.filter(v=>v.after==='DIRECT_MANUAL_UNCHANGED').map(v=>v.quantityParameterId),
 ct54IntakeFields=[...ct54IntakePack.parameters.map(v=>v.id),...ct54IntakeDirect],
 ct54IntakeRetired=ct54IntakePack.rules.filter(v=>v.after!=='DIRECT_MANUAL_UNCHANGED').map(v=>v.quantityParameterId),
 ct54IntakeConditions=Object.keys(ct54IntakeReference.conditions).filter(v=>v!=='ct54_reference_method');
function ct54IntakeUI(parameters:Record<string,string|number>={area_m2:20},missingParameterIds:string[]=[]){
 return buildConsumerCanonicalPrecompileParameterSession({catalog:ct54IntakeCatalog(),draftId:'TEST_ONLY_CT54_INTAKE',parameters,
  missingParameterIds,userExplicitParameterIds:Object.keys(parameters),textExtractedParameterIds:[]});
}
function ct54IntakeDemo():Record<string,string|number>{
 const v:Record<string,string|number>={area_m2:20,...ct54IntakeReference.conditions,
  ct54_plan_roller_stations:2,ct54_plan_mixing_stations:1,ct54_plan_wash_stations:1,ct54_plan_crew_people:3,ct54_plan_control_stations:1,
  ct54_plan_replacement_covers:1,ct54_plan_replacement_brushes:0,ct54_plan_replacement_glove_pairs:2,
  ct54_plan_wash_cycles:4,ct54_plan_fresh_l_per_wash_cycle:2,ct54_plan_meter_start_kwh:10,ct54_plan_meter_end_kwh:10.08,
  ct54_plan_collected_liquid_l:9,ct54_plan_container_usable_l:4,ct54_plan_protection_cut_length_m:5,ct54_plan_protection_cut_width_m:1.6,
  ct54_plan_extra_attachment_tape_m:1.8,ct54_plan_record_count:8,ct54_plan_records_per_sheet:6,
  ct54_reference_qty_wipes:10,ct54_reference_qty_waste_bags:2,ct54_reference_qty_whole_cycle_labour:7.5};
 for(const p of ct54IntakePack.parameters.filter(v=>v.valueType==='text'))v[p.id]='TEST_ONLY_DOCUMENT_'+p.key;
 delete v.ct54_reference_method;return v;
}
it('CT54 opt-in ordinary cards expose19independentdrivers+3directquantities+8boundedtraceIDs before fake quantities exist',()=>{
 const session=ct54IntakeUI(),cards=buildCanonicalParameterCards({session,revision:null});
 expect(ct54IntakeFields).toHaveLength(30);
 for(const id of ct54IntakeFields){
  expect(cards).toContainEqual(expect.objectContaining({key:id,value:null,editable:true,missing:true}));
  expect(session.parameters.find(v=>v.parameterId===id)?.source).not.toBe('CALCULATED');
 }
 for(const p of ct54IntakePack.parameters.filter(v=>v.valueType==='text'))
  expect(cards.find(c=>c.key===p.id)?.inputKind).toBe('text');
 expect(cards.some(c=>ct54IntakeRetired.includes(c.key)||c.key==='ct54_reference_method')).toBe(false);
 for(const id of ct54IntakeConditions)expect(cards.some(c=>c.key===id)).toBe(true);
});
it('CT54 filled actualplan fields remain editable after saved/cold JSON with no active needs or hiddenmethod visibility dependency',()=>{
 const catalog=ct54IntakeCatalog(),parameters=ct54IntakeDemo(),revision:Parameters<typeof buildConsumerCanonicalParameterSession>[0]['revision']={
  revisionId:'TEST_ONLY_CT54_UI_REVISION',parentRevisionId:null,releaseId:catalog.releaseId,catalogId:catalog.catalogId,
  definitionVersionId:'TEST_ONLY_CT54_UI_DEFINITION',definitionVersion:11,status:'ready',parameters,userInputSnapshot:parameters,
  acceptedBaselineSnapshot:{ct54_reference_method:ct54IntakeReference.conditions.ct54_reference_method},assumptionSnapshot:{},
  parameterSchemaHash:'TEST_ONLY_SCHEMA',compilerVersion:ct54IntakePack.contract,checksumSha256:'a'.repeat(64),
  createdAt:'2026-10-27T00:00:00Z',preliminaryNeeds:[]};
 const cold=JSON.parse(JSON.stringify({catalog,revision})),before=JSON.stringify(cold),
  session=buildConsumerCanonicalParameterSession({...cold,draftId:'TEST_ONLY_CT54_UI_COLD'}),cards=buildCanonicalParameterCards({session,revision:null});
 for(const id of ct54IntakeFields)expect(cards).toContainEqual(expect.objectContaining({key:id,value:parameters[id],editable:true}));
 expect(session.parameters.some(v=>v.parameterId==='ct54_reference_method')).toBe(false);
 expect(JSON.stringify(cold)).toBe(before);
 const next=consumerCanonicalPrecompileParameterOverrides({session,patches:[{operation:'set_param',paramKey:'ct54_plan_journal_reference',rawValue:'TEST_ONLY_JOURNAL_EDIT'}] as never});
 expect(next.ct54_plan_journal_reference).toBe('TEST_ONLY_JOURNAL_EDIT');
 for(const id of ct54IntakeRetired)expect(Object.hasOwn(next,id)).toBe(false);
});
it('CT54 missing numericfact or boundedtrace stays empty while an explicitly recorded replacement0 remains0',()=>{
 const values=ct54IntakeDemo();delete values.ct54_plan_replacement_covers;delete values.ct54_plan_journal_reference;
 const session=ct54IntakeUI(values,['ct54_plan_replacement_covers','ct54_plan_journal_reference']),cards=buildCanonicalParameterCards({session,revision:null});
 for(const id of ['ct54_plan_replacement_covers','ct54_plan_journal_reference'])
  expect(cards).toContainEqual(expect.objectContaining({key:id,value:null,missing:true,editable:true}));
 expect(cards).toContainEqual(expect.objectContaining({key:'ct54_plan_replacement_brushes',value:0,missing:false}));
 expect(session.blockingMissingParameterIds).toEqual(expect.arrayContaining(['ct54_plan_replacement_covers','ct54_plan_journal_reference']));
 expect(validateCanonicalEstimateParameterInputs({schema:ct54IntakeCatalog().parameterSchema,rawInputs:{...values,ct54_plan_organization_reference:''}}).issues)
  .toEqual(expect.arrayContaining([expect.objectContaining({parameterId:'ct54_plan_organization_reference'})]));
});
it.each(ct54IntakeConditions)('CT54 documentary plan does not answer actual technology condition%s in ordinary UI',id=>{
 const values=ct54IntakeDemo();delete values[id];const session=ct54IntakeUI(values,[id]),cards=buildCanonicalParameterCards({session,revision:null});
 expect(cards).toContainEqual(expect.objectContaining({key:id,value:null,editable:true,missing:true}));
 expect(session.blockingMissingParameterIds).toContain(id);
});

it('CT54 unknown numeric drivers stay numeric editable facts beside answered documentary and technology fields',()=>{
 const values=ct54IntakeDemo();for(const field of ct54IntakePack.parameters.filter(v=>v.valueType!=='text'))delete values[field.id];
 for(const id of ct54IntakeDirect)delete values[id];
 const session=ct54IntakeUI(values),cards=buildCanonicalParameterCards({session,revision:null});
 for(const field of ct54IntakePack.parameters.filter(v=>v.valueType!=='text')){
  expect(cards).toContainEqual(expect.objectContaining({key:field.id,inputKind:'number',value:null,editable:true,missing:true}));
  expect(session.parameters.find(v=>v.parameterId===field.id)?.inputOwnership).toBe('USER_INPUT');
 }
 for(const id of [...ct54IntakeConditions,...ct54IntakePack.parameters.filter(v=>v.valueType==='text').map(v=>v.id)])
  expect(cards.find(c=>c.key===id)?.value).toBe(values[id]);
 expect(session.blockingMissingParameterIds.some(id=>ct54IntakeConditions.includes(id))).toBe(false);
});
it('CT54 known workplace does not create crew data, and three direct quantity questions are missing for exact output rather than technology failures',()=>{
 const values=ct54IntakeDemo();delete values.ct54_plan_crew_people;
 const partial=ct54IntakeUI(values,['ct54_plan_crew_people']),cards=buildCanonicalParameterCards({session:partial,revision:null});
 expect(cards).toContainEqual(expect.objectContaining({key:'ct54_plan_crew_people',inputKind:'number',value:null,missing:true}));
 expect(cards.find(c=>c.key==='ct54_plan_roller_stations')?.value).toBe(2);
 const complete=ct54IntakeDemo();for(const id of ct54IntakeDirect)delete complete[id];
 const directSession=ct54IntakeUI(complete),directCards=buildCanonicalParameterCards({session:directSession,revision:null});
 for(const id of ct54IntakeDirect){expect(directCards).toContainEqual(expect.objectContaining({key:id,inputKind:'number',value:null,editable:true}));expect(directCards.find(c=>c.key===id)?.missing).toBe(true);expect(directSession.parameters.find(p=>p.parameterId===id)?.requiredLevel).toBe('BLOCKING_REQUIRED');}
});

const ct54R930OrdinaryModel=()=>ct54MeasuredModelFromActualReferenceR930({path:resolve(__dirname,'../../../data/estimate-benchmarks/fixtures/ct54-user-reference-parent-r930.json'),sha256:'e4f8534c4ba883d8d0e4414e0fe6a3bd389a29a6997d675825af303bd9db634c'});
it('CT54 R930 whole ordinary actual-reference cards expose19drivers3direct8traces without retired quantities or a hidden method edit',()=>{
 const catalog=ct54IntakeCatalog(ct54R930OrdinaryModel()),session=buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_R930_PRECOMPILE',parameters:{area_m2:20},missingParameterIds:[],userExplicitParameterIds:['area_m2'],textExtractedParameterIds:[]}),cards=buildCanonicalParameterCards({session,revision:null});
 for(const id of ct54IntakeFields)expect(cards).toContainEqual(expect.objectContaining({key:id,value:null,missing:true,editable:true}));
 for(const id of [...ct54IntakeRetired,'ct54_reference_method'])expect(cards.some(card=>card.key===id)).toBe(false);
 for(const id of ct54IntakeConditions)expect(cards).toContainEqual(expect.objectContaining({key:id,value:null,missing:true,editable:true}));
});
it('CT54 R930 whole actual Core to existing saved mapper to cold ordinary cards preserves measured facts and original technology facts',async()=>{
 const model=ct54R930OrdinaryModel(),catalog=ct54IntakeCatalog(model),submitted=ct54IntakeDemo(),hashJson=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex'),
  compiled=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:ct54IntakePack.contract,catalogId:catalog.catalogId,primaryMeasureParameterId:'area_m2',parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:submitted,confirmedParameters:{ct54_reference_method:ct54IntakeReference.conditions.ct54_reference_method},priceItems:[],currencyCode:'KGS',maximumResourceRows:31,hashJson}),
  checksum=hashJson(compiled.revisionProjection),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:ct54IntakePack.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:submitted,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds});
 const isRecord=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 if(!isRecord(commit.resolvedParameters))throw Error('TEST_ONLY_COMMIT_RESOLVED_PARAMETERS_REQUIRED');
 const revision:Parameters<typeof buildConsumerCanonicalParameterSession>[0]['revision']={revisionId:'TEST_ONLY_R930_UI_REVISION',parentRevisionId:null,releaseId:catalog.releaseId,catalogId:catalog.catalogId,definitionVersionId:'TEST_ONLY_R930_DERIVED_CANDIDATE_NOT_PUBLISHED',definitionVersion:11,status:'ready',parameters:commit.resolvedParameters,userInputSnapshot:submitted,acceptedBaselineSnapshot:null,assumptionSnapshot:null,parameterSchemaHash:'TEST_ONLY_R930_SCHEMA',compilerVersion:ct54IntakePack.contract,checksumSha256:checksum,createdAt:'2026-10-28T00:00:00Z',preliminaryNeeds:[]};
 const cold=JSON.parse(JSON.stringify({catalog,revision})),before=JSON.stringify(cold),session=buildConsumerCanonicalParameterSession({...cold,draftId:'TEST_ONLY_R930_COLD'}),cards=buildCanonicalParameterCards({session,revision:null});
 expect(compiled.rows).toHaveLength(31);expect(compiled.preliminaryNeeds).toHaveLength(0);
 for(const id of [...ct54IntakeFields,...ct54IntakeConditions])expect(cards).toContainEqual(expect.objectContaining({key:id,value:submitted[id],editable:true}));
 expect(cards.some(card=>card.key==='ct54_reference_method')).toBe(false);expect(JSON.stringify(cold)).toBe(before);
});
