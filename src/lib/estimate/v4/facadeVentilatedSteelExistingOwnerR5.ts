import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {facadeSteelSidingPackR2 as steel,facadeSteelSidingPrimaryR2 as area} from './facadeSteelSidingKrer15R2';
import {facadeSteelSidingDefinitionR59 as childDefinition,facadeSteelSidingCompletenessR59 as childCompleteness} from './facadeSteelSidingWholeR59';
import type {AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {appendOptionalAutomaticOwnerR1} from './optionalAutomaticOwnerCompositionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {PRIMARY_MEASURE_SELECTION_V1,assertCanonicalPrimaryMeasureSelectionV1,
  type PrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1} from '../backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {isFormulaGraphExactDecimal,compareFormulaGraphDecimals as cmp} from '../backendPlatform/formulaGraph';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {MasterRetainedParentCaptureR1} from '../../../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';

// SOURCE-ONLY R59/R167 continuation of the exact retained R57 composition.
// The standalone append remains HOLD. Reuse the current whole child public
// names and independent map in the same existing NVF owner, without new IDs.
// Old R57 evidence is retained separately; this changed composition is UNRUN.
export const facadeVentilatedSteelCatalogR5='canonical-work:expanded:ventilated_facade';
export const facadeVentilatedSteelSelectorR5='ventilated_cladding_exact_source_profile';
export const facadeVentilatedSteelChoiceR5='Стальной сайдинг с утеплением на исходной металлической подсистеме';
export const facadeVentilatedSteelAreaR5=area;
const selector=facadeVentilatedSteelSelectorR5,choice=facadeVentilatedSteelChoiceR5;
const capturePath='../../../../data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json';
const captureSha='6906232983df646806484a2d131b8c546ff2dd7739140e3d9ccc7000ae8b5652';
const sourceConditions='ИСХОДНЫЕ_НОРМАЛЬНЫЕ_УСЛОВИЯ_КРЕР15_ПРИНЯТЫ_ПРОЕКТОМ';
const contract='gox.facade.ventilated.steel-existing-owner/r5';
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
export function facadeVentilatedSteelCapturedParentR5():ExactSourceParentR55{
  const bytes=readFileSync(resolve(__dirname,capturePath));
  if(createHash('sha256').update(bytes).digest('hex')!==captureSha)fail('STEEL_VENT_EXACT_CAPTURE_FILE_SHA_REQUIRED');
  const packet:ExactSourcePacketR55=JSON.parse(bytes.toString('utf8'));
  if(packet.readOnly!==true||packet.databaseWrites!==0||packet.sameRawFullRowsReadTwice!==true
    ||packet.currentParents.length!==1)fail('STEEL_VENT_EXACT_READONLY_CAPTURE_REQUIRED');
  const parent=packet.currentParents[0];if(!parent)fail('STEEL_VENT_ONE_CURRENT_OWNER_REQUIRED');
  const c=parent.capture;
  if(parent.catalogId!==facadeVentilatedSteelCatalogR5||c.definition.catalog_id!==parent.catalogId
    ||c.definition.id!=='301c5e16-0784-51ea-a6a0-cb6f889c464d'||c.definition.definition_version!==6
    ||c.definition.definition_sha256!=='80779fb8df0eea0ecd2fadb6b50454dabc89807a2c9ff73fb0e204bf8a09d572'
    ||c.baseline.id!=='c38ed3f7-db9f-5924-9a97-08529dc969b8'||c.baseline.definition_version_id!==c.definition.id
    ||c.parameters.length!==52||c.formulas.length!==76||c.resources.length!==76||c.bindings.length!==4
    ||parent.contentPassport.definition_version_id!==c.definition.id||parent.contentPassport.catalog_id!==parent.catalogId)
    fail('STEEL_VENT_CURRENT_PARENT_IDENTITY_OR_SHAPE_DRIFT');
  return structuredClone(parent);
}

function capturedPrimary(c:ExactSourceCaptureR55):PrimaryMeasureSelectionV1{
  const metadata:unknown=c.definition.applicability.primaryMeasureSelectionV1;
  if(!record(metadata)||metadata.contract!==PRIMARY_MEASURE_SELECTION_V1||metadata.selectorParameterId!==selector
    ||!Array.isArray(metadata.selections)||metadata.selections.length!==3)fail('STEEL_VENT_CAPTURED_THREE_SELECTIONS_REQUIRED');
  const selections=metadata.selections.map((item:unknown)=>{
    if(!record(item)||typeof item.selectorValue!=='string'||typeof item.primaryMeasureParameterId!=='string'||item.unitId!=='m2')
      fail('STEEL_VENT_CAPTURED_PRIMARY_ENTRY_REQUIRED');
    return{selectorValue:item.selectorValue,primaryMeasureParameterId:item.primaryMeasureParameterId,unitId:item.unitId};
  });
  const expected=['facade_area_m2','ventilated_thermowood_net_area_m2','ventilated_hpl_net_area_m2'];
  if(selections.some((item,index)=>item.primaryMeasureParameterId!==expected[index]||item.selectorValue===choice)
    ||new Set(selections.map(item=>item.selectorValue)).size!==3)fail('STEEL_VENT_CAPTURED_PRIMARY_IDENTITY_DRIFT');
  return{contract:PRIMARY_MEASURE_SELECTION_V1,selectorParameterId:selector,selections};
}

