import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';
import approvedTemplatePredecessor from '../../../data/estimate-benchmarks/fixtures/basin-mixer-current-retained-parent-r2.json';
import {appendBasinMixerReadySiteMinimumInputR3,basinMixerReadySiteMinimumInputR3 as profile} from '../../../src/lib/estimate/v4/basinMixerReadySiteMinimumInputR3';
import {basinMixerGrohe33265002PackR1 as product} from '../../../src/lib/estimate/v4/basinMixerGrohe33265002KitR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,type MasterRetainParentBindingsR1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from './catalogFirstEstimateMinimumInputAudit.shared';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {basinMixerReadySiteWorkScopeRegistryR3,mixerReadySiteContractR3 as contract,mixerReadySiteNormIdR3 as normId,
 mixerReadySiteSourceIdR3 as sourceId,mixerReadySiteStopCodeR3 as stopCode,mixerReadySiteRecipePathR3} from './basinMixerReadySiteWorkScopeRegistryR3';

type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
type Parent=Readonly<{capturedParent:MasterRetainedParentCaptureR1;capturedParentSha256:string;parentPassport:Json;parentSearch:Json;parentPriceBindings:readonly Json[]}>;
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const valueHash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const choice='mixer_composition_method',id=(key:string)=>profile.prefix+':'+key;

/** Pure subject authoring. It preserves both actual predecessor branches and
 * delegates arithmetic, balance, admission and publication to existing owners. */
