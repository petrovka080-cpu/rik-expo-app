import costBoundary from '../../../../data/estimate-benchmarks/source-packs/roof-single539-cost-boundary-r24.json';
import assert from 'node:assert/strict';
import {buildRoofFlat003006R24,roofFlat003006PackR24} from './roofFlat003006CommonR24';
import {roofMasticMeshControlsR24 as main,roofMasticMeshPostRowR24,roofMasticMeshPackR24,roofMasticMeshProfilesR24} from './roofMasticMeshExisting003R24';
import {buildRoofMissingFlatRollAll002R24,roofRemaining002NativeR24} from './roofMissingFlatRollWhole002R24';
import {roofProtectedFlatRoll002NativeR24} from './roofProtectedFlatRollMissing002R24';
import {buildRoofMissingInsulationProfilesWhole014R24,roofMissing014NativeR24} from './roofMissingInsulationProfilesWhole014R24';
import {buildRoofMissingVaporProfilesWhole015R24,roofMissing015NativeR24} from './roofMissingVaporProfilesWhole015R24';
import {buildRoofPrimerWithPreparationWhole01601R24,roofPrimerWithPreparation01601NativeR24} from './roofPrimerWithPreparationWhole01601R24';
import {buildRoofAsphaltScreedWhole0170304R24,buildRoofPrefabSheetScreedWhole01705R24,roofMissing017NativeR24} from './roofMissingScreedProfilesWhole017R24';
import {buildRoofRooflightCurbWhole018R24,roofRooflight018NativeR24} from './roofRooflightCurbWhole018R24';
import {buildRoofMasticPreparationWhole019R24,roofMasticPreparation019SourceR24} from './roofMasticPreparationWhole019R24';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {resolveInclusionGraph} from '../backendPlatform/inclusionGraph';
import {canonicalConditionParameterIds} from '../backendPlatform/canonicalEffectiveResourceQuantityV1';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {resolveCanonicalScopeRequirementV1} from '../backendPlatform/canonicalScopeRequirementV1';
import sharedUses from '../../../../data/estimate-benchmarks/source-packs/roof-single539-exact-shared-need-uses-r24.json';
import existingReuse from '../../../../data/estimate-benchmarks/source-packs/roof-single539-exact-retained-native-reuse-r24.json';

type Json=Record<string,unknown>;
type Parameter=AutomaticOwnerDefinition['parameters'][number];
type Formula=AutomaticOwnerDefinition['formulas'][number];
type Row=AutomaticOwnerDefinition['resources'][number];
type Base=ReturnType<typeof buildRoofFlat003006R24>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const roofSingle539HashR24=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const hash=roofSingle539HashR24;
const eq=(parameterId:string,value:string):Json=>({kind:'equals',parameterId,value});
const and=(...operands:Json[]):Json=>({kind:'and',operands});
const or=(operands:readonly Json[]):Json=>({kind:'or',operands});
const positive=(parameterId:string):Json=>({kind:'greater_than',parameterId,value:0});
const rowHash=(r:Row):Row=>{const{row_sha256:_old,...body}=r;return{...body,row_sha256:hash(body)};};
const artifact='114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8';
export const roofSingle539ContractR24='roof-existing539-whole002-014019-one-config/r24-source01';
export const roofSingle539Existing00209WholeChoiceR24='Два прежних наплавляемых слоя с отдельно выбранными нижними слоями';
export const roofSingle539RollPublicChoiceR24='Рулонное кровельное покрытие';
export const roofSingle539ProfileNotSelectedR24='Этот внутренний профиль не включён в состав';
const reuse00209Selector='WHOLE539_EXISTING00209_WITH_LOWER_LAYERS_R24';
export const roofSingle539ReusedNormsR24=['12-01-002-09','12-01-014-02','12-01-015-03','12-01-016-02','12-01-017-01@15mm','12-01-017-01+02@25mm'] as const;
export type Roof539ReusedNormR24=typeof roofSingle539ReusedNormsR24[number];

/** A finite extraction from the retained full parent, not a second capture or
 * permission flag. The caller must supply the real row/parameter identities. */
export type Roof539PhysicalRoleR24='tower-8t'|'truck-10t'|'forklift-5t'|'flatbed-5t';
export type Roof539PhysicalBindingR24=Readonly<{
 role:Roof539PhysicalRoleR24;
 // Null is an explicit unresolved physical owner; never a fabricated UUID.
 owner:null|Readonly<{rowId:string;capturedRowSha256:string;unitId:'piece'|'pcs'|'set';formulaId:string;costOwnerId:string|null}>;
}>;
export type Roof539LayerInputsR24=Readonly<{
 sourceKey:string; exactBundleColumns:readonly string[];
 physicalBindings:readonly Roof539PhysicalBindingR24[];
}>;
type Native=Readonly<{normId:string;prefix:string;systemParameterId:string;systemYesRu:string;measurementParameterId:string;
 sources:readonly Readonly<{id:string}>[];rates:readonly Readonly<{role:string;unitId:string}>[]}>;
function native(v:unknown):Native{
 assert(object(v)&&typeof v.normId==='string'&&typeof v.prefix==='string'&&typeof v.systemParameterId==='string'
  &&typeof v.systemYesRu==='string'&&typeof v.measurementParameterId==='string'&&Array.isArray(v.sources)&&Array.isArray(v.rates));
 const sources=v.sources.map(s=>{assert(object(s)&&typeof s.id==='string');return{id:s.id};});
 const rates=v.rates.map(r=>{assert(object(r)&&typeof r.role==='string'&&typeof r.unitId==='string');return{role:r.role,unitId:r.unitId};});
 return{normId:v.normId,prefix:v.prefix,systemParameterId:v.systemParameterId,systemYesRu:v.systemYesRu,measurementParameterId:v.measurementParameterId,sources,rates};
}
function workSource(v:unknown):string{assert(object(v)&&Array.isArray(v.sources)&&object(v.sources[0])&&typeof v.sources[0].id==='string');return v.sources[0].id;}
function packNorm(v:unknown):string{assert(object(v)&&typeof v.normId==='string');return v.normId;}
function walk(v:unknown,ids:ReadonlyMap<string,string>):unknown{
 if(typeof v==='string')return ids.get(v)??v;
 if(Array.isArray(v))return v.map(x=>walk(x,ids));
 if(object(v))return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x,ids)]));
 return v;
}
function json(v:unknown,ids:ReadonlyMap<string,string>):Json{const result=walk(v,ids);assert(object(result));return result;}
function params(d:Readonly<{parameters:AutomaticOwnerDefinition['parameters']}>,ids:ReadonlyMap<string,string>):Parameter[]{return d.parameters.map(p=>({...p,
 parameter_id:ids.get(p.parameter_id)??p.parameter_id,constraints_json:p.constraints_json==null?p.constraints_json:json(p.constraints_json,ids),truth_metadata:json(p.truth_metadata,ids)}));}
