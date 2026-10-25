import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import source from '../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-native-f266.json';
import provision from '../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-existing-provision-f271.json';
import independentMap from '../../../data/estimate-benchmarks/source-packs/wall-ceramic-cement-existing-completeness-f271.json';
import fixture from '../../../data/estimate-benchmarks/fixtures/wall-ceramic-cement-existing-finite-f271.json';
import {wallExistingOwnerDefinitionF271 as build,wallPrimaryF271 as primary,WALL_METHOD_F271 as method,
 WALL_HEIGHT_F271 as height,WALL_LEGACY_F271 as legacy,WALL_CEMENT_F271 as cement} from '../../../src/lib/estimate/v4/wallCeramicCementExistingOwnerF271';
import {WALL_CERAMIC_CEMENT_AREA_F266 as area} from '../../../src/lib/estimate/v4/wallCeramicCementNativeF266';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult,type CanonicalEstimatePriceItem}
 from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {assertCanonicalPrimaryMeasureSelectionV1,resolvePrimaryMeasureSelectionV1,type PrimaryMeasureSelectionParameterV1}
 from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {validateCanonicalEstimateParameterInputs} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1}
 from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config}
 from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,unknown>;
type Capture=MasterRetainedParentCaptureR1&Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;
export type WallContextF271=Readonly<{sourceRoot:string;outputRoot:string;expectedBranch:string;masterPath:string;masterSha256:string;
 releaseId:string;searchReleaseId:string;currentReleasePath:string;
 /** Required ROOT read/precondition input. No default:null or absence assertion is authored here. */
 capturedSourcePreimage:NonNullable<MasterRetainParentBindingsR1['capturedSourcePreimage']>}>;
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const same=(a:unknown,b:unknown)=>assert.deepEqual(stable(a),stable(b));
/** Exact historical raw-row projection; the compiler's normalized resource type
 * intentionally omits semantic_owner. Validate the raw record rather than
 * casting it or dropping any historical identity/owner/source field. */
function legacyRowProjectionF271(value:unknown){
 assert(record(value),'EXACT_LEGACY_RESOURCE_RECORD');
 return{id:value.id,row_id:value.row_id,formula_id:value.formula_id,unit_id:value.unit_id,
  cost_owner_id:value.cost_owner_id,semantic_owner:value.semantic_owner,source_metadata:value.source_metadata,
  resource_graph:value.resource_graph,procurement_eligible:value.procurement_eligible};
}
const prefix='tile-wall:kg15-01901',catalogId=source.catalogId,sourceId=source.sourceKey;
const paths={native:'src/lib/estimate/v4/wallCeramicCementNativeF266.ts',model:'src/lib/estimate/v4/wallCeramicCementExistingOwnerF271.ts',
 config:'scripts/estimate/r4a13/prepareWallCeramicCementExistingOwnerF271.ts',test:'scripts/estimate/r4a13/wallCeramicCementExistingOwnerF271.test.ts',
 pack:'data/estimate-benchmarks/source-packs/wall-ceramic-cement-native-f266.json',provision:'data/estimate-benchmarks/source-packs/wall-ceramic-cement-existing-provision-f271.json',
 map:'data/estimate-benchmarks/source-packs/wall-ceramic-cement-existing-completeness-f271.json',fixture:'data/estimate-benchmarks/fixtures/wall-ceramic-cement-existing-finite-f271.json',
 capture:'data/estimate-benchmarks/fixtures/wall-ceramic-current-parent-r266.json'};
