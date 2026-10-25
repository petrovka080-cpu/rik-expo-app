import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildRoofFlat003006R24 as build,roofFlat003006PackR24 as pack,roofJoint006ProfilesR24 as joints,
 roofFlat003006MapEntriesR24} from '../../../src/lib/estimate/v4/roofFlat003006CommonR24';
import {roofMasticMeshSnapshotR24 as snapshot,roofMasticMeshSchemaR24 as schema,
 prepareRoofMasticMeshExisting003R24 as baseConfig} from './prepareRoofMasticMeshExisting003R24';
import {roofMasticMeshPackR24 as fieldPack,roofMasticMeshProfilesR24 as fields,roofMasticMeshControlsR24 as fieldIds,
 roofMasticMeshPostRowR24,type RoofMasticMeshCurrentCaptureR24 as Capture} from '../../../src/lib/estimate/v4/roofMasticMeshExisting003R24';
import {resolveCanonicalEstimateProfileInputsS2723} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateProfileInputResolverS2723';
import {assertCanonicalPrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput as CoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateResourceOperationSections} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
type Json=Record<string,unknown>;
const obj=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const ids=pack.jointControls;
function save(name:string,value:unknown){const root=process.env.R24_FLAT003006_ACTUAL_OUTPUT;if(!root)return;
 mkdirSync(root,{recursive:true});writeFileSync(resolve(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}
function trustedBaseline(c:Capture){return canonicalApprovedBaselineRuntimeParameters({input_values:c.baseline.input_values,input_classification:c.baseline.input_classification});}
/** Exactly the existing worker producer -> primary selection -> sole core,
 * including006-alone via the declared catalog primary. No custom fallback. */
async function compileData(data:Readonly<{parameters:Capture['parameters'];formulas:Capture['formulas'];resources:Capture['resources'];applicability:Json}>,
 c:Capture,input:Readonly<Json>,onEntry:()=>void){
 const parameterSchema=schema(data),profile=resolveCanonicalEstimateProfileInputsS2723({catalogId:c.definition.catalog_id,parameterSchema,
  sourceProfileSelectionMetadata:data.applicability.sourceProfileSelectionV1,confirmedParameters:trustedBaseline(c),effectiveUserParameters:input});
 const primary=assertCanonicalPrimaryMeasureSelectionV1({selectionMetadata:data.applicability.primaryMeasureSelectionV1,parameterSchema,
  submittedParameters:input,confirmedParameters:profile.confirmedParameters});assert.equal(primary.kind,'RESOLVED');
 onEntry();return compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:c.definition.catalog_id,
  primaryMeasureParameterId:primary.kind==='RESOLVED'?primary.primaryMeasure.parameterId:null,parameterDefinitions:[...data.parameters],formulaDefinitions:[...data.formulas],
  resourceDefinitions:[...data.resources],submittedParameters:{...input},confirmedParameters:{...profile.confirmedParameters},currencyCode:'KGS',priceItems:[],maximumResourceRows:512,
  sourceProfileSelectionV1:{metadata:data.applicability.sourceProfileSelectionV1,effectiveUserParameters:input},hashJson:v=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v))});
}
export function compileRoofFlat003006R24(model:ReturnType<typeof build>,input:Readonly<Json>,onEntry:()=>void){return compileData(model,model.capture,input,onEntry);}
function operationSections(result:Awaited<ReturnType<typeof compileRoofFlat003006R24>>){return canonicalEstimateResourceOperationSections([...result.rows,...result.preliminaryNeeds].map(r=>{
 const trace=r.calculation_trace;assert(obj(trace)&&obj(trace.resourceGraph)&&typeof r.title_ru==='string');
 return{rowId:r.row_id,...(typeof r.resource_spec_id==='string'?{sourceRowId:r.resource_spec_id}:{}),titleRu:r.title_ru,operation:trace.resourceGraph.operationCompositionV1};}));}
function normalizedLegacyRows(rows:readonly object[],present:ReadonlySet<string>){return rows.map(row=>{const next:Json=structuredClone(row)as Json;
 delete next.row_sha256;delete next.need_sha256;
 if(obj(next.calculation_trace)&&obj(next.calculation_trace.resourceGraph)){
  const op=next.calculation_trace.resourceGraph.operationCompositionV1;
  if(obj(op)&&Array.isArray(op.additionalOperations)){
   const keep=op.additionalOperations.filter(r=>obj(r)&&(!Array.isArray(r.whenResourcePresent)||r.whenResourcePresent.some(id=>typeof id==='string'&&present.has(id))));
   if(keep.length)op.additionalOperations=keep;else delete op.additionalOperations;
  }
 }
 return next;});}