function formulas(d:AutomaticOwnerDefinition,ids:ReadonlyMap<string,string>):Formula[]{return d.formulas.map(f=>{
 assert(typeof f.expression_source==='string');let expression=f.expression_source;
 for(const[from,to]of ids)expression=expression.replace(new RegExp('(?<![A-Za-z0-9_:.\\-])'+from.replace(/[.*+?^${}()|[\]\\]/gu,'\\$&')+'(?![A-Za-z0-9_:.\\-])','gu'),to);
 const compiled=compileFormulaGraph(expression);return{...f,expression_source:expression,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:hash(compiled.ast)};
});}
function enumValues(p:Parameter):string[]{assert(object(p.constraints_json)&&Array.isArray(p.constraints_json.values)&&p.constraints_json.values.every(x=>typeof x==='string'));return p.constraints_json.values;}
function forbid(p:Parameter,condition:Json):Parameter{const old=p.constraints_json?.forbiddenWhen;return{...p,constraints_json:{...p.constraints_json,
 forbiddenWhen:object(old)?or([old,condition]):condition}};}
function retainedLocalClauses(ast:Json,proof:typeof existingReuse.profiles[number]['rows'][number]):Json[]{
 assert.equal(hash(ast),proof.inclusionSha256);let branch:Json=ast;
 for(const part of proof.ownedBranchPath){const next:unknown=typeof part==='number'?(Array.isArray(branch.operands)?branch.operands[part]:undefined):branch[part];
  if(Array.isArray(next)){assert(part==='operands');const index=proof.ownedBranchPath[1];assert(typeof index==='number'&&object(next[index]));branch=next[index];break;}
  assert(object(next));branch=next;}
 assert.equal(hash(branch),proof.ownedBranchSha256);
 assert(branch.kind==='and'&&Array.isArray(branch.operands));let clauses:unknown[];
 if(proof.ownedBranchPath.length===0){assert(branch.operands.length===2&&object(branch.operands[1]));const tail=branch.operands[1];assert(tail.kind==='and'&&Array.isArray(tail.operands)&&tail.operands.length===2);clauses=[tail.operands[1]];}
 else clauses=branch.operands.slice(2);
 assert.equal(hash(clauses),proof.preservedLocalClausesSha256);return clauses.map(c=>{assert(object(c));return c;});
}

/** Single parameter/schema composition. No compiler, admission or publisher is
 * replaced. Work-label source IDs are rebound only at the final boundary. */