export function prepareBasinMixerReadySiteMinimumInputDraftR3(input:Parent){
 const c=clone(input.capturedParent),search=clone(input.parentSearch),passport=clone(input.parentPassport);
 assert.equal(masterRetainedParentCaptureSha256R1(c),input.capturedParentSha256);
 assert.equal(c.definition.catalog_id,profile.catalogId);
 assert.equal(c.definition.definition_version,4);
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],[65,103,103]);
 assert.equal(search.definition_version_id,c.definition.id);assert.equal(passport.definition_version_id,c.definition.id);
 const registry=basinMixerReadySiteWorkScopeRegistryR3();
 const next=appendBasinMixerReadySiteMinimumInputR3(c as unknown as Parameters<typeof appendBasinMixerReadySiteMinimumInputR3>[0]);
 const newParameters=next.parameters.filter(p=>!c.parameters.some(old=>old.parameter_id===p.parameter_id));
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(newParameters.map(p=>[p.parameter_id,
  p.truth_metadata.effective_resource_quantity_v1?{kind:'DERIVED' as const,sourceIds:[]}:
   String(p.truth_metadata.value_source_role).includes('DERIVED')?{kind:'DERIVED' as const,sourceIds:[sourceId]}:
    {kind:'KNOWN' as const,sourceIds:[sourceId]} ]));
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:input.capturedParentSha256,newParameterSources,
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
   parameterSources:{q:clone(c.baseline.normative_source_ids.q)},approvedTemplatePredecessor:{
    capturedParent:approvedTemplatePredecessor.capturedParent,capturedParentSha256:approvedTemplatePredecessor.capturedParentSha256}},
  capturedSourcePreimage:{sourceKey:sourceId,expected:null},
  successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:clone(c.definition.source_metadata),
   capturedSourceMetadataSha256:valueHash(c.definition.source_metadata),capturedPreviousSuccessorSha256:valueHash(c.definition.source_metadata.retainedParentBindingSuccessorV1)}};
 const selected={kind:'equals',parameterId:choice,value:profile.selectorValueRu};
 const binding={...registry.binding,retainParentBindings:retained,
  applicabilityByRowId:Object.fromEntries(next.newlySourceBoundRowIds.map(rowId=>[rowId,{
   ...registry.binding.applicability,selectedOnly:selected,recipeArtifactSha256:registry.sourceMetadata.artifact_sha256,
   exactProductSourceId:product.sourceId,exactProductArtifactSha256:product.source.sha256,
   quantityMeaning:'COMPLETE_SELECTED_PRODUCTS_NOT_INDIVIDUAL_HOSE_COUNTS',laborOrMachineHoursClaimed:false}]))};
 const applicability={...clone(c.definition.applicability),readySiteMinimumInputR3:{contract:profile.contract,objectFactBudget:3,
  selectedBranchQuantitiesComplete:true,newOrderWithoutWarehouseDeduction:true,otherBranchesRetained:true},
  primaryMeasureSelectionV1:{...clone(c.definition.applicability.primaryMeasureSelectionV1),
   selections:[...clone(c.definition.applicability.primaryMeasureSelectionV1.selections),next.newPrimarySelection]}};
 const oldOpenRows=product.needs.map(n=>product.prefix+':open-'+n.id);
 // Independent inventory: fixed source recipe + exact manufacturer composition,
 // never inferred by enumerating the emitted resources.
 const expectedKeys=['kit-consumed','kit-order','kit-remaining','kit-free','kit-shortage','kit-reserve-deficit',
  ...product.components.map(c=>c.id),'complete-installation-work',...product.operations.map(o=>'process-'+o.id),
  ...product.needs.map(n=>'open-'+n.id),'mounting-key','waste-key'];
 assert.equal(expectedKeys.length,22);
 const completenessMap={contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
  evidenceSha256:registry.sourceMetadata.artifact_sha256,evidenceReferences:[mixerReadySiteRecipePathR3,product.source.sha256,input.capturedParentSha256],
  coverage:'NEW_EXPLICIT_READY_SITE_NEW_ORDER_BRANCH_ONLY_PREVIOUS_BRANCHES_RETAINED',predecessorPassportRetainedAsEvidence:passport,
  fullTechnicalAcceptance:false,entries:expectedKeys.map(key=>({expectedResourceId:contract+':'+key,operationId:id('operation:'+key),sourceId,
   condition:'EXPLICIT_SELECTED_COMPLETE_PRODUCT_READY_SITE_AND_NEW_ORDER_SCOPE',
   quantityRule:key.endsWith('-key')?'ORDINARY_TOOL_INCLUDED_IN_COMPLETE_WORK_WITHOUT_INVENTED_QUANTITY':key.startsWith('open-')?'OUTSIDE_THIS_EXPLICIT_SELECTED_WORK_SCOPE_NOT_ZERO':
    key==='complete-installation-work'?'EXPLICIT_INSTALL_COUNT_COMPLETE_WORK_ITEM_NOT_TIME_NORM':'SELECTED_PRODUCT_COUNT_OR_EXISTING_PURCHASE_BALANCE',
   formulaId:id('formula:'+key),resolution:{kind:'ROW',rowId:id(key)}}))};
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
 const compile=(facts:Json,defs:Pick<MasterRetainedParentCaptureR1,'parameters'|'formulas'|'resources'>=next,
  primary=profile.countParameterId,edits:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>compileCanonicalEstimateCore({
   operation:'recalculate',catalogId:profile.catalogId,compilerVersion:contract,primaryMeasureParameterId:primary,
   parameterDefinitions:defs.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
   formulaDefinitions:defs.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],resourceDefinitions:defs.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
   submittedParameters:facts,confirmedParameters:{},rowOverrides:edits,priceItems:[],currencyCode:'KGS',maximumResourceRows:defs.resources.length,hashJson:estimateDeterministicHash});
 const facts={[choice]:profile.selectorValueRu,[profile.countParameterId]:'3',[profile.siteParameterId]:profile.siteValueRu};
 const verifyCore=async()=>{
  const representative=prepareMasterRetainedBindingRepresentativeR1({config:{stopCode,catalogId:profile.catalogId,parentReleaseId:c.definition.release_id,binding},
   newSource:registry.managedSource,newLocators:registry.managedLocators},{...next,
    newBindings:next.newlySourceBoundRowIds.map(row_id=>({row_id,locator_id:registry.managedLocators[0]!.id,applicability:binding.applicabilityByRowId[row_id]})),
    successorProvenance:{contract,sourceId,normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:input.capturedParentSha256}});
  assert.equal(representative.expectedNormativeBindingCount,c.bindings.length+4);
  const result=await compile(facts);
  assert.equal(result.rows.find(r=>r.row_id===id('kit-order'))?.quantity,'3');
  assert.equal(result.rows.find(r=>r.row_id===id('complete-installation-work'))?.quantity,'3');
  assert.equal(result.rows.filter(r=>r.included_in_estimate).length,2);
  assert.equal(result.rows.filter(r=>r.included_in_procurement).length,1);
  assert(result.rows.filter(r=>r.included_in_estimate).every(r=>r.unit_price===null));
  assert(result.preliminaryNeeds.every(n=>n.missing_parameter_ids.length===0));
  assert(result.preliminaryNeeds.every(n=>['INCLUDED','NOT_APPLICABLE'].includes(String(((n.calculation_trace as Json).resourceGraph as Json).scopeRequirementDecisionV1.status))));
  for(const param of [profile.countParameterId,profile.siteParameterId]){const missing:Json={...facts};delete missing[param];const r=await compile(missing);
   assert(r.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(param)));assert(!r.rows.some(n=>n.included_in_estimate));}
  const paid=await compile({...facts,[profile.countParameterId]:'4'},next,profile.countParameterId,{
   [id('kit-order')]:{unitPrice:'77',provenance:{kind:'manual',reason:'TEST_ONLY сохранение ручной цены'}},
   [id('complete-installation-work')]:{unitPrice:'11',provenance:{kind:'manual',reason:'TEST_ONLY сохранение ручной цены'}}});
  assert.equal(paid.totals.amount,'352');
  const view=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(x=>[x.row_id,x.quantity,x.unit_price,x.amount,x.title_ru,x.included_in_estimate,x.included_in_procurement]);
  const legacy=String(c.parameters.find(p=>p.parameter_id===choice)!.constraints_json.values[0]);
  assert.deepEqual(view(await compile({q:'100',[choice]:legacy},next,'q')),view(await compile({q:'100',[choice]:legacy},c,'q')));
  const advanced=String(c.parameters.find(p=>p.parameter_id===choice)!.constraints_json.values[1]);
  const advancedFacts:Json={...JSON.parse(readFileSync('data/estimate-benchmarks/fixtures/basin-mixer-grohe33265002-kit-r1.json','utf8')).facts,[choice]:advanced};
  assert.deepEqual(view(await compile(advancedFacts)),view(await compile(advancedFacts,c)));
  return{status:'PASS_CURRENT_PARENT_READY_SITE_THREE_FACT_EXISTING_CORE',currentParentVersion:4,nextShape:[next.parameters.length,next.formulas.length,next.resources.length],
   userFacts:3,confirmedTechnicalParameters:0,quantityGaps:0,onePurchaseOwner:true,oneWholeWorkOwner:true,missingPricesAllowed:true,
   includedOrdinaryToolsWithoutInventedQuantity:2,legacyAndAdvancedRowsPreserved:true,protectedHistoryWritten:false,publicationPerformed:false};
 };
 return{capture:c,search,passport,next,binding,applicability,completenessMap,oldOpenRows,facts,verifyCore};
}