const literal37_5={mastic:{workers:'30.67875',included_machine_operators:'0.16875',tower_crane_8t:'0.10875',truck_crane_10t:'0.06',mobile_bitumen_boiler_400l:'1.62',flatbed_truck_5t:'0.09',hot_roof_mastic:'0.198',calibrated_head_dowels:'0.002625',mineral_wool:'0.96375',installation_gun_cartridges:'306.75',fine_dressed_roof_felt:'129.375',galvanized_sheet_07:'0.18'},
 torch:{workers:'32.6175',included_machine_operators:'0.165',tower_crane_8t:'0.12375',truck_crane_10t:'0.04125',flame_burner:'1.8',flatbed_truck_5t:'0.06375',propane_butane:'2.9625',calibrated_head_dowels:'0.002625',mineral_wool:'0.96375',installation_gun_cartridges:'306.75',fine_dressed_roof_felt:'129.375',galvanized_sheet_07:'0.18'}};
const literal125Torch={workers:'108.725',included_machine_operators:'0.55',tower_crane_8t:'0.4125',truck_crane_10t:'0.1375',flame_burner:'6',flatbed_truck_5t:'0.2125',propane_butane:'9.875',calibrated_head_dowels:'0.00875',mineral_wool:'3.2125',installation_gun_cartridges:'1022.5',fine_dressed_roof_felt:'431.25',galvanized_sheet_07:'0.6'};
function assertJointWhole(result:Awaited<ReturnType<typeof compileRoofFlat003006R24>>,key:'mastic'|'torch',expected:Readonly<Record<string,string>>){
 const p=joints[key],other=joints[key==='mastic'?'torch':'mastic'],all=[...result.rows,...result.preliminaryNeeds],native=all.filter(r=>r.row_id.startsWith(p.prefix+':'));
 assert.equal(native.length,12);assert(!all.some(r=>r.row_id.startsWith(other.prefix+':')));
 for(const[role,q]of Object.entries(expected)){const row=native.find(r=>r.row_id===p.prefix+':'+role);assert(row);assert.equal(row.quantity,q);assert.equal(row.unit_price,null);assert.equal(row.procurement_eligible,false);}
 assert(result.parameters[ids.conditions]==null&&result.parameters[ids.measurement]==null);
 const sections=operationSections(result),ops=joints.mastic.sourceOperationRoster;
 for(const op of ops)assert(sections.some(s=>s.operation?.operationId===pack.prefix+':006:'+op.operationKey));
 const steel=p.prefix+':galvanized_sheet_07';assert.equal(all.filter(r=>r.row_id===steel).length,1);
 assert.equal(sections.filter(s=>s.resourceIds.includes(steel)).length,1);assert(sections.some(s=>s.sharedResources.some(r=>r.rowId===steel)));
 for(const need of pack.newPhysicalNeeds.filter(n=>n.key!=='boiler-physical-stock'))assert.equal(result.preliminaryNeeds.find(r=>r.row_id===need.rowId)?.quantity,null);
 const post=all.filter(r=>r.row_id===roofMasticMeshPostRowR24),stock=all.filter(r=>r.row_id===pack.newPhysicalNeeds.find(n=>n.key==='boiler-physical-stock')!.rowId);
 if(key==='mastic'){assert.equal(post.length,1);assert.equal(stock.length,1);assert.equal(post[0]!.quantity,null);assert.equal(stock[0]!.quantity,null);
  assert(sections.some(s=>s.operation?.operationId===pack.prefix+':006:additional_roll_layers'&&s.sharedResources.some(r=>r.rowId===roofMasticMeshPostRowR24)));}
 else{assert.equal(post.length,0);assert.equal(stock.length,0);for(const suffix of ['torch-gas-containers','torch-burner-line'])assert.equal(all.filter(r=>r.row_id==='master212:roof:r1:need:'+suffix).length,1);}
}
export function prepareRoofFlat003006CommonR24(context:Parameters<typeof baseConfig>[0]):Config{
 const base=baseConfig(context),c=snapshot(context.sourceRoot).capture,model=build(c),oldMap=base.passport.independentCompletenessMap;
 assert(oldMap&&Array.isArray(oldMap.entries)&&Array.isArray(oldMap.evidenceReferences));
 const map={...oldMap,entries:[...oldMap.entries,...roofFlat003006MapEntriesR24()],evidenceReferences:[...oldMap.evidenceReferences,
  'data/estimate-benchmarks/source-packs/roof-flat003006-composition-r24.json','data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole01-mastic-r24.json',
  'data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole02-torch-r24.json'],fullTechnicalAcceptance:false};
 const unresolved=new Set(pack.newPhysicalNeeds.map(n=>n.parameterId).concat('roof_mastic_mesh003_hot_feed_post_sets_r24'));
 const retained:MasterRetainParentBindingsR1={...base.binding.retainParentBindings!,newParameterSources:Object.fromEntries(model.newParameterIds.map(id=>[id,
  {kind:unresolved.has(id)?'UNRESOLVED'as const:'KNOWN'as const,sourceIds:unresolved.has(id)?[]:[pack.prospectiveAbsenceOnlyRegistrySourceKey]}]))};
 assert.equal(retained.capturedSourcePreimage?.expected,null);assert.equal(retained.capturedSourcePreimage?.sourceKey,pack.prospectiveAbsenceOnlyRegistrySourceKey);
 const byRow={...base.binding.applicabilityByRowId,...Object.fromEntries(model.native006RowIds.map(id=>[id,{sourceArtifactSha256:pack.registrySourceArtifactSha256,
  exactColumn:id.startsWith(joints.mastic.prefix+':')?joints.mastic.normId:joints.torch.normId,wholeColumnRows:12,sourceBasisQuantity:'100',sourceBasisUnitId:'linear_m',
  ownMeasureParameterId:ids.length,publicMethodNotProjectApproval:true,fullTechnicalAcceptance:false}]))};
 const config:Config={...base,contract:pack.contract,stopCode:'ROOF_FLAT003006_R24',applicationName:'roof-flat003006-common-r24',
  outputRoot:context.outputRoot,normId:'12-01-003-01/02 +12-01-006-01/02',sourceId:pack.prospectiveAbsenceOnlyRegistrySourceKey,
  sourcePaths:[...base.sourcePaths,'data/estimate-benchmarks/source-packs/roof-flat003006-composition-r24.json',
   'data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole01-mastic-r24.json','data/estimate-benchmarks/source-packs/roof-expansion-joint-native-whole02-torch-r24.json',
   'src/lib/estimate/v4/roofFlat003006CommonR24.ts','scripts/estimate/r4a13/prepareRoofFlat003006CommonR24.ts','scripts/estimate/r4a13/roofFlat003006CommonR24.test.ts'],
  sourceMetadata:{...base.sourceMetadata,source_title:'КРЕР12: армированное мастичное поле и целые способы деформационного шва',
   source_kind:'FIRST_ABSENCE_ONLY_WHOLE003_AND006_BUNDLE_SAME_OFFICIAL_ARTIFACT',exact_locator:'КРЕР12PDF11–12:00301/02 whole12/12,4операции;PDF15:00601/02 whole12/12,5операций,100м шва',
   use_restriction:base.sourceMetadata.use_restriction+' Собственная длина шва независима от поля. Один physical stock-owner, количество котлов не выводится из часов. Source key допускается только как первый отсутствующий, без promotion существующей записи.'},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,applicability:model.applicability,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  shortInput:{[fieldIds.publicMethod]:pack.jointOnlyPublicWorkScopeChoice,[ids.method]:pack.jointChoices.mastic,[ids.length]:'37.5',[fieldIds.area]:'0'},
  acceptanceInput:{[fieldIds.publicMethod]:pack.jointOnlyPublicWorkScopeChoice,[ids.method]:pack.jointChoices.mastic,[ids.length]:'37.5',[fieldIds.area]:'0'},
  binding:{...base.binding,rowId:model.nativeRowIds[0]!,additionalRowIds:model.nativeRowIds.slice(1),applicabilityByRowId:byRow,retainParentBindings:retained},
  passport:{...base.passport,independentCompletenessMap:map,physicalResultRu:'Существующая карточка плоской кровли с целыми003 и самостоятельным либо совместным006; незакрытый состав остаётся предварительным.',
   includedScopeRu:[...base.passport.includedScopeRu,joints.mastic.scopeRu,joints.torch.scopeRu],excludedScopeRu:[...base.passport.excludedScopeRu,...joints.mastic.remainingScopeRu],
   unresolvedApplicableResourceRowIds:[...base.passport.unresolvedApplicableResourceRowIds!,...model.native006RowIds,...pack.newPhysicalNeeds.map(n=>n.rowId)]},
  locator:{key:'kg-krer12-flat003006-whole-four-columns-r24',payload:{contract:pack.contract,whole003:fields,whole006:joints,composition:pack,
   printedPricesImported:false,stockQuantityInferredFromHours:false,projectFactsConfirmed:false,fullTechnicalAcceptance:false}},
  search:{...base.search,clarificationFields:[fieldIds.publicMethod,fieldIds.area,ids.method,ids.length],keyDistinguishingParameters:[fieldIds.publicMethod,ids.method,fieldIds.area,ids.length],
   extraSearchTermsRu:base.search.extraSearchTermsRu+' деформационный шов компенсатор минеральная вата'},
  validationScenario:'CURRENT539_V14_COMMON003006_WHOLE48_ONE_SOURCE_CLOSURE_006_ALONE_AND_BOTH_STOCK',receiptFileStem:'roof_flat003006_r24',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   let entries=0;const run=async(name:string,input:Json)=>{const result=await compileRoofFlat003006R24(model,input,()=>{entries++;save(name+'-entry-before-core',{entry:entries,input});});save(name+'-result-before-assert',result);return result;};
   const aloneM=await run('joint-alone-mastic-area-zero',{[fieldIds.publicMethod]:pack.jointOnlyPublicWorkScopeChoice,[ids.method]:pack.jointChoices.mastic,[ids.length]:'37.5',[fieldIds.area]:'0'});
   assertJointWhole(aloneM,'mastic',literal37_5.mastic);assert(![...aloneM.rows,...aloneM.preliminaryNeeds].some(r=>model.native003RowIds.includes(r.row_id)));
   const aloneT=await run('joint-alone-torch-area-absent',{[fieldIds.publicMethod]:pack.jointOnlyPublicWorkScopeChoice,[ids.method]:pack.jointChoices.torch,[ids.length]:'125'});
   assertJointWhole(aloneT,'torch',literal125Torch);assert(![...aloneT.rows,...aloneT.preliminaryNeeds].some(r=>model.native003RowIds.includes(r.row_id)));
   const both=await run('both003-and006-mastic',{[fieldIds.publicMethod]:fieldPack.choices.bitumen,[fieldIds.area]:'125',[ids.method]:pack.jointChoices.mastic,[ids.length]:'37.5'});
   assertJointWhole(both,'mastic',literal37_5.mastic);const all=[...both.rows,...both.preliminaryNeeds];
   assert.equal(all.filter(r=>r.row_id.startsWith(fields.bitumen.prefix+':')).length,12);
   assert.equal(all.find(r=>r.row_id===fields.bitumen.prefix+':mobile_bitumen_boiler_400l')?.quantity,'11.3125');
   assert.equal(all.find(r=>r.row_id===joints.mastic.prefix+':mobile_bitumen_boiler_400l')?.quantity,'1.62');
   const stockId=model.stockRowId;assert.equal(all.filter(r=>r.row_id===stockId).length,1);assert.equal(all.find(r=>r.row_id===stockId)?.quantity,null);
   assert.equal(operationSections(both).filter(s=>s.resourceIds.includes(stockId)).length,1);
   for(const[name,key,value,expected]of[['forged-joint-project',ids.conditions,joints.mastic.conditionsYesRu,'source-managed parameter cannot be submitted '+ids.conditions],
    ['forged-boiler-stock',pack.newPhysicalNeeds.find(n=>n.key==='boiler-physical-stock')!.parameterId,'1','unresolved application norm cannot be supplied '] ]as const){
    const input={[fieldIds.publicMethod]:pack.jointOnlyPublicWorkScopeChoice,[ids.method]:pack.jointChoices.mastic,[ids.length]:'37.5',[key]:value};let rejection:string|null=null;
    try{const unexpected=await compileRoofFlat003006R24(model,input,()=>{entries++;save(name+'-entry-before-core',{entry:entries,input});});save(name+'-unexpected-result-before-assert',unexpected);}catch(error:unknown){rejection=error instanceof Error?error.message:String(error);save(name+'-actual-reject-before-assert',{rejection});}
    assert(rejection?.includes(expected),name+':'+rejection);
   }
   const legacyInput={[fieldIds.area]:'125'};
   const before=await compileData({parameters:c.parameters,formulas:c.formulas,resources:c.resources,applicability:c.definition.applicability},c,legacyInput,
    ()=>{entries++;save('legacy-current-v14-entry-before-core',{entry:entries,input:legacyInput});});save('legacy-current-v14-result-before-assert',before);
   const after=await run('legacy-common-candidate',legacyInput),present=new Set([...after.rows,...after.preliminaryNeeds].flatMap(r=>[r.row_id,...(typeof r.resource_spec_id==='string'?[r.resource_spec_id]:[])]));
   assert.deepEqual(normalizedLegacyRows(after.rows,present),normalizedLegacyRows(before.rows,present));
   assert.deepEqual(normalizedLegacyRows(after.preliminaryNeeds,present),normalizedLegacyRows(before.preliminaryNeeds,present));
   const presentFor=(result:Awaited<ReturnType<typeof compileRoofFlat003006R24>>)=>new Set([...result.rows,...result.preliminaryNeeds].flatMap(r=>[r.row_id,...(typeof r.resource_spec_id==='string'?[r.resource_spec_id]:[])]));
   const rawBeforeSections=operationSections(before),rawAfterSections=operationSections(after),presentBefore=presentFor(before),presentAfter=presentFor(after);
   save('legacy-operation-sections-raw-before-assert',{before:rawBeforeSections,after:rawAfterSections,presentBefore:[...presentBefore],presentAfter:[...presentAfter]});
   const normalizeSections=(sections:ReturnType<typeof operationSections>,actualPresent:ReadonlySet<string>)=>{
    const removed:{sectionKey:string;primaryOperationId:string;additionalOperation:unknown;actualPresentMatches:string[]}[]=[];
    const normalized=sections.map(section=>{const op=section.operation;if(!op||!op.additionalOperations?.length)return section;
     const active=op.additionalOperations.filter(ref=>{if(ref.whenResourcePresent===undefined)return true;
      assert(Array.isArray(ref.whenResourcePresent)&&ref.whenResourcePresent.length>0&&ref.whenResourcePresent.every(id=>typeof id==='string'));
      const matches=ref.whenResourcePresent.filter(id=>actualPresent.has(id));if(matches.length)return true;
      removed.push({sectionKey:section.key,primaryOperationId:op.operationId,additionalOperation:ref,actualPresentMatches:matches});return false;});
     if(active.length===op.additionalOperations.length)return section;
     const{additionalOperations:_unfiltered,...primary}=op;return{...section,operation:{...primary,...(active.length?{additionalOperations:active}:{})}};
    });return{normalized,removed};};
   const normalizedBeforeSections=normalizeSections(rawBeforeSections,presentBefore),normalizedAfterSections=normalizeSections(rawAfterSections,presentAfter);
   save('legacy-operation-sections-visibility-receipt-before-assert',{before:normalizedBeforeSections,after:normalizedAfterSections,
    rule:'ONLY additionalOperations WITH nonempty whenResourcePresent AND zero actualpresent matches; all primary IDs/sharedResources/resourceIds/otherfields exact'});
   assert.deepEqual(normalizedAfterSections.normalized,normalizedBeforeSections.normalized);
   save('legacy-compatibility-equality',{physicalQuantitiesUnitsNormativeAndCalculationTracesAndPayOwnersEqual:true,
    normalizedOnlyProjectionHashesAndInactiveConditionalOperationReferences:true,visibleOperationSectionsEqual:true,rows:after.rows.length,needs:after.preliminaryNeeds.length});
   assert.equal(entries,7);save('actual-core-counts',{entries,completedResults:5,rejectedInputs:2,ownerPureAlreadyReused:false,projectConditionsConfirmed:false});
   return{status:'FINITE_COMMON_CONFIG_SOURCE_ONLY_NO_PUBLISHER',actualCoreEntries:entries,completedResults:5,rejectedInputs:2,nativeWholeRows:48,newPublicCards:0,fullTechnicalAcceptance:false};
  }};
 assert.equal(config.catalogAppend,undefined);return config;
}
