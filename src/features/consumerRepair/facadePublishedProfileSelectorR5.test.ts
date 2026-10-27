import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import type {CanonicalEstimateCatalogItem,CanonicalEstimateParameterInputValue} from '../../lib/estimate/backendPlatform/contracts';
import {buildConsumerCanonicalPrecompileParameterSession,consumerCanonicalPrecompileParameterOverrides,
  isConsumerMeaningfulCanonicalParameter} from './consumerCanonicalParameterEditor';
import {canonicalParameterVisibilityMissingParameterIds,resolveCanonicalParameterVisibility,
  type CanonicalParameterVisibilityCondition} from '../../lib/estimate/canonicalParameters/canonicalParameterCore';
import {buildCanonicalParameterCards} from '../../lib/estimatePresentation/buildCanonicalParameterCards';

type Schema=CanonicalEstimateCatalogItem['parameterSchema'][number];
const selectorId='ventilated_cladding_exact_source_profile';
const fixturePath='data/estimate-benchmarks/fixtures/facade-ventilated-actual-catalog-r51.json';
const fixtureSha='6907966c6d6f8c3ac449ef1c924e974d317c62c076968305c76b1680b8d795b6';
const areaHpl='ventilated_hpl_net_area_m2',areaThermo='ventilated_thermowood_net_area_m2';
// Exact actual owner-API response from R51. Known immutable bytes are decoded
// into the existing catalog type; no factory-shaped mock or inferred source norm.
function actualCatalog():CanonicalEstimateCatalogItem {
  const bytes=readFileSync(resolve(__dirname,'../../..',fixturePath));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),fixtureSha);
  const item:CanonicalEstimateCatalogItem=JSON.parse(bytes.toString('utf8'));
  assert.equal(item.catalogId,'canonical-work:expanded:ventilated_facade');
  assert.equal(item.releaseId,'e0fa744d-0d47-5068-9ebb-8bda0b8b1bbd');
  assert.equal(item.definitionVersion,6);assert.equal(item.parameterSchema.length,52);
  return item;
}
function parameter(item:CanonicalEstimateCatalogItem,id:string):Schema {
  const found=item.parameterSchema.find(p=>p.parameterId===id);assert(found,'ACTUAL_SCHEMA_REQUIRED:'+id);return found;
}
function choice(item:CanonicalEstimateCatalogItem,index:number):string {
  const values=parameter(item,selectorId).constraints.values;
  assert(Array.isArray(values)&&values.length===3);const selected:unknown=values[index];assert.equal(typeof selected,'string');
  assert(typeof selected==='string');return selected;
}
function build(catalog:CanonicalEstimateCatalogItem,parameters:Record<string,CanonicalEstimateParameterInputValue>,missingParameterIds:readonly string[]=[]) {
  return buildConsumerCanonicalPrecompileParameterSession({catalog,draftId:'TEST_ONLY_R51_PUBLISHED_FACADE_SELECTOR',parameters,
    missingParameterIds,userExplicitParameterIds:Object.keys(parameters),textExtractedParameterIds:[],createdAt:'2026-10-24T00:00:00Z'});
}
function catalogWithChangedParameter(changed:Schema,originalId:string):CanonicalEstimateCatalogItem {
  const source=actualCatalog();return {...source,parameterSchema:source.parameterSchema.map(p=>p.parameterId===originalId?changed:p)};
}
function assertRejected(changed:Schema,originalId:string=selectorId):void {
  expect(isConsumerMeaningfulCanonicalParameter(changed)).toBe(false);
  const source=catalogWithChangedParameter(changed,originalId),value=choice(actualCatalog(),2);
  const input:Record<string,CanonicalEstimateParameterInputValue>={[selectorId]:value,[areaHpl]:'20'};input[changed.parameterId]=value;
  const session=build(source,input,[changed.parameterId]);
  expect(session.parameters.some(p=>p.parameterId===changed.parameterId)).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[]})).not.toHaveProperty(changed.parameterId);
}