export function buildRoofSingle539WholeLayersR24(base:Base,input:Roof539LayerInputsR24&Readonly<{exactSourceBundleColumns:readonly string[]}>){
 assert(base.capture.definition.catalog_id==='canonical-work:base:roofing_interior_flat_roof_install_technical_room');
 assert(base.capture.definition.id==='5392622f-64e6-5c92-85e9-6b1417bf4f29'&&base.capture.definition.definition_version===14);
 assert(input.sourceKey.trim());assert.deepEqual([...base.capture.resources.map(r=>r.row_id)].sort(),[...existingReuse.allCapturedResourceIds].sort(),'EXACT_R209_CAPTURED_RESOURCE_SET');
 const existing=new Map(existingReuse.profiles.map(p=>[p.key,p]));
 for(const p of existingReuse.profiles){for(const r of p.rows){const old=base.capture.resources.find(old=>old.row_id===r.rowId),f=base.capture.formulas.find(f=>f.formula_id===r.formulaId);
   assert(old&&old.row_sha256===r.capturedRowSha256&&hash(old.inclusion_ast)===r.inclusionSha256&&f&&hash(f)===r.formulaStableSha256,'EXISTING_REUSE_ROW_OR_FORMULA_DRIFT');}
  for(const metadata of p.measureMetadata){const m=base.capture.parameters.find(x=>x.parameter_id===metadata.parameterId);assert(m&&hash(m)===metadata.capturedStableSha256,'EXISTING_REAL_MEASURE_METADATA_DRIFT');}
  for(const ref of p.sourceProfileReferences){const s=base.capture.normativeSources.find(s=>s.id===ref.capturedSourceUuid),l=base.capture.normativeLocators.find(l=>l.id===ref.capturedLocatorUuid);
   assert(s&&hash(s)===ref.capturedSourceStableSha256&&l&&hash(l)===ref.capturedLocatorStableSha256,'EXISTING_EXACT_SOURCE_OR_LOCATOR_DRIFT');}
 }
 const physical=new Map(input.physicalBindings.map(b=>[b.role,b]));assert(input.physicalBindings.length===4&&physical.size===4);
 for(const role of ['tower-8t','truck-10t','forklift-5t','flatbed-5t'] as const){const b=physical.get(role);assert(b,'PHYSICAL_ROLE_INPUT_REQUIRED');
  // R182 found native hours, not a captured physical-count owner. An arbitrary
  // equipment/set row is not an inventory witness for any of these roles.
  assert(b.owner===null,'PHYSICAL_STOCK_ROLE_REQUIRES_CURRENT_INVENTORY_OWNER_REVIEW:'+role);
 }
 assert(physical.get('tower-8t')?.owner?.rowId===undefined||physical.get('tower-8t')?.owner?.rowId!==physical.get('truck-10t')?.owner?.rowId,'TOWER_TRUCK_MUST_BE_DISTINCT');
 const all002=[...Object.values(roofProtectedFlatRoll002NativeR24),...Object.values(roofRemaining002NativeR24)].map(native);
 const n014=Object.values(roofMissing014NativeR24).map(native),n015=Object.values(roofMissing015NativeR24).map(native),n016=native(roofPrimerWithPreparation01601NativeR24),n018=Object.values(roofRooflight018NativeR24).map(native);
 const definitions=[buildRoofMissingFlatRollAll002R24(workSource(roofRemaining002NativeR24.asphaltProtection)),
  buildRoofMissingInsulationProfilesWhole014R24(workSource(roofMissing014NativeR24.concrete)),
  buildRoofMissingVaporProfilesWhole015R24(workSource(roofMissing015NativeR24.firstRoll)),
  buildRoofPrimerWithPreparationWhole01601R24(workSource(roofPrimerWithPreparation01601NativeR24)),
  buildRoofAsphaltScreedWhole0170304R24(workSource(roofMissing017NativeR24.asphalt)),
  buildRoofPrefabSheetScreedWhole01705R24(workSource(roofMissing017NativeR24.sheets)),
  buildRoofRooflightCurbWhole018R24(workSource(roofRooflight018NativeR24.rcOrganic)),
  buildRoofMasticPreparationWhole019R24(workSource(roofMasticPreparation019SourceR24))];
 assert.deepEqual(definitions.map(d=>d.resources.length),[104,22,34,4,6,10,46,8]);
 const exactNewColumns=[...all002,...n014,...n015,n016].map(p=>p.normId).concat(Object.values(roofMissing017NativeR24).map(packNorm),n018.map(p=>p.normId),packNorm(roofMasticPreparation019SourceR24));
 const retainedSourceColumns=['12-01-003-01','12-01-003-02','12-01-006-01','12-01-006-02'];
 const exactColumns=[...exactNewColumns,...retainedSourceColumns];
 assert.deepEqual([...input.exactBundleColumns].sort(),[...exactNewColumns].sort(),'EXACT_NEW_LAYER_COLUMNS_REQUIRED');
 assert.deepEqual([...input.exactSourceBundleColumns].sort(),[...exactColumns].sort(),'EXACT_SUBJECT_BUNDLE_COLUMNS_REQUIRED');
 const vapor=existing.get('01503'),primerReuse=existing.get('01602');assert(vapor&&primerReuse);
 const common17Area='roof_single539_selected_screed_layer_area_m2_r24';
 const common17Definition=buildAutomaticConstructionOwnerR1({contract:roofSingle539ContractR24,semanticOwner:'roof:single539:selected-screed-geometry:r24',
  sourceId:input.sourceKey,normId:'12-01-017-03;12-01-017-05',sourceMetadata:{source_title:'Измеритель выбранной новой выравнивающей стяжки',
   source_document_version:'2015',definition_hash:artifact,artifact_sha256:artifact,exact_locator:'12-01-017-03/04/05;project-measured-selected-layer-area'},
  applicabilityRu:'Только геометрия одной выбранной новой выравнивающей стяжки; не подтверждает материал, толщину, источник или PPR. Отдельные слои требуют собственных идентичностей.',
  ordinary:[{id:common17Area,title:'Измеренная площадь выбранной выравнивающей стяжки, м²',valueType:'decimal',unitId:'m2',min:0,kind:'ordinary'}],profile:[],conditional:[],rows:[],excludedUnownedAssumptions:['NO_AREA_FROM_CEMENT15','NO_BASELINE_MEASUREMENT','NO_MULTIPLE_LAYER_INFERENCE']});
 const geometryParameter=common17Definition.parameters[0];assert(geometryParameter);
 const common17Geometry={...geometryParameter,required:false,default_value:null,truth_metadata:{...geometryParameter.truth_metadata,
  visibility_role:'USER_INPUT',value_source_role:'USER_MEASURED',source_confirmation_required:false,
  provenance:{...(object(geometryParameter.truth_metadata.provenance)?geometryParameter.truth_metadata.provenance:{}),consumer_input_role_v1:'OBJECT_FACT'},
  guide:{...(object(geometryParameter.truth_metadata.guide)?geometryParameter.truth_metadata.guide:{}),guide_kind:'MEASUREMENT_RULE',source_role:'USER_SUPPLIED_PRIMARY_FACT',
   guide_short_ru:'Введите свежую измеренную площадь именно одного выбранного слоя стяжки. Площадь цементной15мм/25мм стяжки, площадь ковра и шаблон не переносятся. Это геометрия, не нормативная толщина или подтверждение технологии.'}}};
 const geometryAliases=[{from:roofMissing015NativeR24.firstRoll.measurementParameterId,to:vapor.primaryMeasureId,unit:'m2',layer:'015'},
  {from:roofMissing015NativeR24.firstCoat.measurementParameterId,to:vapor.primaryMeasureId,unit:'m2',layer:'015'},
  {from:n016.measurementParameterId,to:primerReuse.primaryMeasureId,unit:'m2',layer:'016'},
  {from:roofMissing017NativeR24.asphalt.controls.area,to:common17Area,unit:'m2',layer:'017'},
  {from:roofMissing017NativeR24.sheets.measurementParameterId,to:common17Area,unit:'m2',layer:'017'}];
 const geometryTargets=new Set(geometryAliases.map(a=>a.to));
 for(const a of geometryAliases){const target=a.to===common17Area?common17Geometry:base.capture.parameters.find(p=>p.parameter_id===a.to);
  const sources=definitions.flatMap(d=>d.parameters.filter(p=>p.parameter_id===a.from));assert(target&&sources.length>0);
  assert(target.unit_id===a.unit&&target.truth_metadata.visibility_role==='USER_INPUT'&&target.truth_metadata.value_source_role==='USER_MEASURED','EXACT_EXISTING_SAME_LAYER_USER_GEOMETRY');
  for(const source of sources)assert(source.unit_id===target.unit_id&&source.value_type===target.value_type,'NO_UNIT_OR_NUMERIC_TYPE_CONVERSION');
 }
 const runtimeBaseline=canonicalApprovedBaselineRuntimeParameters(base.capture.baseline);
 for(const profile of existingReuse.profiles.filter(p=>p.key!=='00209'))for(const measure of profile.measureIds)
  assert(!Object.hasOwn(runtimeBaseline,measure),'CAPTURED_GEOMETRY_STILL_RUNTIME_ELIGIBLE_REVIEW_REQUIRED:'+measure);
 // Only NEW expressions are rewired to the same measured physical layer.
 // Old formulas, own 25mm area and partial extra-layer areas remain exact.
 const remap=new Map<string,string>([[all002[0]!.measurementParameterId,main.area],
  [roofMissing017NativeR24.sheets.systemParameterId,roofMissing017NativeR24.asphalt.controls.method],...geometryAliases.map(a=>[a.from,a.to] as const)]);
 for(const p of [...all002,...n014,...n015,n016,...n018])remap.set(p.sources[0]!.id,input.sourceKey);
 for(const p of [...Object.values(roofMissing017NativeR24),roofMasticPreparation019SourceR24])remap.set(workSource(p),input.sourceKey);
 remap.set(roofFlat003006PackR24.prospectiveAbsenceOnlyRegistrySourceKey,input.sourceKey);
 const sourceRows=definitions.flatMap(d=>d.resources),newRows=sourceRows.map(r=>({...r,inclusion_ast:json(r.inclusion_ast,remap),resource_graph:json(r.resource_graph,remap),source_metadata:r.source_metadata==null?r.source_metadata:json(r.source_metadata,remap)}));
 const sourceFormulas=definitions.flatMap(d=>formulas(d,remap));
 const baseParams=params(base,remap),localParams=definitions.flatMap(d=>params(d,remap)).filter(p=>p.parameter_id!==main.publicMethod&&p.parameter_id!==main.area);
 const merged=new Map<string,Parameter>();for(const p of [...baseParams,common17Geometry,...localParams]){const previous=merged.get(p.parameter_id);if(previous){
   if(geometryTargets.has(p.parameter_id)){assert(p.unit_id===previous.unit_id&&p.value_type===previous.value_type);continue;}
   assert(p.parameter_id===roofMissing017NativeR24.asphalt.controls.method&&p.value_type==='enum'&&previous.value_type==='enum'&&p.unit_id===null&&previous.unit_id===null,'DUPLICATE_NONSHARED_PARAMETER:'+p.parameter_id);
   merged.set(p.parameter_id,{...previous,title_ru:'Способ устройства стяжки',constraints_json:{...previous.constraints_json,values:[...new Set([...enumValues(previous),...enumValues(p)])]}});
  }else merged.set(p.parameter_id,p);}
 const c17=roofMissing017NativeR24.asphalt.controls,c19=roofMasticPreparation019SourceR24.controls;
 const chosenMethod=(id:string,choices:readonly string[]):Json=>({kind:'in',parameterId:id,values:choices});
 const lowerScopes=[
  {key:'014',family:'014',measure:n014[0]!.measurementParameterId,unit:'m3',when:chosenMethod(n014[0]!.systemParameterId,n014.map(n=>n.systemYesRu))},
  {key:'015',family:'015',measure:vapor.primaryMeasureId,unit:'m2',when:chosenMethod(roofMissing015NativeR24.firstRoll.systemParameterId,[roofMissing015NativeR24.firstRoll.systemYesRu,roofMissing015NativeR24.firstCoat.systemYesRu])},
  {key:'016',family:'016',measure:primerReuse.primaryMeasureId,unit:'m2',when:eq(n016.systemParameterId,n016.systemYesRu)},
  {key:'017',family:'017',measure:common17Area,unit:'m2',when:chosenMethod(c17.method,[roofMissing017NativeR24.asphalt.methodChoice,roofMissing017NativeR24.sheets.systemYesRu])},
  {key:'018',family:'018',measure:n018[0]!.measurementParameterId,unit:'linear_m',when:chosenMethod(n018[0]!.systemParameterId,n018.map(n=>n.systemYesRu))},
  {key:'019',family:'019',measure:c19.mass,unit:'t',when:eq(c19.method,roofMasticPreparation019SourceR24.methodChoice)}];
 const localMethodForLayer:Readonly<Record<string,string>>={'014':n014[0]!.systemParameterId,'015':roofMissing015NativeR24.firstRoll.systemParameterId,'016':n016.systemParameterId,'017':c17.method};
 const sourceReferenceHolds=existingReuse.profiles.filter(p=>p.key!=='00209').map(p=>({key:p.key,
  parameterId:'roof_single539_retained_'+p.key+'_source_reference_r24',referenceValue:'SOURCE_REFERENCE_ONLY_NOT_ADMITTED:'+p.key,
  references:p.sourceProfileReferences}));
 const holdDefinition=buildAutomaticConstructionOwnerR1({contract:roofSingle539ContractR24,semanticOwner:'roof:single539:retained-source-reference:r24',
  sourceId:input.sourceKey,normId:roofSingle539ReusedNormsR24.slice(1).join(';'),sourceMetadata:{source_title:'Прямые ссылки на собственные колонки КРЕР12',
   source_document_version:'2015',definition_hash:artifact,artifact_sha256:artifact,exact_locator:sourceReferenceHolds.map(h=>h.key).join(';')},
  applicabilityRu:'Ссылки нового внутреннего scope не меняют старые approved sourceProfile tuples и не дают нормативный допуск.',ordinary:[],profile:[],
  conditional:sourceReferenceHolds.map((h):AutomaticParameterSpec=>({id:h.parameterId,title:'Неподтверждённое основание нового внутреннего профиля '+h.key,
   valueType:'enum',unitId:null,kind:'internal',values:[h.referenceValue]})),rows:[],excludedUnownedAssumptions:['NO_AUTHORITY_PROMOTION','NO_USER_SOURCE_CONFIRMATION']});
 for(const p of holdDefinition.parameters){assert(!merged.has(p.parameter_id));merged.set(p.parameter_id,{...p,required:false,default_value:null,
  truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Прямая ссылка нового внутреннего scope ещё не допущена; прежние sourceProfile tuples, bindings и activationAllowed:false неизменны. Требуется предметное решение существующего владельца источника, а не PPR или пользовательский ввод.')});}
 const sourceReferenceCondition=(key:string):Json=>{const h=sourceReferenceHolds.find(h=>h.key===key);assert(h);return eq(h.parameterId,h.referenceValue);};
 const existingScopeKeys:Readonly<Record<string,string>>={'01402':'existing01402','01503':'015','01602':'016','01715':'existing01715','01725':'existing01725'};
 for(const p of existingReuse.profiles.filter(p=>p.key!=='00209')){
  const selectorId=localMethodForLayer[p.layer];assert(selectorId);const spec=merged.get(selectorId);assert(spec);
  merged.set(selectorId,{...spec,constraints_json:{...spec.constraints_json,values:[...enumValues(spec),p.choice]}});
  const scopeKey=existingScopeKeys[p.key];assert(scopeKey);const shared=lowerScopes.find(s=>s.key===scopeKey);
  if(shared){assert(shared.measure===p.primaryMeasureId);shared.when=or([shared.when,eq(selectorId,p.choice)]);}
  else lowerScopes.push({key:scopeKey,family:p.layer,measure:p.primaryMeasureId,unit:'m2',when:eq(selectorId,p.choice)});
 }
 const scopeTitles:Readonly<Record<string,string>>={'014':'Устройство теплоизоляционного слоя','015':'Устройство пароизоляционного слоя',
  '016':'Огрунтовка минерального основания','017':'Устройство асфальтобетонной или сборной стяжки','018':'Обделка стаканов световых фонарей',
  '019':'Приготовление битумной кровельной мастики','existing01402':'Утепление керамзитовым гравием',
  'existing01715':'Устройство цементно-песчаной стяжки толщиной 15 мм','existing01725':'Устройство цементно-песчаной стяжки толщиной 25 мм'};
 const scopeChoice=(key:string):string=>{const title=scopeTitles[key];assert(title);return title;};
 for(const id of [main.publicMethod,main.selector]){const p=merged.get(id);assert(p);const additions=id===main.publicMethod?
  [roofSingle539RollPublicChoiceR24,...lowerScopes.map(s=>scopeChoice(s.key)),roofSingle539Existing00209WholeChoiceR24]:['whole539:002',...lowerScopes.map(s=>'whole539:'+s.key),reuse00209Selector];
  merged.set(id,{...p,constraints_json:{...p.constraints_json,values:[...new Set([...enumValues(p),...additions])]}});
 }
 // The captured numeric measure metadata stays exact, including its legacy
 // witness. New profile selection requires its own positive real measure.
 const newPrimaryScope:Json={kind:'in',parameterId:main.selector,values:['whole539:002',...lowerScopes.map(s=>'whole539:'+s.key),reuse00209Selector]};
 const ownerScope:Json={kind:'in',parameterId:main.selector,values:['whole539:002',...lowerScopes.map(s=>'whole539:'+s.key),reuse00209Selector,
  roofMasticMeshProfilesR24.bitumen.systemYesRu,roofMasticMeshProfilesR24.bitumen_rubber.systemYesRu,roofFlat003006PackR24.jointOnlyOwnedSelectorValue]};
 const localMethodValues=new Map<string,string[]>();for(const n of [...all002,...n014,...n015,n016,...n018,native(roofMissing017NativeR24.sheets)]){const id=remap.get(n.systemParameterId)??n.systemParameterId;localMethodValues.set(id,[...(localMethodValues.get(id)??[]),n.systemYesRu]);}
 localMethodValues.set(c17.method,[...(localMethodValues.get(c17.method)??[]),roofMissing017NativeR24.asphalt.methodChoice]);localMethodValues.set(c19.method,[roofMasticPreparation019SourceR24.methodChoice]);
 for(const p of existingReuse.profiles.filter(p=>p.key!=='00209')){const id=localMethodForLayer[p.layer];assert(id);localMethodValues.set(id,[...(localMethodValues.get(id)??[]),p.choice]);}
 for(const local of localParams){const p=merged.get(local.parameter_id);assert(p);const required=p.constraints_json?.requiredWhen;
  const current=merged.get(p.parameter_id);assert(current);const choices=localMethodValues.get(p.parameter_id),forbidden=current.constraints_json?.forbiddenWhen;
  merged.set(p.parameter_id,{...current,required:false,constraints_json:{...current.constraints_json,...(object(required)?{requiredWhen:and(ownerScope,required)}:{}),
   ...(choices?{values:[...new Set([...enumValues(current),roofSingle539ProfileNotSelectedR24])]}:{}),
   ...(choices&&object(forbidden)?{forbiddenWhen:and(ownerScope,or(choices.map(value=>eq(p.parameter_id,value))),forbidden)}:{})}});}
 const methodForScope=(key:string):string=>key.startsWith('existing')?localMethodForLayer[existing.get(key.slice(8))!.layer]!:
  key==='018'?n018[0]!.systemParameterId:key==='019'?c19.method:localMethodForLayer[key]!;
 for(const scope of lowerScopes){const id=methodForScope(scope.key),p=merged.get(id);assert(p);
  merged.set(id,forbid(p,and(eq(main.publicMethod,scopeChoice(scope.key)),{kind:'not',operand:scope.when})));}
 const rollParameter=merged.get(all002[0]!.systemParameterId);assert(rollParameter);
 merged.set(rollParameter.parameter_id,forbid(rollParameter,or([
  and(eq(main.publicMethod,roofSingle539RollPublicChoiceR24),{kind:'not',operand:chosenMethod(rollParameter.parameter_id,all002.map(n=>n.systemYesRu))}),
  and(chosenMethod(rollParameter.parameter_id,all002.map(n=>n.systemYesRu)),{kind:'not',operand:eq(main.publicMethod,roofSingle539RollPublicChoiceR24)})])));
 const selected=(n:Native)=>eq(remap.get(n.systemParameterId)??n.systemParameterId,n.systemYesRu);
 const reusedSelected=(key:string)=>{const p=existing.get(key);assert(p&&p.key!=='00209');const id=localMethodForLayer[p.layer];assert(id);return eq(id,p.choice);};
 const newSelected014=or(n014.map(selected)),newSelected015=or(n015.map(selected));
 const newAsphalt=eq(c17.method,roofMissing017NativeR24.asphalt.methodChoice);
 const newPrefab=eq(c17.method,roofMissing017NativeR24.sheets.systemYesRu);
 // One owned layer in this finite constructor. Separate physical layers require
 // a later exact layer-identity contract, never silent subtraction or defaults.
 // Existing/new alternatives share the same new internal profile enum. This
 // makes same-layer dual selection impossible without editing historical IDs.
 const selected019=eq(c19.method,roofMasticPreparation019SourceR24.methodChoice);
 const readySelections=[...all002.filter(n=>n.rates.some(r=>/mastic/iu.test(r.role))).map(selected),...n015.map(selected),newPrefab,...n018.map(selected),reusedSelected('01503'),
  eq(main.publicMethod,roofMasticMeshPackR24.choices.bitumen),eq(main.publicMethod,roofMasticMeshPackR24.choices.bitumen_rubber),eq(main.publicMethod,roofMasticMeshPackR24.choices.polymer_mastic_existing),
  eq(roofFlat003006PackR24.jointControls.method,roofFlat003006PackR24.jointChoices.mastic)];
 // No area->mass recipe, and no ready-product cost is removed. This version
 // refuses joint make/buy until the exact product/mass bridge has real evidence.
 const p019=merged.get(c19.method);assert(p019);merged.set(c19.method,forbid(p019,and(selected019,or(readySelections))));
 const primer=merged.get(n016.systemParameterId);assert(primer);
 merged.set(n016.systemParameterId,forbid(primer,and(selected(n016),or([selected(roofMissing015NativeR24.firstRoll),selected(roofMissing015NativeR24.firstCoat),newPrefab,
  eq(main.publicMethod,roofMasticMeshPackR24.choices.bitumen),eq(main.publicMethod,roofMasticMeshPackR24.choices.bitumen_rubber)]))));
 const capturedIds=new Set(base.capture.resources.map(r=>r.row_id));
 const oldRows=base.resources.map(r=>({...r,inclusion_ast:capturedIds.has(r.row_id)?and(r.inclusion_ast,{kind:'not',operand:newPrimaryScope}):r.inclusion_ast,
  resource_graph:json(r.resource_graph,remap),source_metadata:r.source_metadata==null?r.source_metadata:json(r.source_metadata,remap)}));
 const stock=oldRows.find(r=>r.row_id===base.stockRowId),heat=oldRows.find(r=>r.row_id===roofMasticMeshPostRowR24);assert(stock&&heat);
 const op=canonicalEstimateOperationReference(stock.resource_graph.operationCompositionV1);assert(op);
 const rows:readonly Row[]=newRows.map(r=>{const own=canonicalEstimateOperationReference(r.resource_graph.operationCompositionV1);assert(own,'WHOLE_NATIVE_OPERATION_REQUIRED');
  return{...r,inclusion_ast:and(all002.some(n=>r.row_id.startsWith(n.prefix+':'))?eq(main.selector,'whole539:002'):ownerScope,r.inclusion_ast),resource_graph:{...r.resource_graph,operationCompositionV1:{...own,groupId:op.groupId,groupTitleRu:op.groupTitleRu}}};});
 const boilerSelections=[...all002,...n015,...n018].filter(n=>n.rates.some(r=>/boiler/iu.test(r.role))).map(selected).concat(newPrefab,selected019,reusedSelected('01503'));
 const heatSelections=boilerSelections.filter(s=>hash(s)!==hash(selected019));
 const addRelated=(row:Row,condition:Json,present:readonly Row[]):Row=>{const primary=canonicalEstimateOperationReference(row.resource_graph.operationCompositionV1);
  if(row.row_id==='roof:lower-layers:krer12-01503-01402:project-chain-check'){
   const captured=base.capture.resources.find(r=>r.row_id===row.row_id);
   assert(captured&&hash(row.resource_graph)===hash(captured.resource_graph),'CAPTURED_SCOPE_COMPANION_GRAPH_DRIFT');
   assert(primary===null,'SCOPE_COMPANION_MUST_NOT_GAIN_OPERATION_OWNER');
   const decision=resolveCanonicalScopeRequirementV1({graph:row.resource_graph,rowId:row.row_id,parameters:{},
    resourceIds:new Set([...oldRows,...rows].map(r=>r.row_id)),parameterIds:new Set(merged.keys()),knownQuantityRowIds:new Set<string>()});
   assert(decision?.kind==='OBJECT_SCOPE'&&!decision.numericNormAccepted&&!decision.separatePaymentAccepted,'EXACT_SCOPE_COMPANION_CONTRACT_REQUIRED');
   // Its historical cement15/25 project contexts do not authorise new methods.
   // The row remains present with its existing scope, source and payment metadata.
   return row;
  }
  assert(primary);
  const references=new Map((primary.additionalOperations??[]).map(x=>[x.operationId,x]));
  for(const used of present){const use=canonicalEstimateOperationReference(used.resource_graph.operationCompositionV1);assert(use);
   const previous=references.get(use.operationId);const when=[...new Set([...(previous?.whenResourcePresent??[]),used.row_id])];
   references.set(use.operationId,{operationId:use.operationId,operationTitleRu:use.operationTitleRu,completionCriterionRu:use.completionCriterionRu,whenResourcePresent:when});}
  return{...row,inclusion_ast:or([row.inclusion_ast,and(ownerScope,condition)]),resource_graph:{...row.resource_graph,operationCompositionV1:{...primary,additionalOperations:[...references.values()]}}};
 };
 const hotPrefixes=[...all002,...n015,...n018].filter(n=>n.rates.some(r=>/boiler/iu.test(r.role))).map(n=>n.prefix).concat(roofMissing017NativeR24.sheets.prefix);
 const nativeBoilers=rows.filter(r=>r.unit_id==='machine_hour'&&/boiler/iu.test(r.row_id));
 const stockRoleByCode:Readonly<Record<string,Roof539PhysicalRoleR24>>={'02-0005':'tower-8t','02-0075':'truck-10t','03-0020':'forklift-5t','40-0001':'flatbed-5t'};
 const hourBindings=new Map<string,Roof539PhysicalRoleR24>();
 const rawPacks:readonly unknown[]=[...Object.values(roofProtectedFlatRoll002NativeR24),...Object.values(roofRemaining002NativeR24),...Object.values(roofMissing014NativeR24),...Object.values(roofMissing015NativeR24),roofPrimerWithPreparation01601NativeR24,...Object.values(roofMissing017NativeR24),...Object.values(roofRooflight018NativeR24),roofMasticPreparation019SourceR24];
 for(const raw of rawPacks){assert(object(raw)&&typeof raw.prefix==='string'&&Array.isArray(raw.rates));for(const rate of raw.rates){
  assert(object(rate)&&typeof rate.role==='string');if(rate.unitId==='machine_hour'&&typeof rate.resourceCode==='string'&&stockRoleByCode[rate.resourceCode])hourBindings.set(raw.prefix+':'+rate.role,stockRoleByCode[rate.resourceCode]!);
 }}
 const linkedRows=rows.map(r=>{const role=hourBindings.get(r.row_id);if(!role)return r;const owner=physical.get(role)?.owner;
  return{...r,resource_graph:{...r.resource_graph,whole539PhysicalStockV1:{role,stockOwnerRowId:owner?.rowId??null,stockUnitId:owner?.unitId??null,
   normativeMachineHourOwnerId:r.cost_owner_id,quantityConversion:null,unresolved:owner==null}}};});
 const scopeByNorm=new Map<string,Json>([...all002,...n014,...n015,n016,...n018,native(roofMissing017NativeR24.sheets)].map(n=>[n.normId,selected(n)]));
 scopeByNorm.set(roofMissing017NativeR24.asphalt.normId,newAsphalt);scopeByNorm.set(roofMissing017NativeR24.correction.normId,newAsphalt);scopeByNorm.set(roofMasticPreparation019SourceR24.normId,selected019);
 const prefixByNorm=new Map<string,string>();for(const raw of rawPacks){assert(object(raw)&&typeof raw.normId==='string'&&typeof raw.prefix==='string');prefixByNorm.set(raw.normId,raw.prefix);}
 const sharedById=new Map(sharedUses.rows.map(s=>[s.rowId,s]));
 for(const use of sharedUses.rows){const captured=base.capture.resources.find(r=>r.row_id===use.rowId);assert(captured&&captured.row_sha256===use.capturedRowSha256
  &&captured.unit_id===use.unitId&&captured.formula_id===use.formulaId&&captured.cost_owner_id===use.costOwnerId,'CAPTURED_SHARED_NEED_DRIFT:'+use.rowId);}
 const reusedTorch=existing.get('00209');assert(reusedTorch);
 const retainedByRow=new Map(existingReuse.profiles.flatMap(p=>p.rows.map(proof=>[proof.rowId,{profile:p,proof}] as const)));
 const changedOld=oldRows.map(original=>{
  let r=original;const retained=retainedByRow.get(r.row_id);
  if(retained){const raw=base.capture.resources.find(raw=>raw.row_id===r.row_id);assert(raw);const p=retained.profile;
   const chosen=p.key==='00209'?eq(main.selector,reuse00209Selector):reusedSelected(p.key);
   const sourceClauses=retainedLocalClauses(raw.inclusion_ast,retained.proof);
   r={...r,inclusion_ast:or([r.inclusion_ast,and(ownerScope,chosen,...p.measureIds.map(positive),...sourceClauses,...(p.key==='00209'?[]:[sourceReferenceCondition(p.key)]))])};
  }
  const oldVapor=oldRows.filter(x=>existing.get('01503')!.rows.some(ref=>ref.rowId===x.row_id));
  if(r.row_id===stock.row_id)return addRelated(r,or(boilerSelections),[...nativeBoilers,...oldVapor.filter(x=>x.unit_id==='machine_hour'&&x.row_id.endsWith(':bitumen_kettle_400l'))]);
  if(r.row_id===heat.row_id)return addRelated(r,or(heatSelections),[...rows.filter(x=>hotPrefixes.some(prefix=>x.row_id.startsWith(prefix+':'))),...oldVapor]);
  if(r.row_id==='roof:flat003006:r24:need:sheet-cut-bending-kit')return addRelated(r,newPrefab,rows.filter(x=>x.row_id.startsWith(roofMissing017NativeR24.sheets.prefix+':')));
  const use=sharedById.get(r.row_id);if(!use)return r;
  const conditions=use.normIds.map(n=>{const scope=scopeByNorm.get(n);assert(scope,'UNKNOWN_SHARED_NEED_NORM:'+n);return scope;});
  const retainedConditions=use.retainedProfileKeys.map(key=>key==='00209'?eq(main.selector,reuse00209Selector):reusedSelected(key));
  const prefixes=use.normIds.map(n=>{const prefix=prefixByNorm.get(n);assert(prefix);return prefix;});
  const retainedUses=use.retainedProfileKeys.flatMap(key=>{const p=existing.get(key);assert(p);return oldRows.filter(x=>p.rows.some(ref=>ref.rowId===x.row_id));});
  return addRelated(r,or([...conditions,...retainedConditions]),[...rows.filter(x=>prefixes.some(prefix=>x.row_id.startsWith(prefix+':'))),...retainedUses]);
 });
 const priceRows=new Map(costBoundary.rows.map(r=>[r.rowId,r]));assert.equal(priceRows.size,234);
 const pricedDefinitions=linkedRows.map(row=>{const boundary=priceRows.get(row.row_id);assert(boundary);
  assert(row.unit_id===boundary.unitId&&row.category===boundary.category&&row.cost_owner_id===row.row_id
   &&row.resource_graph.costTreatment===boundary.costTreatment,'EXACT_NATIVE_COST_OWNER_UNIT_AND_TREATMENT');
  assert(boundary.procurementEligible===false&&row.procurement_eligible===false,'MATERIAL_PROCUREMENT_HOLD_MUST_REMAIN_FALSE');
  if(!boundary.machine)return row;
  const machine=boundary.machine;assert(machine.rowId===row.row_id&&machine.catalogId===base.capture.definition.catalog_id&&object(row.source_metadata));
  const oldCode=row.source_metadata.normativeResourceCode,oldArtifact=row.source_metadata.source_artifact_sha256;
  assert((oldCode===undefined||oldCode===machine.resourceCode)&&(oldArtifact===undefined||oldArtifact===machine.sourceArtifactSha256),'NATIVE_MACHINE_METADATA_CONFLICT');
  return{...row,source_metadata:{...row.source_metadata,normativeResourceCode:machine.resourceCode,
   machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',
   source_artifact_sha256:machine.sourceArtifactSha256,machinePriceExactSourceColumnsR24:machine.exactPriceScopeColumn}};
 });
 const basePriceScopes=new Map(costBoundary.baseMachines.map(m=>[m.rowId,m]));assert.equal(basePriceScopes.size,18);
 const pricedBase=changedOld.map(row=>{const m=basePriceScopes.get(row.row_id);if(!m)return row;
  assert(row.unit_id==='machine_hour'&&row.category==='equipment'&&row.cost_owner_id===m.costOwnerId,'BASE18_MACHINE_PAYMENT_IDENTITY_DRIFT');
  assert(m.catalogId===base.capture.definition.catalog_id,'BASE18_PRICE_CATALOG_DRIFT');
  assert(row.resource_graph.costTreatment==='OWN_COST'&&row.procurement_eligible===false,'BASE18_COST_PROCUREMENT_DRIFT');
  assert(object(row.source_metadata),'BASE18_FULL_MACHINE_METADATA_REQUIRED');
  const oldCode=row.source_metadata.normativeResourceCode,oldArtifact=row.source_metadata.source_artifact_sha256;
  assert((oldCode===undefined||oldCode===m.resourceCode)&&(oldArtifact===undefined||oldArtifact===m.sourceArtifactSha256),'BASE18_NATIVE_MACHINE_METADATA_CONFLICT');
  return{...row,source_metadata:{...row.source_metadata,normativeResourceCode:m.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',
   machinePriceOperationScope:'FULL_SOURCE_OPERATION',source_artifact_sha256:m.sourceArtifactSha256,machinePriceExactSourceColumnsR24:m.exactPriceScopeColumn}};
 });
 const allRows=[...pricedBase,...pricedDefinitions].map((r,ordinal)=>{const next={...r,ordinal},before=base.resources[ordinal];return before&&hash(next)===hash(before)?before:rowHash(next);});
 const rowSourceColumns=new Map<string,string[]>();
 for(const raw of rawPacks){assert(object(raw)&&typeof raw.prefix==='string'&&typeof raw.normId==='string'&&Array.isArray(raw.rates));for(const rate of raw.rates){
  assert(object(rate)&&typeof rate.role==='string');const id=raw.prefix+':'+rate.role;if(rows.some(r=>r.row_id===id))rowSourceColumns.set(id,[raw.normId]);
 }}
 for(const rate of roofMissing017NativeR24.correction.rates){const own=roofMissing017NativeR24.asphalt.rates.find(r=>r.resourceCode===rate.resourceCode);assert(own);
  const id=roofMissing017NativeR24.asphalt.prefix+':'+own.role;const columns=rowSourceColumns.get(id);assert(columns);columns.push(roofMissing017NativeR24.correction.normId);}
 assert.equal(rowSourceColumns.size,234,'EVERY_NEW_ROW_HAS_EXACT_NATIVE_COLUMN');
 const allFormulas=[...base.formulas,...sourceFormulas];assert.equal(new Set(allFormulas.map(f=>f.formula_id)).size,allFormulas.length);
 for(const p of existingReuse.profiles.filter(p=>p.key!=='00209'))for(const metadata of p.measureMetadata){const parameter=merged.get(metadata.parameterId);assert(parameter);
  const oldVisible=parameter.truth_metadata.visible_when;
  merged.set(parameter.parameter_id,{...parameter,truth_metadata:{...parameter.truth_metadata,
   visible_when:object(oldVisible)?or([oldVisible,and(ownerScope,geometryTargets.has(metadata.parameterId)?lowerScopes.find(s=>s.measure===metadata.parameterId)!.when:reusedSelected(p.key))]):and(ownerScope,geometryTargets.has(metadata.parameterId)?lowerScopes.find(s=>s.measure===metadata.parameterId)!.when:reusedSelected(p.key))}});}
 const parameters=[...merged.values()].map((p,ordinal)=>({...p,ordinal}));
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas:allFormulas,resources:allRows});
 const finalParameters:AutomaticOwnerDefinition['parameters']=parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}}));
 const declared=new Set(parameters.map(p=>p.parameter_id));for(const r of allRows){resolveInclusionGraph(r.inclusion_ast,{});for(const id of canonicalConditionParameterIds(r.inclusion_ast))assert(declared.has(id),'UNCOVERED_FINAL_INCLUSION_REF:'+id);}
 for(const f of allFormulas)for(const id of f.input_parameter_ids)assert(declared.has(id),'UNCOVERED_FINAL_FORMULA_REF:'+id);
 assert.equal(new Set(allRows.map(r=>r.row_id)).size,allRows.length);assert.equal(rows.length,234);assert.equal(allRows.filter(r=>r.row_id===stock.row_id).length,1);
 const profile=base.applicability.sourceProfileSelectionV1,primary=base.applicability.primaryMeasureSelectionV1;
 assert(object(profile)&&Array.isArray(profile.profiles)&&object(primary)&&Array.isArray(primary.selections));
 const oldTorchProfile=profile.profiles.find(p=>object(p)&&p.selectorValue===existingReuse.oldFieldSelectorValue);assert(object(oldTorchProfile)&&Array.isArray(oldTorchProfile.sources),'EXACT_RETAINED00209_SOURCE_PROFILE_REQUIRED');
 const scopeNorms:Readonly<Record<string,readonly string[]>>={'014':n014.map(n=>n.normId),'015':[roofMissing015NativeR24.firstRoll.normId,roofMissing015NativeR24.firstCoat.normId],
  '016':[n016.normId],'017':[roofMissing017NativeR24.asphalt.normId,roofMissing017NativeR24.correction.normId,roofMissing017NativeR24.sheets.normId],'018':n018.map(n=>n.normId),'019':[roofMasticPreparation019SourceR24.normId]};
 const profiles=[...profile.profiles.map(p=>json(p,remap)),{selectorValue:reuse00209Selector,sources:oldTorchProfile.sources,when:and(eq(main.publicMethod,roofSingle539Existing00209WholeChoiceR24),positive(main.area)),geometryCopies:[]},
  {selectorValue:'whole539:002',sources:[{sourceId:input.sourceKey,artifactSha256:artifact,locator:all002.map(n=>n.normId).join(';')}],when:and(eq(main.publicMethod,roofSingle539RollPublicChoiceR24),positive(main.area)),geometryCopies:[]},
  ...lowerScopes.map(s=>{const retained=s.key.startsWith('existing')?existing.get(s.key.slice('existing'.length)):undefined;
   return{selectorValue:'whole539:'+s.key,sources:retained?retained.sourceProfileReferences.map(ref=>({sourceId:ref.sourceId,artifactSha256:ref.artifactSha256,locator:ref.locator})):
    [{sourceId:input.sourceKey,artifactSha256:artifact,locator:(scopeNorms[s.key]??[]).join(';')}],when:and(eq(main.publicMethod,scopeChoice(s.key)),{kind:'literal',value:true}),geometryCopies:[]};})];
 assert.equal(profiles.length,16);assert.equal(enumValues(merged.get(main.publicMethod)!).length,16);
 // Same explicit independent work-scope route as accepted common006. The
 // captured source-profile numeric geometry/witness remains exact. Own actual
 // geometry, method, SOURCE and PPR gates stay on every resource branch.
 for(const scope of lowerScopes){const p=merged.get(scope.measure);assert(p&&p.truth_metadata.visibility_role==='USER_INPUT'&&p.unit_id===scope.unit,'REAL_PUBLIC_PRIMARY_MEASURE_ONLY');}
 const capturedProfile=base.capture.definition.applicability.sourceProfileSelectionV1;
 assert(object(capturedProfile)&&Array.isArray(capturedProfile.profiles));
 for(const captured of capturedProfile.profiles){assert(object(captured)&&Array.isArray(captured.sources));
  const retained=profiles.find(p=>p.selectorValue===captured.selectorValue);assert(retained&&hash(retained.sources)===hash(captured.sources),'CAPTURED_SOURCE_PROFILE_TUPLE_IMMUTABLE');}
 const applicability={...base.applicability,sourceProfileSelectionV1:{...json(profile,remap),profiles},primaryMeasureSelectionV1:{...primary,selections:[...primary.selections,
  {selectorValue:reuse00209Selector,primaryMeasureParameterId:main.area,unitId:'m2'},{selectorValue:'whole539:002',primaryMeasureParameterId:main.area,unitId:'m2'},...lowerScopes.map(s=>({selectorValue:'whole539:'+s.key,primaryMeasureParameterId:s.measure,unitId:s.unit}))]},
  single539WholeLayerCompositionV1:{contract:roofSingle539ContractR24,sourceReferenceAdmission:'SOURCE_REFERENCE_ONLY_NOT_ADMITTED',sourceReferenceHolds,geometryAliases,sourceIdentityIsRuntimeInput:true,missingPhysicalRoles:input.physicalBindings.filter(b=>b.owner===null).map(b=>b.role),
   sourceAlgorithmHolds:['00204_SAND_VS_CRUSHED_ASPHALT','01705_OPERATION_1MM_VS_RESOURCE_0_7MM','019_ASBESTOS_EXACT_RECIPE','019_MATCHED_OUTPUT_MASS_BUY_MAKE_BRIDGE'],
   sameLayerOnly:true,separateLayerIdentityAdmission:false,fullTechnicalAcceptance:false}};
 return{...base,parameters:finalParameters,formulas:allFormulas,resources:allRows,applicability,newNativeRowIds:rows.map(r=>r.row_id),newNativeRows:pricedDefinitions,
  exactColumns,exactNewColumns,retainedSourceColumns,existingProfiles:existingReuse.profiles,sourceReferenceHolds,physicalBindings:input.physicalBindings,sourceKey:input.sourceKey,
  rollPublicChoice:roofSingle539RollPublicChoiceR24,inputParameterRemap:remap,existingScopeKeys,scopeAliases:{'017-asphalt':'017','017-prefab':'017'},
  lowerScopes:lowerScopes.map(s=>({...s,publicChoice:scopeChoice(s.key)})),all002,selected019,newSelected014,newSelected015,rowSourceColumns,localMethodIds:[...localMethodValues.keys()],localMethodForLayer};
}
