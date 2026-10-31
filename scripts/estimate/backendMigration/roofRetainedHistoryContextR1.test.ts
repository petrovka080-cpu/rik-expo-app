// Finite retained history context and unchanged original migration regressions.
import {assertExactRoofRetainedHistoryEdgeR1 as assertEdge,assertExactRoofRetainedHistoryV14EdgeR11 as assertV14Edge,roofRetainedHistoryDispatchR1 as dispatch,resolveRoofRetainedHistoryContextR1 as resolve} from './roofRetainedHistoryContextR1';
import {roofPreparationMigrationSemanticHashV1 as semantics,admitRoofPreparationMigrationProofV1,type RoofPreparationMigrationModelV1 as Model} from '../../../src/lib/estimate/backendPlatform/canonicalRoofPreparationMigrationV1';
import {buildMaster212RoofWholeSystemSuccessorR1 as build,master212RoofCapturedRepresentativeR1 as captured,master212RoofCapturedParentR1 as capture} from '../../../src/lib/estimate/v4/master212RoofWholeSystemsR1';
import {buildMasterPublicationResourceRowsR1 as publishRows} from '../r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {readFrozenDefinitionSnapshotV1} from '../../../src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1';
import {admitRoofValleyMigrationProofV1} from '../../../src/lib/estimate/backendPlatform/canonicalRoofValleyMigrationV1';
import {admitRoofScreedMigrationProofV1,buildRoofStageRestorationV2} from '../../../src/lib/estimate/backendPlatform/canonicalRoofScreedMigrationV1';
import {admitRoofMetalTrimMigrationProofV1,buildRoofStageRestorationV3} from '../../../src/lib/estimate/backendPlatform/canonicalRoofMetalTrimMigrationV1';
import {admitRoofLowerLayersMigrationProofV1,buildRoofStageRestorationV4} from '../../../src/lib/estimate/backendPlatform/canonicalRoofLowerLayersMigrationV1';
import {admitRoofHangingGuttersMigrationProofV1,buildRoofStageRestorationV5} from '../../../src/lib/estimate/backendPlatform/canonicalRoofHangingGuttersMigrationV1';
import {admitRoofScreed25MigrationProofV1,buildRoofStageRestorationV6,readRoofStageRestorationV6} from '../../../src/lib/estimate/backendPlatform/canonicalRoofScreed25MigrationV1';
import {canonicalManualPriceMigrationBindings as prices,canonicalManualExclusionMigrationBindings as exclusions,canonicalManualQuantityMigrationBindings as quantities,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {resolvePrimaryMeasureSelectionV1 as primary} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {master212RoofControlR1 as normal} from '../r4a13/prepareMaster212RoofWholeSystemsR1';
type Json=Record<string,any>;
const registration=require('../../../data/estimate-benchmarks/fixtures/master36-roof-retained-history-edge-r1.json')as Json;
const actualHeader=require('../../../data/estimate-benchmarks/fixtures/master36-roof-retained-history-header-r1.json')as Json;
const id=(r:Json)=>({id:r.definition.id,catalogId:r.definition.catalog_id,sha256:r.definition.definition_sha256});
const copy=<T,>(x:T):T=>structuredClone(x);
function capturedModel(row:Json):Json&Model{const{resources,formulas,parameters}=row;if(!Array.isArray(resources)||!Array.isArray(formulas)||!Array.isArray(parameters))throw Error("CAPTURED_MODEL_ARRAYS_REQUIRED");return{...row,resources,formulas,parameters};}
function fixture(){const parent=capturedModel(capture(registration.catalogId)),built=build(captured(registration.catalogId));
 // ROOT independently pinned this publication/JSON roundtrip to actual SQL c3b4...22d.
 const current=JSON.parse(JSON.stringify({...built,resources:publishRows(built.resources)}));
 return{parent,current,input:{currentDefinition:copy(actualHeader),currentModel:current,parentDefinition:parent.definition,parentModel:parent}};
}
const load=(file:string,key:'reps'|'representatives')=>readFrozenDefinitionSnapshotV1(require('../../../data/estimate-benchmarks/fixtures/'+file),key)as any;
function originalFixedReceipt(parent:Json){
 const select=(d:Json,field:string)=>(d[field]as Json[]).find(r=>r.definition.catalog_id===registration.catalogId)!;
 const five=select(load('roof-planned-preparation-parents-s27-67.json','reps'),'reps'),six=select(load('roof-valley-preparation6-parents-s27-67.json','reps'),'reps'),seven=select(load('roof-screed-valley7-parents-s27-67.json','reps'),'reps'),eight=select(load('roof-metal-screed8-parents-s27-67.json','reps'),'reps'),nine=select(load('roof-layers-metal9-parents-s27-67.json','reps'),'reps'),ten=select(load('roof-gutters-layers10-parents-s27-67.json','reps'),'reps'),eleven=select(load('roof-screed25-gutters11-parents-s27-67.json','representatives'),'representatives');
 const admit=(fn:any,from:Json,to:Json,key:string)=>{const a=fn({proof:to.definition.source_metadata[key],fromDefinition:id(from),toDefinition:id(to),from,to});expect(a).not.toBeNull();return a;};
 const preparation=admit(admitRoofPreparationMigrationProofV1,five,six,'roofPreparationMigrationV1'),valley=admit(admitRoofValleyMigrationProofV1,six,seven,'roofValleyMigrationV1'),screed=admit(admitRoofScreedMigrationProofV1,seven,eight,'roofScreedMigrationV1'),metal=admit(admitRoofMetalTrimMigrationProofV1,eight,nine,'roofMetalTrimMigrationV1'),layers=admit(admitRoofLowerLayersMigrationProofV1,nine,ten,'roofLowerLayersMigrationV1'),gutters=admit(admitRoofHangingGuttersMigrationProofV1,ten,eleven,'roofHangingGuttersMigrationV1'),screed25=admit(admitRoofScreed25MigrationProofV1,eleven,parent,'roofScreed25MigrationV1');
 const v2=buildRoofStageRestorationV2({screed,previous:{preparation,valley}}),v3=buildRoofStageRestorationV3({metalTrim:metal,previous:v2}),v4=buildRoofStageRestorationV4({lowerLayers:layers,previous:v3}),v5=buildRoofStageRestorationV5({gutters,previous:v4});
 return buildRoofStageRestorationV6({screed25,previous:v5});
}
test('actual SQL pins and standard publication projection agree without trusting a raw builder model',()=>{const f=fixture();expect(semantics(f.parent)).toBe(registration.parent.semanticSha256);expect(semantics(f.current)).toBe(registration.current.semanticSha256);expect(()=>assertEdge(f.input)).not.toThrow();expect(dispatch(f.input.currentDefinition)).toBe('REQUIRES_EXACT_PARENT_AND_CHAIN');});
test('catalog select* and actual worker selected columns normalize identically',()=>{const f=fixture();const worker={...f.current,formulas:f.current.formulas.map((v:Json)=>Object.fromEntries(['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'].map(k=>[k,v[k]]))),resources:f.current.resources.map((v:Json)=>({...v,_binding_price_keys:['TEST_ONLY_PRICE_BINDING']}))};expect(semantics(worker)).toBe(registration.current.semanticSha256);expect(()=>assertEdge({...f.input,currentModel:worker})).not.toThrow();});
test('only validated original v12 chain allows historical-only dispatch; no current-stage receipt escapes',async()=>{const f=fixture(),receipt=originalFixedReceipt(f.parent),raw=stable(receipt),calls:string[]=[];const result=await resolve({...f.input,loadExactParent:async id=>{calls.push(id);return{definition:f.parent.definition,model:f.parent};},validateOriginalFixedChain:async(d,m)=>{expect(d.id).toBe(registration.parent.id);expect(semantics(m)).toBe(registration.parent.semanticSha256);return{receipt};}});expect(calls).toEqual([registration.parent.id]);expect(result.kind).toBe('VALIDATED_HISTORICAL_ONLY');expect(result).toMatchObject({historicalParentDefinitionId:registration.parent.id,currentStageReceiptAllowed:false});expect(result).not.toHaveProperty('receipt');expect(result).not.toHaveProperty('roofStageRestorationV6');expect(stable(receipt)).toBe(raw);expect(readRoofStageRestorationV6(receipt)?.definitionId).toBe(registration.parent.id);});
test('native parent and no-roof-proof cards keep original current path, with no parent callback',async()=>{const f=fixture();for(const definition of [f.parent.definition,{id:'TEST_NO_ROOF_PROOF',source_metadata:{}}])expect(await resolve({currentDefinition:definition,currentModel:f.parent,loadExactParent:async()=>{throw Error('must not load');},validateOriginalFixedChain:async()=>{throw Error('must not validate');}})).toEqual({kind:'CURRENT'});});
test.each(['current-id','current-hash','current-version','parent-version','catalog','parent-id','parent-hash','baseline','capture','fingerprint','rewrite-proof','erase-proof','extra-continuation','formula','quantity-unit','paid-owner','source','legacy-gate','parameter','duplicate'])('finite edge rejects %s without oldproof rewrite or ancestry trust',kind=>{const f=fixture(),i=copy(f.input);if(kind==='current-id')i.currentDefinition.id='00000000-0000-4000-8000-000000000099';if(kind==='current-hash')i.currentDefinition.definition_sha256='0'.repeat(64);if(kind==='current-version')i.currentDefinition.definition_version=14;if(kind==='parent-version')i.parentDefinition.definition_version=11;if(kind==='catalog')i.currentDefinition.catalog_id+='-foreign';if(kind==='parent-id')i.parentDefinition.id='00000000-0000-4000-8000-000000000098';if(kind==='parent-hash')i.parentDefinition.definition_sha256='0'.repeat(64);if(kind==='baseline')i.currentDefinition.source_metadata.retainedParentBindingSuccessorV1.parentBaselineId='00000000-0000-4000-8000-000000000097';if(kind==='capture')i.currentDefinition.source_metadata.retainedParentBindingSuccessorV1.capturedParentSha256='0'.repeat(64);if(kind==='fingerprint')i.currentDefinition.source_metadata.sourceFingerprint='0'.repeat(64);if(kind==='rewrite-proof')i.currentDefinition.source_metadata.roofScreed25MigrationV1.toDefinitionId=i.currentDefinition.id;if(kind==='erase-proof')delete i.currentDefinition.source_metadata.roofScreed25MigrationV1;if(kind==='extra-continuation')i.currentDefinition.source_metadata.retainedParentBindingContinuationV1={};if(kind==='formula')i.currentModel.formulas[0].ast={kind:'literal',value:'999'};if(kind==='quantity-unit')i.currentModel.resources[0].unit_id='t';if(kind==='paid-owner')i.currentModel.resources[0].cost_owner_id='foreign';if(kind==='source')i.currentModel.resources[0].source_metadata={unverified:true};if(kind==='legacy-gate')i.currentModel.resources[0].inclusion_ast={kind:'literal',value:true};if(kind==='parameter')i.currentModel.parameters[0].unit_id='t';if(kind==='duplicate')i.currentModel.resources[1].row_id=i.currentModel.resources[0].row_id;expect(()=>assertEdge(i)).toThrow('Exact retained roof history');});
test.each([null,{},'rebound-current'])('absent/malformed/rebound old receipt %s never closes context',async value=>{const f=fixture();let receipt:any=value;if(value==='rebound-current'){receipt=originalFixedReceipt(f.parent);receipt.definitionId=registration.current.id;}await expect(resolve({...f.input,loadExactParent:async()=>({definition:f.parent.definition,model:f.parent}),validateOriginalFixedChain:async()=>receipt===null?null:{receipt}})).rejects.toMatchObject({code:'DEFINITION_INTEGRITY_FAILED'});});
test('new quantities/exclusions stay fail-closed despite historical price compatibility',()=>{const f=fixture(),oldP=prices(f.parent),nextP=prices(f.current),oldQ=quantities(f.parent),nextQ=quantities(f.current),oldE=exclusions(f.parent),nextE=exclusions(f.current);const row=Object.keys(oldQ).find(id=>oldQ[id]!==nextQ[id]&&oldE[id]!==nextE[id]);expect(row).toBeDefined();for(const override of [{quantity:'77'},{includedInEstimate:false,includedInProcurement:false}])expect(canMigrate({rowOverrides:{[row!]:{...override,provenance:{kind:'manual'}}},customRows:[],fromBindings:oldP,toBindings:nextP,fromQuantityBindings:oldQ,toQuantityBindings:nextQ,fromExclusionBindings:oldE,toExclusionBindings:nextE})).toBe(false);});
test('saved newprimary transition remains NEW_ROOT_REQUIRED and has no carry',()=>{const f=fixture(),r=primary({selectionMetadata:actualHeader.applicability.primaryMeasureSelectionV1,parameterSchema:f.current.parameters.map((p:Json)=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,visibilityRole:p.truth_metadata.visibility_role,valueSourceRole:p.truth_metadata.value_source_role,constraints:p.constraints_json,formulaConsumers:p.truth_metadata.formula_consumers})),submittedParameters:normal(registration.catalogId),parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}});expect(r.kind).toBe('NEW_ROOT_REQUIRED');if(r.kind==='NEW_ROOT_REQUIRED')expect(r.carryForward).toEqual({parameters:false,rowOverrides:false,prices:false});});