it.each([{name:'compact panel',index:2,areaId:areaHpl,area:'20'},{name:'thermowood',index:1,areaId:areaThermo,area:'30'}])(
  'exports both actual published ready choice and its one area: $name',scenario=>{
    const catalog=actualCatalog(),before=JSON.stringify(catalog),selected=choice(catalog,scenario.index),schema=parameter(catalog,selectorId);
    expect(schema.visibilityRole).toBe('USER_INPUT');expect(schema.valueType).toBe('enum');
    expect(schema.resourceBranchConsumers).toHaveLength(76);expect(schema.guide).toMatchObject({guideKind:'MEASUREMENT_RULE',sourceRole:'USER_SUPPLIED_PRIMARY_FACT',guideValidationPolicy:'MANDATORY_BLOCK'});
    expect(isConsumerMeaningfulCanonicalParameter(schema)).toBe(true);
    const input={[selectorId]:selected,[scenario.areaId]:scenario.area},session=build(catalog,input);
    expect(session.parameters.map(p=>p.parameterId).sort()).toEqual(Object.keys(input).sort());
    const choiceParameter=session.parameters.find(p=>p.parameterId===selectorId);assert(choiceParameter?.requiredCondition);
    expect(choiceParameter.visibilityCondition).toEqual({kind:'ALWAYS'});
    expect(choiceParameter.requiredCondition).toEqual({kind:'INCLUSION_GRAPH',ast:schema.constraints.requiredWhen});
    expect(resolveCanonicalParameterVisibility(choiceParameter.requiredCondition,new Map([[selectorId,selected]]))).toBe(scenario.index===1);
    const exported=consumerCanonicalPrecompileParameterOverrides({session,patches:[]});
    expect(Object.keys(exported).sort()).toEqual(Object.keys(input).sort());expect(exported[selectorId]).toBe(selected);expect(Number(exported[scenario.areaId])).toBe(Number(scenario.area));
    const cards=buildCanonicalParameterCards({session,revision:null});
    expect(cards.map(p=>p.key).sort()).toEqual(Object.keys(input).sort());expect(cards.every(p=>p.editable&&/[А-Яа-яЁё]/u.test(p.labelRu))).toBe(true);
    expect(JSON.stringify(catalog)).toBe(before);
  },30000);

it('keeps actual technical project facts and unresolved needs hidden even when raw values and active needs name them',()=>{
  const catalog=actualCatalog(),protectedIds=['panel_fixing_actual_total_points','panel_fixing_approved_project','panel_fixing_layout_sha256',
    'panel_fixing_exact_source','panel_fixing_unknown_whole_fixing_labour'];
  for(const id of protectedIds)expect(parameter(catalog,id).visibilityRole).toBe('INTERNAL_ONLY');
  const input:Record<string,CanonicalEstimateParameterInputValue>={[selectorId]:choice(catalog,2),[areaHpl]:'20',
    panel_fixing_actual_total_points:56,panel_fixing_approved_project:'TEST_ONLY NOT A REAL APPROVAL',panel_fixing_layout_sha256:'a'.repeat(64),
    panel_fixing_exact_source:'ca7e72d5335e4963c85a327a0b6a2f6cfb5bdf29842cfc1e6f43e89d4dfead22',panel_fixing_unknown_whole_fixing_labour:1};
  const session=build(catalog,input,protectedIds),exported=consumerCanonicalPrecompileParameterOverrides({session,patches:[]});
  expect(session.parameters.map(p=>p.parameterId).sort()).toEqual([selectorId,areaHpl].sort());
  expect(Object.keys(exported).sort()).toEqual([selectorId,areaHpl].sort());
  for(const id of protectedIds){expect(session.parameters.some(p=>p.parameterId===id)).toBe(false);expect(exported).not.toHaveProperty(id);}
},30000);

it('shows the missing initial ready choice without selecting a branch or inventing an exported value',()=>{
  const catalog=actualCatalog(),session=build(catalog,{}),choiceParameter=session.parameters.find(p=>p.parameterId===selectorId);
  expect(session.parameters.map(p=>p.parameterId)).toEqual([selectorId]);assert(choiceParameter?.requiredCondition);
  expect(choiceParameter.value).toBeNull();expect(choiceParameter.visibilityCondition).toEqual({kind:'ALWAYS'});
  expect(choiceParameter.requiredCondition).toEqual({kind:'INCLUSION_GRAPH',ast:parameter(catalog,selectorId).constraints.requiredWhen});
  expect(canonicalParameterVisibilityMissingParameterIds(choiceParameter.requiredCondition,new Map())).toEqual([selectorId]);
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[]})).toEqual({});
},30000);

