import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildMaster32PanelToolSuccessorR1 as build,master32PanelCurrentCaptureR1 as captured,
 master32PanelCurrentRepresentativeR1 as representative,master32PanelToolPackR1 as pack,
 master32PanelToolCompletenessR1 as completeness} from '../../../src/lib/estimate/v4/master32PanelToolProvisionR1';
import {master30CapturedParentR1 as predecessor} from '../../../src/lib/estimate/v4/master30ElectricalPlumbingFactoryKitsR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
const packPath='data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json';
const modulePath='src/lib/estimate/v4/master32PanelToolProvisionR1.ts';
const suitePath='src/lib/estimate/v4/master32PanelToolProvisionR1.test.ts';
const configPath='scripts/estimate/r4a13/prepareMaster32PanelToolProvisionR1.ts';
const fileSha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const valueSha=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
type Model=ReturnType<typeof representative>;
export const master32PanelToolFactsR1=(count:unknown='3')=>({[pack.factorySelectorId]:pack.factoryChoiceRu,[pack.countId]:count,[pack.methodId]:pack.methodRu,[pack.fitId]:pack.fitRu});
export function compileMaster32PanelToolsR1(catalogId:string,input:Record<string,unknown>,options:{model?:Model;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];primary?:string}={}){
 const model=options.model??build(representative(catalogId));
 return compileCanonicalEstimateCore({operation:'recalculate',catalogId,compilerVersion:pack.contract,
  primaryMeasureParameterId:options.primary??(input[pack.factorySelectorId]===pack.legacyChoiceRu?'q':pack.countId),
  parameterDefinitions:model.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],
  formulaDefinitions:model.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
  resourceDefinitions:model.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],
  submittedParameters:input,confirmedParameters:{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:estimateDeterministicHash});
}
/** Exact second successor through the existing sole writer. Source-backed
 * physical provision is conditional; no labour, purchase or FULL promotion. */