export function facadeVentilatedSteelPrimarySelectionR5():PrimaryMeasureSelectionV1{
  const base=capturedPrimary(facadeVentilatedSteelCapturedParentR5().capture);
  return{...base,selections:[...base.selections,{selectorValue:choice,primaryMeasureParameterId:area,unitId:'m2'}]};
}

/** Direct native IDs, because the source-level disjoint native closure has no parent
 * collisions. Do not namespace partially mapped provenance/owner metadata.
 * No HPL/Thermo formula, default or accepted object fact supplies steel. */
export function facadeVentilatedSteelDefinitionR5():AutomaticOwnerDefinition{
  const c=facadeVentilatedSteelCapturedParentR5().capture,selection=capturedPrimary(c),child=childDefinition();
  const oldParameterIds=new Set(c.parameters.map(p=>p.parameter_id)),oldFormulaIds=new Set(c.formulas.map(f=>f.formula_id));
  const oldRowIds=new Set(c.resources.map(r=>r.row_id));
  if(child.parameters.some(p=>oldParameterIds.has(p.parameter_id))||child.formulas.some(f=>oldFormulaIds.has(f.formula_id))
    ||child.resources.some(r=>oldRowIds.has(r.row_id)))fail('STEEL_VENT_NATIVE_IDENTIFIERS_MUST_BE_DISJOINT');
  const parent:AutomaticOwnerDefinition={parameters:c.parameters.map(p=>{
    if(p.parameter_id!==selector)return p;
    const values=p.constraints_json?.values,guide=p.truth_metadata.guide;
    if(!Array.isArray(values)||values.length!==3||values.some((value,index)=>value!==selection.selections[index]?.selectorValue)
      ||!record(guide)||p.truth_metadata.visibility_role!=='USER_INPUT'||p.default_value!==null)
      fail('STEEL_VENT_EXISTING_PUBLIC_SELECTOR_REQUIRED');
    return{...p,constraints_json:{...p.constraints_json,values:[...values,choice]},truth_metadata:{...p.truth_metadata,
      guide:{...guide,source_document:steel.sourceId,source_snapshot_hash:steel.source.sha256,
        source_locator:String(guide.source_locator??'')+';КРЕР15-2015;15-01-065-01;PDF118–119;original whole steel method',
        guide_short_ru:'Выберите сохранённый расчёт либо готовый исходный способ облицовки фасада.'}}};
  }),formulas:c.formulas,resources:c.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},
    ordinaryParameterIds:c.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)};
  const scoped:AutomaticOwnerDefinition={...child,parameters:child.parameters.map(p=>p.parameter_id===area
    ?{...p,truth_metadata:{...p.truth_metadata,visible_when:selected}}:p)};
  const joined=appendOptionalAutomaticOwnerR1({parent,child:scoped,when:selected});
  const consumers=buildMasterParameterCalculationConsumers(joined);
  return{...joined,ordinaryParameterIds:[...parent.ordinaryParameterIds,area],parameters:joined.parameters.map(p=>({...p,
    truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],
      resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}))};
}

/** Original independent method map, not an expectation generated from rows. */
export function facadeVentilatedSteelCompletenessR5(){
  const passport=facadeVentilatedSteelCapturedParentR5().contentPassport,decision=passport.decision;
  if(!record(decision)||!record(decision.independentCompletenessMap))fail('STEEL_VENT_CAPTURED_COMPLETENESS_REQUIRED');
  const old=decision.independentCompletenessMap,own=childCompleteness();
  const entries=old.entries;if(!Array.isArray(entries))fail('STEEL_VENT_CAPTURED_COMPLETENESS_ENTRIES_REQUIRED');
  return{...old,entries:[...entries,...own.entries],componentMaps:[old,own],
    generatedFromCurrentRows:false,fullTechnicalAcceptance:false,newFULL:0};
}

/** An already-authorized internal import envelope, not document authentication
 * and never a public questionnaire. It may contain a partial actual BOM.
 * Omitting source/project/fulfilment facts leaves the native need unresolved. */
export type FacadeVentilatedSteelReadbackR5=Readonly<{
  sourceNormId:'15-01-065-01';sourceSha256:string;netFacadeAreaM2:string;projectDocumentSha256:string;
  approvedProjectReference:string;projectBasis?:string;methodConformanceDeclaration?:string;productionConditions?:string;
  projectBOM?:Readonly<Record<string,string>>;
  machineFulfilment?:Readonly<Record<string,'own'|'hired'>>;
}>;