function captured(sourceRoot:string):Capture{
 const p=resolve(sourceRoot,paths.capture);assert.equal(sha(p),source.currentParent.sha256);
 const packet:{capture:Capture;readOnly:boolean}=JSON.parse(readFileSync(p,'utf8'));assert.equal(packet.readOnly,true);const c=packet.capture;
 assert.equal(c.definition.catalog_id,catalogId);assert.equal(c.definition.id,'359cacb4-486f-52e7-9e16-17695d16ee9b');
 assert.equal(c.definition.definition_sha256,'e3fbb9b48422cb047426245ee8a131e379dd68e0401298931d69dd45e6b24712');
 assert.equal(c.definition.definition_version,3);assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length],[1,59,59,0]);
 assert.equal(c.parameters[0]?.parameter_id,'q');assert.equal(c.parameters[0]?.unit_id,'m2');assert.equal(c.parameters[0]?.default_value,100);
 assert.equal(c.baseline.id,'88b14346-801d-5dfc-b230-22d95418373d');same(c.baseline.input_values,{q:100});same(c.baseline.input_classification,{q:'ASSUMPTION'});
 assert.deepEqual(c.normativeSources,[]);assert.deepEqual(c.normativeLocators,[]);return c;
}
const original=(c:Capture):AutomaticOwnerDefinition=>({parameters:c.parameters,formulas:c.formulas,resources:c.resources,
 runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']});
/** Exact published legacy-choice presentation expected by the existing TS/SQL
 * baseline scope contract. This adapter changes only q's visibility metadata;
 * historical q100, its source/history and all formulas/owners remain intact. */
export function buildPublishedWallF271(parent:AutomaticOwnerDefinition):AutomaticOwnerDefinition{
 const model=build(parent),q=model.parameters.find(p=>p.parameter_id==='q');assert(q);
 assert.equal(q.truth_metadata.value_source_role,'VISIBLE_BASELINE_ASSUMPTION');
 const selector=model.parameters.find(p=>p.parameter_id===method);assert(selector);assert.equal(selector.value_type,'enum');
 assert.equal(selector.truth_metadata.visibility_role,'USER_INPUT');assert.equal(selector.truth_metadata.value_source_role,'USER_INPUT');
 same(q.truth_metadata.visible_when,{kind:'and',operands:[{kind:'equals',parameterId:method,value:legacy},{kind:'literal',value:true}]});
 return{...model,parameters:model.parameters.map(p=>p.parameter_id!=='q'?p:{...p,truth_metadata:{...p.truth_metadata,
  visible_when:{kind:'and',operands:[{kind:'selected',parameterId:method,value:legacy},{kind:'literal',value:true}]}}})};
}
export function prepareWallCeramicCementExistingOwnerF271(context:WallContextF271):Config{
 const c=captured(context.sourceRoot),next=buildPublishedWallF271(original(c));assert.equal(context.capturedSourcePreimage.sourceKey,sourceId);
 assert(record(c.definition.source_metadata)&&typeof c.definition.source_metadata.templateId==='string');
 const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
  capturedSourcePreimage:context.capturedSourcePreimage,
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
   parameterSources:structuredClone(c.baseline.normative_source_ids)},
  newParameterSources:Object.fromEntries(next.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
   p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[sourceId]}]))};
 const newRows=next.resources.filter(r=>!c.resources.some(old=>old.row_id===r.row_id));assert.equal(newRows.length,22);
 const unresolved=provision.needs.map(n=>n.rowId);
 const config:Config={contract:'existing-wall-ceramic-cement-whole/f271',stopCode:'WALL_CERAMIC_CEMENT_EXISTING_F271',
  applicationName:'wall-ceramic-cement-existing-f271',expectedBranch:context.expectedBranch,masterPath:context.masterPath,masterSha256:context.masterSha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:context.currentReleasePath,outputRoot:context.outputRoot,
  sourcePaths:[...Object.values(paths),source.sourceArtifact.path,'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
   'src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts',
   'src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation.ts','src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
   'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'],
  catalogId,sourceId,normId:'15-01-019-01',sourceMetadata:{source_title:'Облицовка стен глазурованной керамической плиткой на цементном растворе',
   source_authority:'КРЕР Кыргызской Республики,сборник15,2015',exact_locator:'PDF56–58:только15-01-019-01;§1.2а/1.4/1.9/2.3',
   use_restriction:source.scopeRu+' В этой ветви только плоская стена; криволинейная поверхность не допущена. Нативныйраствор1:3 не равен М150. Физическоеобеспечение/цены машин/закупка/проектныефакты не подтверждены.',
   source_kind:'EXACT_NATIVE_KG_OPERATION_WITH_SIX_UNRESOLVED_PROVISION_NEEDS',artifact_sha256:source.sourceArtifact.sha256},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:{q:100,[method]:legacy},acceptanceInput:{q:100,[method]:legacy},runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[1,59,59],benchmarkOrdinal:1,validationScenario:'RETAINED_CURRENT_WALL59_EXCLUSIVE_CEMENT01901_OWN_AREA_PRELIMINARY',
  passport:{canonicalRuName:'Облицовка стен плиткой',workKey:'tile_stone_interior_tile_wall_lay_standard',physicalResultRu:'Облицованная плиткой стена:сохранённыйсостав либо собственныйцементныйметод01901.',
   includedScopeRu:['Исторические59строк в прежней ветви без измененияID,норм,единиц и владельцев.','Точнаяколонка01901:10нативныхресурсов и6операций в единомтруде228чел.-ч/100м².'],
   excludedScopeRu:[...source.excludedRu,'Наличие59строк не являетсяwhole-sourceдопуском.','Инструмент,подготовка,очистнойинвентарь,доступ,СИЗ остаются явно нерассчитанными до применимогообеспечения.'],
   independentCompletenessMap:independentMap,unresolvedApplicableResourceRowIds:unresolved},
  applicability:{legacyApplicability:structuredClone(c.definition.applicability),primaryMeasureSelectionV1:primary(),
   sourceColumn:'15-01-019-01',oldAndNewPhysicalRowsMutuallyExclusive:true,fullTechnicalAcceptance:false,sourceProfileChoiceIsNotProjectApproval:true},
  binding:{rowId:newRows[0]!.row_id,additionalRowIds:newRows.slice(1).map(r=>r.row_id),retainParentBindings:retained,
   applicability:{contract:'existing-wall-ceramic-cement-source/f271',column:'15-01-019-01',normAccepted:false,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(newRows.map(r=>[r.row_id,{column:'15-01-019-01',role:unresolved.includes(r.row_id)?'UNRESOLVED_PROVISION_NOT_POSITIVE_RATE':'EXACT_NATIVE_OR_INCLUDED_OPERATION',fullTechnicalAcceptance:false}]))},
  locator:{key:'kg15-01-019-01-existing-wall-f271',payload:{source,provision,independentCompletenessMap:independentMap,
   capturedParentFileSha256:source.currentParent.sha256,newPublicCatalogIds:0,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Облицовка стен плиткой',aliases:['Облицовка стен плиткой'],shortScopeRu:'Существующая карточка,отдельный физическийметод цементнойоблицовки с собственнойплощадью.',
   keyDistinguishingParameters:[method],clarificationFields:[method],includedBoundaries:['Кирпич/бетон,гладкаябелаяглазурованнаяплитка,цементныйраствор1:3,обычныйинтерьердо3,5м'],
   excludedBoundaries:[...source.excludedRu],extraSearchTermsRu:'облицовка стены плитка цементный раствор',sourceProvenance:{sourceId,sourceArtifactSha256:source.sourceArtifact.sha256,
    oneExistingPublicOwner:true,sourceRegistryAbsenceNotProved:true,normalLockedRequired:true}},
  forbiddenAdjacentMatchers:[/\bCM\s*11\b/iu,/\bCE\s*40\b/iu,/М\s*150/iu],owner:'existing-wall-ceramic-cement-f271',receiptFileStem:'wall_ceramic_cement_existing_f271',
  verifyCore:()=>verifyWallCeramicCementExistingF271(config,context.sourceRoot)};
 assert.equal(config.catalogAppend,undefined);return config;
}
function schema(model:AutomaticOwnerDefinition):PrimaryMeasureSelectionParameterV1[]{
 const consumers=buildMasterParameterCalculationConsumers(model);
 return model.parameters.map(p=>({parameterId:p.parameter_id,
 valueType:p.value_type,unitId:p.unit_id,visibilityRole:typeof p.truth_metadata.visibility_role==='string'?p.truth_metadata.visibility_role:undefined,
 valueSourceRole:typeof p.truth_metadata.value_source_role==='string'?p.truth_metadata.value_source_role:undefined,
 provenance:record(p.truth_metadata.provenance)?p.truth_metadata.provenance:undefined,constraints:p.constraints_json??{},
 formulaConsumers:consumers.formulaConsumers[p.parameter_id]}));}
async function calculate(model:AutomaticOwnerDefinition,c:Capture,input:Json,prices:CanonicalEstimatePriceItem[]=[]):Promise<CanonicalEstimateCompileCoreResult>{
 const selected=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema(model),submittedParameters:input,confirmedParameters:{}});
 assert.equal(selected.kind,'RESOLVED');assert(selected.kind==='RESOLVED');
 return compileCanonicalEstimateCore({operation:'compile',compilerVersion:'existing-wall-ceramic-cement-f271',catalogId,
  primaryMeasureParameterId:selected.primaryMeasure.parameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
  submittedParameters:input,confirmedParameters:canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters:input}),
  currencyCode:'KGS',priceItems:prices,priceSnapshotIds:prices.length?[fixture.pricedTEST_ONLY.snapshotId]:[],maximumResourceRows:model.resources.length,hashJson:hash});
}
function save(stem:string,data:unknown){const root=process.env.WALL_F271_ACTUAL_OUTPUT;assert(root,'WALL_F271_ACTUAL_OUTPUT_REQUIRED');mkdirSync(root,{recursive:true});
 writeFileSync(resolve(root,stem+'.json'),JSON.stringify(data,null,2)+'\n',{flag:'wx'});}