it('keeps explicit visibleWhen=false authoritative even for the admitted self-dependent ready enum',()=>{
  const catalog=actualCatalog(),schema=parameter(catalog,selectorId),changed:Schema={...schema,visibleWhen:{kind:'literal',value:false}};
  expect(isConsumerMeaningfulCanonicalParameter(changed)).toBe(true);
  const session=build(catalogWithChangedParameter(changed,selectorId),{[selectorId]:choice(catalog,2),[areaHpl]:'20'});
  expect(session.parameters.some(p=>p.parameterId===selectorId)).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[]})).not.toHaveProperty(selectorId);
},30000);

it('retains an external measured-area condition rather than granting the self-only visibility exemption',()=>{
  const catalog=actualCatalog(),schema=parameter(catalog,selectorId),selected=choice(catalog,2);
  for(const [expectedArea,visible]of [[999,false],[20,true]] as const){
    const changed:Schema={...schema,constraints:{...schema.constraints,requiredWhen:{kind:'equals',parameterId:areaHpl,value:expectedArea}}};
    expect(isConsumerMeaningfulCanonicalParameter(changed)).toBe(true);
    const session=build(catalogWithChangedParameter(changed,selectorId),{[selectorId]:selected,[areaHpl]:'20'}),actual=session.parameters.find(p=>p.parameterId===selectorId);
    expect(Boolean(actual)).toBe(visible);
    if(actual){expect(actual.visibilityCondition).toEqual({kind:'PARAMETER_EQUALS',parameterId:areaHpl,value:expectedArea});
      expect(actual.requiredCondition).toEqual(actual.visibilityCondition);}
    expect(Object.hasOwn(consumerCanonicalPrecompileParameterOverrides({session,patches:[]}),selectorId)).toBe(visible);
  }
},30000);

it('does not exempt a valid self plus external dependency even when the field is an admitted enum',()=>{
  const catalog=actualCatalog(),schema=parameter(catalog,selectorId),legacy=choice(catalog,0);
  const condition={kind:'and' as const,operands:[{kind:'equals' as const,parameterId:selectorId,value:legacy},
    {kind:'equals' as const,parameterId:areaHpl,value:999}]};
  const shared:CanonicalParameterVisibilityCondition={kind:'INCLUSION_GRAPH',ast:condition};
  expect(canonicalParameterVisibilityMissingParameterIds(shared,new Map()).sort()).toEqual([selectorId,areaHpl].sort());
  const changed:Schema={...schema,constraints:{...schema.constraints,requiredWhen:condition}};
  expect(isConsumerMeaningfulCanonicalParameter(changed)).toBe(true);
  const session=build(catalogWithChangedParameter(changed,selectorId),{[selectorId]:choice(catalog,2),[areaHpl]:'20'});
  expect(session.parameters.some(p=>p.parameterId===selectorId)).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[]})).not.toHaveProperty(selectorId);
},30000);

it('does not grant the enum exemption to an actual public measured numeric field with a false self condition',()=>{
  const catalog=actualCatalog(),source=parameter(catalog,areaHpl),{visibleWhen:_explicit,...withoutVisibleWhen}=source;
  const changed:Schema={...withoutVisibleWhen,constraints:{...source.constraints,requiredWhen:{kind:'equals',parameterId:areaHpl,value:999}}};
  expect(changed.valueType).toBe('decimal');expect(isConsumerMeaningfulCanonicalParameter(changed)).toBe(true);
  const session=build(catalogWithChangedParameter(changed,areaHpl),{[selectorId]:choice(catalog,2),[areaHpl]:'20'});
  expect(session.parameters.some(p=>p.parameterId===areaHpl)).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({session,patches:[]})).not.toHaveProperty(areaHpl);
},30000);

it('preserves the existing protected norm and application-technical ownership guards',()=>{
  const schema=parameter(actualCatalog(),selectorId),guide=schema.guide;assert(guide);
  const changed:Schema[]=[{...schema,visibilityRole:'INTERNAL_ONLY'},
    {...schema,provenance:{...schema.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'}},
    {...schema,valueSourceRole:'UNRESOLVED_APPLICATION_NORM'},
    {...schema,guide:{...guide,guideKind:'MANDATORY_NORM_VALUE'}}];
  for(const entry of changed)assertRejected(entry);
},30000);