// New finite v14 context only. ROOT can select /^v14 / without rerunning the
// original edge/migration suites. Data below are actual SQL captures, not a
// rebuilt current Config and not a rewritten/restamped old receipt.
const v14Registration=require('../../../data/estimate-benchmarks/fixtures/roof-retained-history-v14-continuation-r11.json')as Json;
const v14Readback=require('../../../data/estimate-benchmarks/fixtures/roof-retained-history-v14-readback-r11.json')as Json;
const retainedV13=require('../../../data/estimate-benchmarks/fixtures/roof-existing-source-profile-r11.json')as{captures:Json[]};
function v14Fixture(){
 const old=retainedV13.captures.find(c=>c.definition.id===registration.current.id);
 if(!old)throw Error('EXACT_V13_CAPTURE_REQUIRED');
 const current:Json=copy(v14Readback.capture),parent:Json=copy(old),native:Json=capture(registration.catalogId);
 return{current,parent,native,input:{currentDefinition:current.definition,currentModel:capturedModel(current),parentDefinition:parent.definition,parentModel:capturedModel(parent)}};
}
let v14OldReceipt:ReturnType<typeof originalFixedReceipt>|undefined;
function originalV14FixedReceipt(){if(v14OldReceipt===undefined)v14OldReceipt=originalFixedReceipt(v14Fixture().native);return copy(v14OldReceipt);}
async function resolveV14(f:ReturnType<typeof v14Fixture>,receipt:unknown=originalV14FixedReceipt()){
 const calls:string[]=[];
 const result=await resolve({currentDefinition:f.input.currentDefinition,currentModel:f.input.currentModel,
  loadExactParent:async definitionId=>{calls.push(definitionId);const value=definitionId===f.parent.definition.id?f.parent:definitionId===f.native.definition.id?f.native:null;if(!value)throw Error('UNEXPECTED_ANCESTRY_WALK');return{definition:value.definition,model:capturedModel(value)};},
  validateOriginalFixedChain:async(definition,model)=>{expect(definition.id).toBe(registration.parent.id);expect(semantics(model)).toBe(registration.parent.semanticSha256);return receipt==null?null:{receipt};}});
 return{result,calls};
}
test.each(['catalog','worker-six-formula-fields'])('v14 actual %s projection validates only exact 14-to13-to12 and historical receipt',async mode=>{
 const f=v14Fixture();
 if(mode==='worker-six-formula-fields')f.input.currentModel=capturedModel({...f.current,
  formulas:f.current.formulas.map((formula:Json)=>Object.fromEntries(['formula_id','output_unit_id','expression_source','ast','input_parameter_ids','ast_sha256'].map(key=>[key,formula[key]]))),
  resources:f.current.resources.map((row:Json)=>({...row,_binding_price_keys:['TEST_ONLY_PRICE_BINDING_NOT_PHYSICAL']}))});
 expect(()=>assertV14Edge(f.input)).not.toThrow();
 const receipt=originalV14FixedReceipt(),before=stable(receipt),{result,calls}=await resolveV14(f,receipt);
 expect(calls).toEqual([registration.current.id,registration.parent.id]);expect(result).toMatchObject({kind:'VALIDATED_HISTORICAL_ONLY',historicalParentDefinitionId:registration.parent.id,currentStageReceiptAllowed:false});
 expect(result).not.toHaveProperty('receipt');expect(result).not.toHaveProperty('roofStageRestorationV6');expect(stable(receipt)).toBe(before);
 expect(readRoofStageRestorationV6(receipt)?.definitionId).toBe(registration.parent.id);
});
test.each(['unchanged-guide','unchanged-provenance','unchanged-visible-when','remaining-authority','selector','unit','default','formula-source','owner','source-norm'])('v14 full actual projection rejects fresh %s tamper',kind=>{
 const f=v14Fixture(),before=semantics(f.input.currentModel),changed=new Set(Object.keys(v14Registration.truthChanges));
 const untouched=f.current.parameters.find((p:Json)=>!changed.has(p.parameter_id)&&p.truth_metadata?.guide);
 const authority=f.current.parameters.find((p:Json)=>p.parameter_id===v14Registration.compactAuthority.parameterIds[0]);
 const selector=f.current.parameters.find((p:Json)=>p.parameter_id===v14Registration.compactAuthority.sourceProfileMetadataOnlyV1.selectorParameterId);
 if(!untouched||!authority||!selector)throw Error('EXACT_CAPTURED_TAMPER_TARGET_REQUIRED');
 if(kind==='unchanged-guide')untouched.truth_metadata.guide.guide_short_ru+=' TEST_ONLY_TAMPER';
 if(kind==='unchanged-provenance')untouched.truth_metadata.provenance={...untouched.truth_metadata.provenance,test_only:true};
 if(kind==='unchanged-visible-when')untouched.truth_metadata.visible_when={kind:'literal',value:false};
 if(kind==='remaining-authority')authority.truth_metadata.provenance.consumer_input_role_v1='OBJECT_FACT';
 if(kind==='selector')selector.truth_metadata.provenance.consumer_input_role_v1='OBJECT_FACT';
 if(kind==='unit')untouched.unit_id='t';if(kind==='default')untouched.default_value='999';
 if(kind==='formula-source')f.current.formulas[0].expression_source='999';
 if(kind==='owner')f.current.resources[0].cost_owner_id='TEST_ONLY_FOREIGN_OWNER';
 if(kind==='source-norm')f.current.resources[0].source_metadata.normativeRate='999';
 if(['unchanged-guide','unchanged-provenance','unchanged-visible-when','remaining-authority','selector','formula-source'].includes(kind))expect(semantics(f.input.currentModel)).toBe(before);
 expect(()=>assertV14Edge(f.input)).toThrow('Exact retained roof history');
});
test.each(Object.keys(v14Registration.resourceChanges))('v14 rejects changed retained inclusion %s even with a fresh old semantic digest',rowId=>{
 const f=v14Fixture(),row=f.current.resources.find((r:Json)=>r.row_id===rowId);if(!row)throw Error('EXACT_SOURCE_CONSUMER_REQUIRED');
 row.inclusion_ast={kind:'literal',value:true};expect(semantics(f.input.currentModel)).not.toBe(semantics(v14Fixture().input.currentModel));
 expect(()=>assertV14Edge(f.input)).toThrow('Exact retained roof history');
});
test.each(['definition-sha','parent-sha','source-metadata','compact-proof','lineage-parent','applicability','old-proof-rewrite','duplicate-row'])('v14 rejects %s identity and proof tamper',kind=>{
 const f=v14Fixture(),d=f.input.currentDefinition;
 if(kind==='definition-sha')d.definition_sha256='0'.repeat(64);if(kind==='parent-sha')f.input.parentDefinition.definition_sha256='0'.repeat(64);
 if(kind==='source-metadata')d.source_metadata.sourceFingerprint='0'.repeat(64);
 if(kind==='compact-proof')d.source_metadata.retainedParentBindingLineageV1.entries[0].successor.truthAuthorityOnlyV1.sourceProfileMetadataOnlyV1.existingSourceConsumerReuseV1.additionsSha256='0'.repeat(64);
 if(kind==='lineage-parent')d.source_metadata.retainedParentBindingLineageV1.entries[0].parentDefinitionId=registration.parent.id;
 if(kind==='applicability')d.applicability.sourceProfileSelectionV1.profiles[0].when={kind:'literal',value:true};
 if(kind==='old-proof-rewrite')d.source_metadata.roofScreed25MigrationV1.toDefinitionId=d.id;
 if(kind==='duplicate-row')f.current.resources[1].row_id=f.current.resources[0].row_id;
 expect(()=>assertV14Edge(f.input)).toThrow('Exact retained roof history');
});
test('v14 unknown child cannot reuse retained marker or a trusted Boolean',()=>{const f=v14Fixture(),d=copy(f.current.definition);d.id='00000000-0000-4000-8000-000000000088';d.definition_version=15;d.source_metadata.trustedHistory=true;expect(()=>dispatch(d)).toThrow('Exact retained roof history');});
test.each(['deleted','repointed'])('v14 known finite lineage cannot become CURRENT after old slot is %s and terminal proofs erased',kind=>{
 const d=copy(v14Fixture().current.definition);d.id='00000000-0000-4000-8000-000000000087';d.definition_version=15;
 for(const key of ['roofStandaloneWorkScopeMigrationV1','roofScreed25StandaloneMigrationV1','roofScreed25MigrationV1','roofHangingGuttersMigrationV1','roofLowerLayersMigrationV1','roofMetalTrimMigrationV1','roofScreedMigrationV1','roofValleyMigrationV1','roofPreparationMigrationV1'])delete d.source_metadata[key];
 if(kind==='deleted')delete d.source_metadata.retainedParentBindingSuccessorV1;
 else d.source_metadata.retainedParentBindingSuccessorV1.parentDefinitionId=registration.current.id;
 expect(d.source_metadata.retainedParentBindingLineageV1.entries[0].parentDefinitionId).toBe(registration.current.id);
 expect(()=>dispatch(d)).toThrow('Exact retained roof history');
});
test.each(['missing','truthy-boolean','rebound-v14'])('v14 old fixed receipt %s never becomes current evidence',async kind=>{
 const f=v14Fixture();let receipt:unknown=kind==='missing'?null:true;
 if(kind==='rebound-v14'){const changed=originalV14FixedReceipt();changed.definitionId=f.current.definition.id;receipt=changed;}
 await expect(resolveV14(f,receipt)).rejects.toMatchObject({code:'DEFINITION_INTEGRITY_FAILED'});
});