/** Integrator-reviewed configuration for the existing sole publisher. */
export function prepareBasinMixerReadySiteMinimumInputR3(input:Readonly<{rootBindingPin:Pin;outputRoot:string}>):MasterSingleDefinitionSuccessorConfig{
 const pin=(p:Pin)=>{const bytes=readFileSync(resolve(p.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);return bytes;};
 const load=(p:Pin):Json=>JSON.parse(pin(p).toString('utf8').replace(/^\uFEFF/u,''));
 const b=load(input.rootBindingPin);assert.equal(b.status,'ROOT_ADMITTED_CURRENT_MIXER_READY_SITE_R3');
 const captured=load(b.currentParentPin),guard=load(b.closedCaptureGuardPin),pointer=load(b.currentPointerPin);
 assert.equal(guard.error,null);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);
 assert.equal(pointer.definitionReleaseId,b.definitionReleaseId);assert.equal(pointer.searchReleaseId,b.searchReleaseId);
 assert.equal(captured.capture.pointer.definitionReleaseId,b.definitionReleaseId);assert(captured.capture.protectedCount>=120);
 const p=captured.capture.parents[0];assert.equal(p.catalogId,profile.catalogId);assert.equal(captured.capture.parents.length,1);
 const draft=prepareBasinMixerReadySiteMinimumInputDraftR3({capturedParent:p.capturedParent,capturedParentSha256:p.capturedParentSha256,
  parentPassport:p.passport,parentSearch:p.search,parentPriceBindings:p.priceBindings});
 for(const proof of b.acceptedProofPins){const result=load(proof);assert.equal(result.error??null,null);}
 assert(b.acceptedProofPins.length>=2);
 assert.equal(createHash('sha256').update(readFileSync(b.masterPath)).digest('hex'),b.masterSha256);
 const registry=basinMixerReadySiteWorkScopeRegistryR3(),scoped=captured.capture.scopedNormativeRegistry as MasterCapturedScopedNormativeRegistryR1;
 assert(resolveMasterScopedNormativeRegistryOptInR1({config:{stopCode,normId,capturedScopedNormativeRegistry:scoped,binding:draft.binding},newSource:registry.managedSource,newLocators:registry.managedLocators}));
 const included=['Монтаж комплектного смесителя на готовое совместимое место; один комплект и одна работа на место.',
  'Крепление, подключение штатной подводки, установка штатного донного клапана и местная проверка входят в полный монтаж.',
  'Штатные детали входят в комплект; обычный ручной инструмент обеспечивает исполнитель в составе монтажа.',
  'Новый заказ рассчитан по потребности, без вычета складского запаса и добавления резерва.'];
 const excluded=['Переделка выводов, новая раковина или сифон, переходники и общие испытания сети требуют отдельного состава.',
  'Доставка, разгрузка, дополнительная защита и вывоз добавляются при соответствующих условиях объекта.',
  'Совместимость и комплектность сохраняются по выбранному товару; к иному исполнению паспорт автоматически не переносится.'];
 const runtimeValues={q:draft.capture.baseline.input_values.q},runtimeClass={q:'ASSUMPTION' as const},runtimeSources={q:draft.capture.baseline.normative_source_ids.q};
 const sourcePaths=[...new Set(['scripts/estimate/r4a13/prepareBasinMixerReadySiteMinimumInputR3.ts','scripts/estimate/r4a13/basinMixerReadySiteWorkScopeRegistryR3.ts',
  'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
  'src/lib/estimate/v4/basinMixerReadySiteMinimumInputR3.ts','src/lib/estimate/v4/basinMixerGrohe33265002KitR1.ts',
  mixerReadySiteRecipePathR3,'data/estimate-benchmarks/source-packs/basin-mixer-grohe33265002-kit-r1.json',product.source.path,product.source.htmlPath,
  'data/estimate-benchmarks/fixtures/basin-mixer-current-retained-parent-r2.json',
  input.rootBindingPin.path,b.currentParentPin.path,b.closedCaptureGuardPin.path,...b.acceptedProofPins.map((p:Pin)=>p.path),...b.sharedSourcePins.map((p:Pin)=>p.path)])];
 assert(sourcePaths.every(p=>!isAbsolute(p)&&!p.split(/[\\/]/u).includes('..')));
 assert(!sourcePaths.includes(b.currentPointerPin.path));for(const p of b.sharedSourcePins)pin(p);
 return{contract,stopCode,applicationName:'basin-mixer-ready-site-r3',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:b.masterPath,masterSha256:b.masterSha256,
  parentReleaseId:b.definitionReleaseId,parentSearchReleaseId:b.searchReleaseId,currentReleasePath:b.currentPointerPin.path,outputRoot:input.outputRoot,sourcePaths,
  catalogId:profile.catalogId,sourceId,normId,sourceMetadata:registry.sourceMetadata,capturedScopedNormativeRegistry:scoped,
  parameterDefinitions:draft.next.parameters,formulaDefinitions:draft.next.formulas,resourceDefinitions:draft.next.resources,
  shortInput:{[profile.countParameterId]:'3'},acceptanceInput:{...runtimeValues,...draft.facts},runtimeProfileInput:runtimeValues,
  runtimeProfileClassification:runtimeClass,runtimeProfileSourceIds:runtimeSources,expectedParentShape:[65,103,103],benchmarkOrdinal:0,
  validationScenario:'CURRENT_MIXER_R3_THREE_FACT_READY_SITE_NEW_ORDER_OLD_BOTH_BRANCHES_PRESERVED',
  passport:{canonicalRuName:'Монтаж смесителя',workKey:draft.search.work_key??draft.capture.definition.source_metadata.templateId,
   physicalResultRu:profile.scopeRu,includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:draft.completenessMap,
   unresolvedApplicableResourceRowIds:draft.oldOpenRows},applicability:draft.applicability,binding:draft.binding,locator:registry.locator,
  search:{primaryUom:draft.search.primary_uom,canonicalNameRu:'Монтаж смесителя',aliases:[...draft.search.aliases,'Установить комплектный смеситель на готовое место'],
   shortScopeRu:profile.scopeRu,keyDistinguishingParameters:[choice,profile.countParameterId,profile.siteParameterId],
   clarificationFields:[choice,profile.countParameterId,profile.siteParameterId],includedBoundaries:included,excludedBoundaries:excluded,
   extraSearchTermsRu:'смеситель подводка крепление донный клапан монтаж готовое место',sourceProvenance:{contract,capturedParentSha256:p.capturedParentSha256,
    readySiteInputBudget:3,fullTechnicalAcceptance:false,otherBranchesRetained:true}},
  forbiddenAdjacentMatchers:[/new_sink|new_trap|whole_network_test|automatic_point_to_item/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'basin_mixer_ready_site_r3',verifyCore:draft.verifyCore};
}