export function master32PanelToolMasterConfigR1(context:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const target=pack.targets.find(t=>t.catalogId===catalogId);assert(target,'EXACT_MASTER32_PANEL_TARGET');
 assert.equal(fileSha(pack.snapshotPath),pack.snapshotSha256,'MASTER32_EXACT_PARENT_BYTES');
 for(const s of pack.sourceArtifacts)assert.equal(fileSha(s.path),s.sha256,'MASTER32_EXACT_PRIMARY_BYTES_'+s.id);
 assert.equal(fileSha(pack.masterPath),pack.masterSha256,'MASTER32_MASTER_BYTES');
 const c=captured(catalogId) as MasterRetainedParentCaptureR1,old=representative(catalogId),next=build(old),map=completeness(catalogId),
  original=predecessor(catalogId) as MasterRetainedParentCaptureR1,newParameters=next.parameters.filter(q=>!c.parameters.some(p=>p.parameter_id===q.parameter_id)),
  bound=next.resources.filter(r=>!c.resources.some(p=>p.row_id===r.row_id)).map(r=>r.row_id),
  allPotentialNeeds=[...pack.coveredNeedIds,...pack.uncoveredNeedIds],
  retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
   newParameterSources:Object.fromEntries(newParameters.map(p=>[p.parameter_id,{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}])),
   legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
    parameterSources:{q:[...c.baseline.normative_source_ids.q]},approvedTemplatePredecessor:{capturedParent:original,capturedParentSha256:masterRetainedParentCaptureSha256R1(original)}},
   successorProvenanceContinuation:{contract:'master-retained-binding-continuation/r1',capturedSourceMetadata:structuredClone(c.definition.source_metadata),
    capturedSourceMetadataSha256:valueSha(c.definition.source_metadata),capturedPreviousSuccessorSha256:valueSha(c.definition.source_metadata.retainedParentBindingSuccessorV1)}};
 assert.deepEqual(newParameters.map(p=>p.parameter_id).sort(),[pack.methodId,pack.fitId].sort());assert.equal(bound.length,22);
 const baseline=structuredClone(c.baseline.input_values),sourcePaths=[packPath,pack.snapshotPath,modulePath,suitePath,configPath,...pack.sourceArtifacts.map(s=>s.path),
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/master30ElectricalPlumbingFactoryKitsR1.ts',
  'data/estimate-benchmarks/source-packs/master30-electrical-plumbing-complete-factory-kits-r1.json',
  'data/estimate-benchmarks/fixtures/master30-electrical-plumbing-five-current-r1.json',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
  'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/inclusionGraph.ts',
  'src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts'];
 return{contract:pack.contract,stopCode:'MASTER32_PANEL_TOOL_POST',applicationName:'master32-panel-tool-post',
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:pack.masterPath,masterSha256:pack.masterSha256,
  parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:context.outputRoot??'.release-runtime/r568/master32-panel-tool-provision/'+catalogId.replace('canonical-work:base:',''),
  sourcePaths,catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.titleRu,source_authority:'Exact manufacturer mounting workflow and explicitly selected serial-post engineering organization; no crew, wear, purchase or labour consumption norm',
   source_kind:'PRIMARY_MANUFACTURER_METHOD_AND_EXPLICIT_PHYSICAL_PROVISION_PLAN',official_url:pack.source.officialUrl,
   artifact_sha256:fileSha(packPath),exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:baseline,acceptanceInput:baseline,runtimeProfileInput:{q:c.baseline.input_values.q},runtimeProfileClassification:{q:'ASSUMPTION'},runtimeProfileSourceIds:{q:[...c.baseline.normative_source_ids.q]},
  expectedParentShape:target.expectedParentShape as [number,number,number],benchmarkOrdinal:0,validationScenario:'DEMO_ONLY_EXPLICIT_SERIAL_TOOL_POST_NOT_REAL_OBJECT_OR_LABOUR_NORM',
  passport:{canonicalRuName:old.passport.canonical_ru_name??old.passport.canonical_name_ru??'Монтаж светильников',workKey:catalogId.replace('canonical-work:base:',''),
   physicalResultRu:'Монтаж светодиодной панели в готовую решётку с сохранением прежнего состава; дополнительно доступно подтверждённое ручное и измерительное оснащение одного последовательного поста.',
   includedScopeRu:[...old.passport.included_scope_ru,pack.scopeRu],excludedScopeRu:[...old.passport.excluded_scope_ru,...pack.notCoveredRu],
   independentCompletenessMap:map,unresolvedApplicableResourceRowIds:allPotentialNeeds},
  applicability:{...structuredClone(c.definition.applicability),master32PanelWholeToolProvision:{contract:pack.contract,methodParameterId:pack.methodId,fitParameterId:pack.fitId,
   physicalToolKitCompleteOnlyWithExplicitMethodAndFit:true,fullTechnicalAcceptance:false,sourceNeedClosuresOnlyInSelectedScope:2},retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(c)},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,
   applicability:{contract:pack.contract,methodParameterId:pack.methodId,methodValue:pack.methodRu,fitParameterId:pack.fitId,fitValue:pack.fitRu,
    scopeRu:pack.scopeRu,physicalProvisionOnly:true,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,rowId,wholeProvisionOwnerRowId:pack.ownerRowId,
    sourceQuantityKind:'SELECTED_SERIAL_POST_FUNCTIONAL_ASSET_NOT_PURCHASE',automaticLegacyPriceOrQuantityTransferAllowed:false,fullTechnicalAcceptance:false}]))},
  locator:{key:'master32-dvo6561-whole-hand-measuring-post-r1',payload:{contract:pack.contract,sourcePack:pack,sourcePackSha256:fileSha(packPath),
   independentCompletenessMap:map,fullTechnicalAcceptance:false}},
  search:{primaryUom:'pcs',canonicalNameRu:'Монтаж светильников',aliases:['Установка светильников'],shortScopeRu:'Заводская панель и отдельное ручное и измерительное оснащение поста; остальные монтажные потребности сохраняются.',
   keyDistinguishingParameters:[pack.factorySelectorId,pack.methodId],clarificationFields:[pack.factorySelectorId,pack.countId,pack.methodId,pack.fitId],
   includedBoundaries:[pack.scopeRu],excludedBoundaries:[...old.passport.excluded_scope_ru,...pack.notCoveredRu],extraSearchTermsRu:'панель светильник потолок готовая решётка ручной инструмент измеритель защитный проводник',
   sourceProvenance:{contract:pack.contract,parentDefinitionId:c.definition.id,conditionalToolNeedTypesClosed:2,newFullTechnologies:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_MASTER32',receiptFileStem:'master32_panel_tool_post',
  verifyCore:async()=>{
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
   for(const n of ['1','3','1000000']){const r=await compileMaster32PanelToolsR1(catalogId,master32PanelToolFactsR1(n),{model:next});
    assert.equal(r.rows.length,25);assert.equal(r.preliminaryNeeds.length,22);assert(r.preliminaryNeeds.every(p=>pack.uncoveredNeedIds.includes(p.row_id)&&p.quantity===null));
    assert.deepEqual(r.rows.filter(p=>p.included_in_estimate).map(p=>p.row_id).sort(),['led-grid:dvo6560-6562:opal-4000',pack.ownerRowId].sort());
    assert.equal(r.rows.filter(p=>p.included_in_procurement).length,1);for(const tool of pack.tools){const row=r.rows.find(p=>p.row_id===pack.prefix+':'+tool.key)!;assert.equal(row.quantity,String(tool.countPerPost));assert.equal(row.unit_price,null);assert.equal(row.included_in_procurement,false);}}
   const base={[pack.factorySelectorId]:pack.factoryChoiceRu,[pack.countId]:'3'};
   for(const input of [base,{...base,[pack.methodId]:pack.methodRu},{...base,[pack.fitId]:pack.fitRu}]){const r=await compileMaster32PanelToolsR1(catalogId,input,{model:next});
    assert.equal(r.rows.length,3);assert.equal(r.preliminaryNeeds.length,24);assert(pack.coveredNeedIds.every(id=>r.preliminaryNeeds.some(p=>p.row_id===id&&p.quantity===null)));}
   const before=await compileMaster32PanelToolsR1(catalogId,baseline,{model:old});const after=await compileMaster32PanelToolsR1(catalogId,baseline,{model:next});
   const view=(r:typeof before)=>r.rows.map(p=>[p.row_id,p.quantity,p.unit_price,p.amount,p.included_in_estimate,p.included_in_procurement]);
   assert.deepEqual(view(after),view(before));assert.deepEqual(after.totals,before.totals);
   return{status:'PASS_EXPLICIT_TOOL_POST_WITH_OLD_SCOPES_RETAINED',knownRows:25,conditionalNeeds:22,oldFactoryNeeds:24,newPhysicalToolRows:21,newProvisionOwners:1,newFull:0};
  }};
}
export const master32PanelToolRecipesR1=pack.targets.map(t=>({catalogId:t.catalogId,configFactory:master32PanelToolMasterConfigR1}));