export function wallRetainedPureF271(config:Config,sourceRoot:string){
 const c=captured(sourceRoot),model=buildPublishedWallF271(original(c));assert.equal(config.catalogAppend,undefined);assert.equal(config.catalogId,catalogId);
 assert.deepEqual(config.runtimeProfileInput,{});assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[10,81,81]);
 const scopedBaseline=(inputParameters:Json)=>canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters});
 same(scopedBaseline({[method]:legacy}),{q:100});
 same(scopedBaseline({[method]:cement,[area]:'12.5',[height]:'3'}),{});
 same(scopedBaseline({[method]:cement,[height]:'3'}),{});
 same(scopedBaseline({}),{});
 for(const f of c.formulas)same(model.formulas.find(v=>v.formula_id===f.formula_id),f);
 for(const old of c.resources){const r=model.resources.find(v=>v.row_id===old.row_id);assert(r);assert(record(r)&&record(old));
  same(legacyRowProjectionF271(r),legacyRowProjectionF271(old));
  same(r.inclusion_ast,{kind:'and',operands:[{kind:'equals',parameterId:method,value:legacy},old.inclusion_ast]});}
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:independentMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
 assert.equal(source.nativeRows.find(r=>r.key==='whole-labour')?.ratePer100M2,'228.00');assert.equal(source.nativeRows.length,10);
 assert(!source.nativeRows.some(r=>r.key.includes('nail')));assert.equal(source.includedOperations[4]?.nameRu,'Распудривание облицованных поверхностей');
 assert(model.parameters.filter(p=>provision.needs.some(n=>n.parameterId===p.parameter_id)).every(p=>p.default_value===null&&p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'));
 assert.deepEqual(model.runtimeInput,{});assert(model.resources.filter(r=>r.row_id.startsWith(prefix)).every(r=>!r.procurement_eligible));
 const newArea=model.parameters.find(p=>p.parameter_id===area);assert(newArea);assert.equal(newArea.default_value,null);
 for(const input of [{q:100},{}])assert.equal(resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema(model),submittedParameters:input}).kind,'CLARIFICATION_REQUIRED');
 const identity=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema(model),submittedParameters:fixture.scenarios[2]!.input,
  parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}});assert.equal(identity.kind,'NEW_ROOT_REQUIRED');
 if(identity.kind==='NEW_ROOT_REQUIRED')same(identity.carryForward,{parameters:false,rowOverrides:false,prices:false});
 const editorSchema:Parameters<typeof validateCanonicalEstimateParameterInputs>[0]['schema']=model.parameters.filter(p=>model.ordinaryParameterIds.includes(p.parameter_id)).map(p=>{
  const valueType=p.value_type,role=p.truth_metadata.value_source_role;assert(valueType==='decimal'||valueType==='enum');
  assert(role==='USER_INPUT'||role==='VISIBLE_BASELINE_ASSUMPTION');return{parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,
   valueType,unitId:p.unit_id,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json??{},valueSourceRole:role};});
 const missing=validateCanonicalEstimateParameterInputs({schema:editorSchema,rawInputs:fixture.scenarios[3]!.input});
 assert(missing.issues.some(i=>i.parameterId===area&&(i.code==='REQUIRED_WHEN'||i.code==='REQUIRED')));
 return{scope:'PURE_CONFIG_SCHEMA_AND_EXACT_OLD_SOURCE_PRESERVATION_NOT_DATABASE_OR_UI',old59Preserved:true,native10:10,included6:6,unknownProvision6:6,
  nativeQuantityActualPASS:false,normalLocked:'UNRUN',retainedRepresentative:'UNRUN_EXISTING_PUBLISHER_OWNER_ONLY',FULL:false};
}
export async function verifyWallCeramicCementExistingF271(config:Config,sourceRoot:string):Promise<Json>{
 const pure=wallRetainedPureF271(config,sourceRoot);save('PURE_BEFORE_CORE',pure);const c=captured(sourceRoot),parent=original(c),model=buildPublishedWallF271(parent);
 let entries=0,results=0,rejects=0;let originalLegacy:CanonicalEstimateCompileCoreResult|undefined;
 for(const scenario of fixture.scenarios){
  entries++;save('CORE_ENTRY_'+String(entries).padStart(2,'0'),{case:scenario.key});let outcome:CanonicalEstimateCompileCoreResult;
  try{outcome=scenario.key==='original-legacy'?await compileCanonicalEstimateCore({operation:'compile',compilerVersion:config.contract,catalogId,
   primaryMeasureParameterId:'q',parameterDefinitions:[...parent.parameters],formulaDefinitions:[...parent.formulas],resourceDefinitions:[...parent.resources],
   submittedParameters:scenario.input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:59,hashJson:hash}):await calculate(model,c,scenario.input);
   save('CORE_OUTCOME_'+String(entries).padStart(2,'0'),{case:scenario.key,kind:'RESULT',result:outcome});
  }catch(error:unknown){const code=record(error)?error.code:null;save('CORE_OUTCOME_'+String(entries).padStart(2,'0'),{case:scenario.key,kind:'REJECT',code,message:error instanceof Error?error.message:String(error)});
   assert.equal(scenario.expected,'REJECT');assert.equal(code,'PARAMETER_VALIDATION_FAILED');rejects++;continue;}
  assert.notEqual(scenario.expected,'REJECT');results++;
  if(scenario.key==='original-legacy'){originalLegacy=outcome;continue;}
  if(scenario.key==='composed-legacy'){assert(originalLegacy);same(outcome.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.included_in_estimate,r.included_in_procurement]),originalLegacy.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.included_in_estimate,r.included_in_procurement]));
   assert(![...outcome.rows,...outcome.preliminaryNeeds].some(r=>r.row_id.startsWith(prefix)));continue;}
  assert(outcome.rows.every(r=>r.row_id.startsWith(prefix)));assert(outcome.preliminaryNeeds.every(r=>r.row_id.startsWith(prefix)&&r.quantity===null));
  if(scenario.key==='missing-own-area'){assert.equal(outcome.rows.length,0);assert.equal(outcome.parameters[area],undefined);assert.equal(outcome.preliminaryNeeds.length,22);
   assert.equal(outcome.totals.includedRowCount,0);assert.equal(Number(outcome.totals.amount),0);assert(outcome.preliminaryNeeds.every(r=>!r.procurement_eligible));continue;}
  assert.equal(outcome.rows.length,16);assert.equal(outcome.preliminaryNeeds.length,6);
  for(const[key,values]of Object.entries(fixture.expectedNative12_5)){const r=outcome.rows.find(row=>row.row_id===prefix+':'+key);assert(r);assert.equal(r.quantity,values[0]);assert.equal(r.unit_id,values[1]);}
  assert(outcome.rows.every(r=>!r.included_in_procurement));
  const lab=model.resources.find(r=>r.row_id===prefix+':whole-labour');assert(lab);assert.equal(canonicalEstimateOperationReferences(lab.resource_graph.operationCompositionV1).length,7);
 }
 const prices:CanonicalEstimatePriceItem[]=Object.entries(fixture.pricedTEST_ONLY.prices).map(([key,v])=>{
  assert(typeof v[0]==='string'&&typeof v[1]==='string');return{price_key:prefix+':'+key,unit_id:v[1],currency_code:'KGS',unit_price:v[0],snapshot_id:fixture.pricedTEST_ONLY.snapshotId};});
 entries++;save('CORE_ENTRY_'+String(entries).padStart(2,'0'),{case:'TEST_ONLY_NATIVE_KNOWN_PRICE_WITH_MACHINE_HOLD'});
 let cost:CanonicalEstimateCompileCoreResult;
 try{cost=await calculate(model,c,{[method]:cement,[area]:'100',[height]:'3'},prices);save('CORE_OUTCOME_'+String(entries).padStart(2,'0'),{case:'TEST_ONLY_NATIVE_KNOWN_PRICE_WITH_MACHINE_HOLD',kind:'RESULT',result:cost});}
 catch(error:unknown){save('CORE_OUTCOME_'+String(entries).padStart(2,'0'),{case:'TEST_ONLY_NATIVE_KNOWN_PRICE_WITH_MACHINE_HOLD',kind:'REJECT',message:error instanceof Error?error.message:String(error)});throw error;}
 results++;assert.equal(cost.totals.amount,fixture.pricedTEST_ONLY.expectedKnownAmount);assert.equal(cost.preliminaryNeeds.length,6);
 assert(cost.rows.every(r=>!r.included_in_procurement));for(const key of ['operator-labour','loader','hoist']){const r=cost.rows.find(v=>v.row_id===prefix+':'+key);assert(r);assert.equal(r.included_in_estimate,false);}
 assert.deepEqual([entries,results,rejects],[7,5,2]);const final={scope:'TEST_ONLY_ONE_EXISTING_WALL_METHOD_FINITE_NOT_WORKER_SAVE_OR_PUBLICATION',entries,results,rejects,
  totalKnownTESTKGS:cost.totals.amount,syntheticPrices:7,native10:10,included6:6,unknownProvision6:6,actualProjectDocuments:0,normalLocked:'UNRUN',UI:'UNRUN',FULL:false};
 save('FINAL_F271',final);return final;
}
