import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import source from '../../../../data/estimate-benchmarks/source-packs/facade-current-family-whole-systems-r3.json';
import {facadePorcelainProfileR59 as profile,facadePorcelainPrimaryR59 as area,facadePorcelainChoiceR59 as porcelainChoice,
  facadePorcelainDefinitionR59 as childDefinition,facadePorcelainCompletenessR59 as childCompleteness,
  facadePorcelainGeometryR59 as geometry,facadePorcelainSourceFactsR59 as profileFacts} from './facadePorcelainWholeR59';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {PRIMARY_MEASURE_SELECTION_V1,assertCanonicalPrimaryMeasureSelectionV1,
  type PrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {isFormulaGraphExactDecimal,compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {MasterRetainedParentCaptureR1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';

// SOURCE-ONLY continuation of the exact current v6 existing NVF owner.
// The standalone porcelain card remains HOLD. Native R3/R59 identities,
// source quantities, public names and independent whole-method map are reused.
// This composition has no current SQL/core/publication acceptance.
export const facadeVentilatedPorcelainCatalogR214='canonical-work:expanded:ventilated_facade';
export const facadeVentilatedPorcelainSelectorR214='ventilated_cladding_exact_source_profile';
export const facadeVentilatedPorcelainChoiceR214=porcelainChoice;
export const facadeVentilatedPorcelainAreaR214=area;
const selector=facadeVentilatedPorcelainSelectorR214,choice=facadeVentilatedPorcelainChoiceR214;
const capturePath='../../../../data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json';
const captureSha='6906232983df646806484a2d131b8c546ff2dd7739140e3d9ccc7000ae8b5652';
const contract='gox.facade.ventilated.porcelain-existing-owner/r214';
const selected={kind:'equals' as const,parameterId:selector,value:choice};
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail:(message:string)=>never=message=>{throw Object.assign(new Error(message),{code:'PARAMETER_VALIDATION_FAILED'});};

type ExactSourceCaptureR55=Readonly<{
  definition:MasterRetainedParentCaptureR1['definition'];baseline:MasterRetainedParentCaptureR1['baseline'];
  parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources'];
  bindings:MasterRetainedParentCaptureR1['bindings'];normativeSources:MasterRetainedParentCaptureR1['normativeSources'];
  normativeLocators:MasterRetainedParentCaptureR1['normativeLocators'];
}>;
type ExactSourceParentR55=Readonly<{catalogId:string;capture:ExactSourceCaptureR55;
  contentPassport:Readonly<Record<string,unknown>>;approvedSourceDefinition:MasterRetainedParentCaptureR1['definition']}>;
type ExactSourcePacketR55=Readonly<{readOnly:true;databaseWrites:0;sameRawFullRowsReadTwice:true;
  currentParents:readonly ExactSourceParentR55[]}>;

/** The same immutable v6 packet already captured for the existing facade.
 * A typed packet does not replace the normal/locked DB preimage checks. */
export function facadeVentilatedPorcelainCapturedParentR214():ExactSourceParentR55{
  const bytes=readFileSync(resolve(__dirname,capturePath));
  if(createHash('sha256').update(bytes).digest('hex')!==captureSha)fail('PORCELAIN_VENT_EXACT_CAPTURE_FILE_SHA_REQUIRED');
  const packet:ExactSourcePacketR55=JSON.parse(bytes.toString('utf8'));
  if(packet.readOnly!==true||packet.databaseWrites!==0||packet.sameRawFullRowsReadTwice!==true
    ||packet.currentParents.length!==1)fail('PORCELAIN_VENT_EXACT_READONLY_CAPTURE_REQUIRED');
  const parent=packet.currentParents[0];if(!parent)fail('PORCELAIN_VENT_ONE_CURRENT_OWNER_REQUIRED');
  const c=parent.capture;
  if(parent.catalogId!==facadeVentilatedPorcelainCatalogR214||c.definition.catalog_id!==parent.catalogId
    ||c.definition.id!=='301c5e16-0784-51ea-a6a0-cb6f889c464d'||c.definition.definition_version!==6
    ||c.definition.definition_sha256!=='80779fb8df0eea0ecd2fadb6b50454dabc89807a2c9ff73fb0e204bf8a09d572'
    ||c.baseline.id!=='c38ed3f7-db9f-5924-9a97-08529dc969b8'||c.baseline.definition_version_id!==c.definition.id
    ||c.parameters.length!==52||c.formulas.length!==76||c.resources.length!==76||c.bindings.length!==4
    ||parent.contentPassport.definition_version_id!==c.definition.id||parent.contentPassport.catalog_id!==parent.catalogId)
    fail('PORCELAIN_VENT_CURRENT_PARENT_IDENTITY_OR_SHAPE_DRIFT');
  return structuredClone(parent);
}

function capturedPrimary(c:ExactSourceCaptureR55):PrimaryMeasureSelectionV1{
  const metadata:unknown=c.definition.applicability.primaryMeasureSelectionV1;
  if(!record(metadata)||metadata.contract!==PRIMARY_MEASURE_SELECTION_V1||metadata.selectorParameterId!==selector
    ||!Array.isArray(metadata.selections)||metadata.selections.length!==3)fail('PORCELAIN_VENT_CAPTURED_THREE_SELECTIONS_REQUIRED');
  const selections=metadata.selections.map((item:unknown)=>{
    if(!record(item)||typeof item.selectorValue!=='string'||typeof item.primaryMeasureParameterId!=='string'||item.unitId!=='m2')
      fail('PORCELAIN_VENT_CAPTURED_PRIMARY_ENTRY_REQUIRED');
    return{selectorValue:item.selectorValue,primaryMeasureParameterId:item.primaryMeasureParameterId,unitId:item.unitId};
  });
  const expected=['facade_area_m2','ventilated_thermowood_net_area_m2','ventilated_hpl_net_area_m2'];
  if(selections.some((item,index)=>item.primaryMeasureParameterId!==expected[index]||item.selectorValue===choice)
    ||new Set(selections.map(item=>item.selectorValue)).size!==3)fail('PORCELAIN_VENT_CAPTURED_PRIMARY_IDENTITY_DRIFT');
  return{contract:PRIMARY_MEASURE_SELECTION_V1,selectorParameterId:selector,selections};
}

export function facadeVentilatedPorcelainPrimarySelectionR214():PrimaryMeasureSelectionV1{
  const base=capturedPrimary(facadeVentilatedPorcelainCapturedParentR214().capture);
  return{...base,selections:[...base.selections,{selectorValue:choice,primaryMeasureParameterId:area,unitId:'m2'}]};
}

/** Direct native IDs, because the source-level disjoint native closure has no parent
 * collisions. Do not namespace partially mapped provenance/owner metadata.
 * No HPL/Thermo formula, default or accepted object fact supplies porcelain. */
export function facadeVentilatedPorcelainDefinitionR214():AutomaticOwnerDefinition{
  const c=facadeVentilatedPorcelainCapturedParentR214().capture,selection=capturedPrimary(c),child=childDefinition();
  const oldParameterIds=new Set(c.parameters.map(p=>p.parameter_id)),oldFormulaIds=new Set(c.formulas.map(f=>f.formula_id));
  const oldRowIds=new Set(c.resources.map(r=>r.row_id));
  if(child.parameters.some(p=>oldParameterIds.has(p.parameter_id))||child.formulas.some(f=>oldFormulaIds.has(f.formula_id))
    ||child.resources.some(r=>oldRowIds.has(r.row_id)))fail('PORCELAIN_VENT_NATIVE_IDENTIFIERS_MUST_BE_DISJOINT');
  const parent:AutomaticOwnerDefinition={parameters:c.parameters.map(p=>{
    if(p.parameter_id!==selector)return p;
    const values=p.constraints_json?.values,guide=p.truth_metadata.guide;
    if(!Array.isArray(values)||values.length!==3||values.some((value,index)=>value!==selection.selections[index]?.selectorValue)
      ||!record(guide)||p.truth_metadata.visibility_role!=='USER_INPUT'||p.default_value!==null)
      fail('PORCELAIN_VENT_EXISTING_PUBLIC_SELECTOR_REQUIRED');
    return{...p,constraints_json:{...p.constraints_json,values:[...values,choice]},truth_metadata:{...p.truth_metadata,
      guide:{...guide,source_document:profile.sourceId,source_snapshot_hash:source.sources.find(s=>s.key==='TN-VHF')!.sha256,
        source_locator:String(guide.source_locator??'')+';ST-KG-V-T;visible clamps;porcelain10;MW100;TCtables15–16;STOtable5.3',
        guide_short_ru:'Выберите сохранённый расчёт либо готовый исходный способ облицовки фасада.'}}};
  }),formulas:c.formulas,resources:c.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:c.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)};
  const scoped:AutomaticOwnerDefinition={...child,parameters:child.parameters.map(p=>geometry.some(id=>id===p.parameter_id)
    ?{...p,truth_metadata:{...p.truth_metadata,visible_when:selected}}:p)};
  const joined=appendOptionalAutomaticOwnerR1({parent,child:scoped,when:selected});
  const consumers=buildMasterParameterCalculationConsumers(joined);
  return{...joined,ordinaryParameterIds:[...parent.ordinaryParameterIds,...geometry],parameters:joined.parameters.map(p=>({...p,
    truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],
      resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}

/** Original independent method map, not an expectation generated from rows. */
export function facadeVentilatedPorcelainCompletenessR214(){
  const passport=facadeVentilatedPorcelainCapturedParentR214().contentPassport,decision=passport.decision;
  if(!record(decision)||!record(decision.independentCompletenessMap))fail('PORCELAIN_VENT_CAPTURED_COMPLETENESS_REQUIRED');
  const old=decision.independentCompletenessMap,own=childCompleteness();
  const entries=old.entries;if(!Array.isArray(entries))fail('PORCELAIN_VENT_CAPTURED_COMPLETENESS_ENTRIES_REQUIRED');
  return{...old,entries:[...entries,...own.entries],componentMaps:[old,own],
    generatedFromCurrentRows:false,fullTechnicalAcceptance:false,newFULL:0};
}


/** Server-owned readback envelope, not project authentication. Missing actual
 * BOM/PPR/base/pullout/layout facts remain missing. No universal project values
 * or Table15 crew size are inferred from geometry or the published stock. */
export type FacadeVentilatedPorcelainReadbackR214=Readonly<{
  sourceKey:'gox_facade_ventilated_porcelain_whole_r3';sourceArtifactSha256:string;
  netFacadeAreaM2:string;documentSha256:string;documentReference:string;
  values:Readonly<Record<string,unknown>>;
}>;
const exactProfileFacts=profileFacts();
const projectTextIds=['porcelain_approved_structural_project','porcelain_ppr_reference','porcelain_KG_scope_acceptance',
  'porcelain_anchor_pullout_report','porcelain_approved_node_fire_BOM'] as const;
const decimalFactIds=['porcelain_base_density_kg_m3','porcelain_approved_layout_surface_m2'] as const;
const provisionModes=['Собственное обеспечение на период ППР','Услуга обеспечения на период ППР','Новая поставка для рабочего фронта'] as const;

function sourceFacts(input:Record<string,unknown>,readback?:FacadeVentilatedPorcelainReadbackR214):Record<string,unknown>{
  const result:Record<string,unknown>={...exactProfileFacts};
  if(!readback)return result;
  const net=input[area],primary=source.sources.find(s=>s.key==='TN-VHF');
  if(!primary||readback.sourceKey!==profile.sourceId||readback.sourceArtifactSha256!==primary.sha256
    ||typeof readback.netFacadeAreaM2!=='string'||!isFormulaGraphExactDecimal(readback.netFacadeAreaM2)
    ||(typeof net!=='string'&&typeof net!=='number')||!isFormulaGraphExactDecimal(net)
    ||cmp(net,readback.netFacadeAreaM2)!==0||!/^[0-9a-f]{64}$/iu.test(readback.documentSha256)
    ||typeof readback.documentReference!=='string'||!readback.documentReference.trim()
    ||readback.documentReference.length>4096||!record(readback.values))
    fail('PORCELAIN_VENT_SAME_SOURCE_GEOMETRY_READBACK_DOCUMENT_REQUIRED');
  for(const[id,value]of Object.entries(readback.values)){
    if(Object.hasOwn(exactProfileFacts,id)){
      const facts:Readonly<Record<string,string>>=exactProfileFacts;
      if(value!==facts[id])fail('PORCELAIN_VENT_EXACT_SOURCE_PROFILE_FACT_MISMATCH');
    }else if(projectTextIds.some(key=>key===id)){
      if(typeof value!=='string'||!value.trim()||value.length>4096)fail('PORCELAIN_VENT_PROJECT_DOCUMENT_TEXT_REQUIRED');
    }else if(decimalFactIds.some(key=>key===id)){
      if(typeof value!=='string'||!isFormulaGraphExactDecimal(value)||cmp(value,'0')<0)
        fail('PORCELAIN_VENT_PROJECT_DECIMAL_FACT_REQUIRED');
    }else if(id==='porcelain_published_stock_links'){
      if(typeof value!=='string'||!/^\+?[0-9]+$/u.test(value)||cmp(value,'1')<0)
        fail('PORCELAIN_VENT_ACTUAL_PPR_LINK_COUNT_REQUIRED');
    }else if(id==='porcelain_tools_mode'){
      if(typeof value!=='string'||!provisionModes.some(mode=>mode===value))fail('PORCELAIN_VENT_EXPLICIT_PPR_PROVISION_MODE_REQUIRED');
    }else{
      const component=profile.projectComponents.find((component:{parameterId:string;unitId:string})=>component.parameterId===id);
      if(!component||typeof value!=='string'||!isFormulaGraphExactDecimal(value)||cmp(value,'0')<0
        ||component.unitId==='piece'&&!/^\+?[0-9]+$/u.test(value))fail('PORCELAIN_VENT_EXACT_NATIVE_COMPONENT_BOM_VALUE_REQUIRED');
    }
    result[id]=value;
  }
  return result;
}
function schema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[]{return model.parameters.map(p=>{
  const truth=p.truth_metadata,provenance=truth.provenance,consumers=truth.formula_consumers;
  if(typeof truth.visibility_role!=='string'||typeof truth.value_source_role!=='string'||(provenance!==undefined&&!record(provenance))
    ||!Array.isArray(consumers)||!consumers.every((id:unknown)=>typeof id==='string'))fail('PORCELAIN_VENT_PRIMARY_SCHEMA_SHAPE_REQUIRED');
  return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:truth.visibility_role,
    valueSourceRole:truth.value_source_role,provenance,constraints:p.constraints_json??undefined,formulaConsumers:consumers};
});}
export type FacadeVentilatedPorcelainCompileOptionsR214=Readonly<{
  readback?:FacadeVentilatedPorcelainReadbackR214;parentPrimaryMeasure?:unknown;
  rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];priceItems?:CanonicalEstimateCompileCoreInput['priceItems'];
  hashJson?:CanonicalEstimateCompileCoreInput['hashJson'];
}>;
/** Existing primary-measure guard and canonical input contract, before core. */
export function facadeVentilatedPorcelainCompileInputR214(input:Record<string,unknown>,options:FacadeVentilatedPorcelainCompileOptionsR214={}):CanonicalEstimateCompileCoreInput{
  if(input[selector]!==choice||Object.keys(input).some(id=>id!==selector&&!geometry.some(key=>key===id)))
    fail('PORCELAIN_VENT_PUBLIC_SOURCE_CHOICE_AND_GEOMETRY_ONLY');
  const model=facadeVentilatedPorcelainDefinitionR214();
  const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:facadeVentilatedPorcelainPrimarySelectionR214(),
    submittedParameters:input,parameterSchema:schema(model),parentPrimaryMeasure:options.parentPrimaryMeasure});
  if(primary.kind!=='RESOLVED')fail('PORCELAIN_VENT_EXPLICIT_PRIMARY_SELECTION_REQUIRED');
  return{operation:'recalculate',compilerVersion:contract,catalogId:facadeVentilatedPorcelainCatalogR214,
    primaryMeasureParameterId:primary.primaryMeasure.parameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],
    resourceDefinitions:[...model.resources],submittedParameters:input,confirmedParameters:sourceFacts(input,options.readback),
    rowOverrides:options.rowOverrides??{},priceItems:options.priceItems??[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:options.hashJson??hash};
}
export function compileFacadeVentilatedPorcelainExistingR214(input:Record<string,unknown>,options:FacadeVentilatedPorcelainCompileOptionsR214={}){
  return compileCanonicalEstimateCore(facadeVentilatedPorcelainCompileInputR214(input,options));
}