export function sourceFacts(input:Record<string,unknown>,readback:FacadeVentilatedSteelReadbackR5):Record<string,unknown>{
  const net=input[area];
  if((typeof net!=='string'&&typeof net!=='number')||!isFormulaGraphExactDecimal(net)||cmp(net,'0')<=0
    ||typeof readback.netFacadeAreaM2!=='string'||!isFormulaGraphExactDecimal(readback.netFacadeAreaM2)
    ||cmp(net,readback.netFacadeAreaM2)!==0||readback.sourceNormId!==steel.normId||readback.sourceSha256!==steel.source.sha256
    ||!/^[0-9a-f]{64}$/iu.test(readback.projectDocumentSha256)||typeof readback.approvedProjectReference!=='string'
    ||!readback.approvedProjectReference.trim()||readback.approvedProjectReference.length>4096)
    fail('STEEL_VENT_SAME_EXACT_SOURCE_GEOMETRY_DOCUMENT_REQUIRED');
  const result:Record<string,unknown>={approved_facade_project_reference:readback.approvedProjectReference};
  if(readback.projectBasis!==undefined){if(readback.projectBasis!==steel.projectBasisValue)fail('STEEL_VENT_PROJECT_BASIS_SOURCE_MISMATCH');
    result.kg_project_basis=readback.projectBasis;}
  if(readback.methodConformanceDeclaration!==undefined){if(readback.methodConformanceDeclaration!==steel.sourceFitValue)fail('STEEL_VENT_METHOD_CONFORMANCE_SOURCE_MISMATCH');
    result.source_system_conformance=readback.methodConformanceDeclaration;}
  if(readback.productionConditions!==undefined){if(readback.productionConditions!==sourceConditions)fail('STEEL_VENT_SOURCE_CONDITIONS_MISMATCH');
    result.source_conditions=readback.productionConditions;}
  if(readback.projectBOM!==undefined){
    if(!record(readback.projectBOM))fail('STEEL_VENT_PROJECT_BOM_RECORD_REQUIRED');
    for(const[id,value]of Object.entries(readback.projectBOM)){
      const row=steel.rows.find(row=>row.projectQuantityKey===id);
      if(!row||typeof value!=='string'||!isFormulaGraphExactDecimal(value)||cmp(value,'0')<0
        ||row.unitId==='piece'&&!/^[+]?[0-9]+$/u.test(value))fail('STEEL_VENT_EXACT_NATIVE_PROJECT_BOM_VALUE_REQUIRED');
      result[id]=value;
    }
  }
  if(readback.machineFulfilment!==undefined){
    if(!record(readback.machineFulfilment))fail('STEEL_VENT_MACHINE_FULFILMENT_RECORD_REQUIRED');
    for(const[key,mode]of Object.entries(readback.machineFulfilment)){
      const machine=steel.rows.find(row=>row.category==='equipment'&&row.key===key);
      if(!machine||(mode!=='own'&&mode!=='hired'))fail('STEEL_VENT_EXACT_NATIVE_MACHINE_FULFILMENT_REQUIRED');
      result['machine_fulfillment_'+machine.key.replaceAll('-','_')]=steel.machineFulfillmentChoices[mode];
    }
  }
  return result;
}

function schema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[]{return model.parameters.map(p=>{
  const truth=p.truth_metadata,provenance=truth.provenance,consumers=truth.formula_consumers;
  if(typeof truth.visibility_role!=='string'||typeof truth.value_source_role!=='string'||(provenance!==undefined&&!record(provenance))
    ||!Array.isArray(consumers)||!consumers.every((id:unknown)=>typeof id==='string'))fail('STEEL_VENT_PRIMARY_SCHEMA_SHAPE_REQUIRED');
  return{parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:truth.visibility_role,
    valueSourceRole:truth.value_source_role,provenance,constraints:p.constraints_json??undefined,formulaConsumers:consumers};
});}

export function compileFacadeVentilatedSteelR5(input:Record<string,unknown>,options:Readonly<{
  readback?:FacadeVentilatedSteelReadbackR5;parentPrimaryMeasure?:unknown;
  rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];priceItems?:CanonicalEstimateCompileCoreInput['priceItems'];
  /** Omitted keeps the existing ephemeral preview hash; saved snapshots supply the canonical Core hasher. */
  hashJson?:CanonicalEstimateCompileCoreInput['hashJson'];
}>={}){
  if(input[selector]!==choice||Object.keys(input).some(id=>id!==selector&&id!==area))
    fail('STEEL_VENT_PUBLIC_SOURCE_CHOICE_AND_AREA_ONLY');
  const model=facadeVentilatedSteelDefinitionR5();
  const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:facadeVentilatedSteelPrimarySelectionR5(),
    submittedParameters:input,parameterSchema:schema(model),parentPrimaryMeasure:options.parentPrimaryMeasure});
  if(primary.kind!=='RESOLVED')fail('STEEL_VENT_EXPLICIT_PRIMARY_SELECTION_REQUIRED');
  return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:contract,catalogId:facadeVentilatedSteelCatalogR5,
    primaryMeasureParameterId:primary.primaryMeasure.parameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],
    resourceDefinitions:[...model.resources],submittedParameters:input,confirmedParameters:options.readback?sourceFacts(input,options.readback):{},
    rowOverrides:options.rowOverrides??{},priceItems:options.priceItems??[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:options.hashJson??hash});
}
