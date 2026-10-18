// Pure WORK config for the existing governed publisher. No PG/SQL/CLI/on-import run.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {hydrotestSteelDefinitionR1,hydrotestSteelPackR1 as pack,hydrotestSteelCompletenessMapR1} from '../../../src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1';

type Json=Record<string,any>;
type Evidence=Readonly<{
  decisionPath?:string;currentReadPath?:string;targetedReadPath?:string;proposalPath?:string;sourcePackPath?:string;forkReceiptPath?:string;
}>;
const SHA={
  current:'3337f77c9874672d5dc242b8e1aa7c52ba99d2b9de4b5fc1fca5609e26645505',
  targeted:'695a353993354a4161667f63948dbe8b9676998dee416693aafcfdd92581c735',
  proposal:'dbb0c999d65bd9f915c55ebca1c7ac3c6f2657957dde51d70fb5e1d3dd5472de',
  decision:'c82d9b36b1e4f4780c6d75c661b6c1675f7b3b8784053ee569579742552c7dc5',
  sourcePack:'fefa545bd90c18f8d9f5f593f13a39cfa8e05608bd29d68994cbe62e05b0d635',
  fork:'47f8caca5fbd9f325d8f0e5c19208a9557313f6bbf9bd5002806f29bf796f7ac',
};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const exact=(path:string,hash:string):Json=>{const bytes=readFileSync(resolve(path));assert.equal(sha(bytes),hash,'HYDROTEST_EXACT_EVIDENCE:'+path);return JSON.parse(bytes.toString('utf8'));};
const prefix=pack.prefix,rowId=(id:string)=>prefix+':'+id;
const packPath='data/estimate-benchmarks/source-packs/hydrotest-internal-steel-dn50-krer16-005-01-r1.json';
const defaults={
  currentReadPath:pack.currentScopeEvidence.currentRead.path,
  targetedReadPath:pack.currentScopeEvidence.targetedRead.path,
  proposalPath:pack.currentScopeEvidence.proposal.path,
  decisionPath:'data/estimate-benchmarks/fixtures/hydrotest-steel005-root-partial-append-decision-r2.json',
  sourcePackPath:packPath,
  forkReceiptPath:'data/estimate-benchmarks/fixtures/hydrotest-steel005-uppercase-origin-fork-r2.json',
};

/** Synthetic object facts for source/core checks only. Never runtime defaults. */
export function hydrotestSteelAppendAcceptanceInputR2(lengthM=100):Record<string,unknown>{
  const p:Record<string,unknown>={tested_steel_pipe_length_m:lengthM,nominal_bore_mm:50,working_pressure_mpa:0.6,test_pressure_mpa:0.8,test_hold_h:0.5};
  for(const f of pack.scopeFacts)p[f.id]=f.value;
  for(const f of pack.projectReferenceFacts)p[f.id]='VALIDATION_FIXTURE_ONLY approved programme/site reference; not actual acceptance';
  const quantum:Record<string,number>={water:0.1,paint:0.01,'linseed-oil':0.001,linen:0.001};
  for(const m of pack.materials){p[m.parameterPrefix+'_specification']='VALIDATION_FIXTURE_ONLY '+m.nameRu;
    p[m.parameterPrefix+'_stock']=0;p[m.parameterPrefix+'_reserve']=0;p[m.parameterPrefix+'_quantum']=quantum[m.id];}
  return p;
}

/** Construction requires the exact formal root decision. It grants no new
 * machine price role and performs no writer or current database operation. */
export function prepareHydrotestInternalSteelDn50Column01AppendR1(evidence:Evidence={}):MasterSingleDefinitionSuccessorConfig{
  const paths={...defaults,...evidence};
  const current=exact(paths.currentReadPath,SHA.current),targeted=exact(paths.targetedReadPath,SHA.targeted),
    proposal=exact(paths.proposalPath,SHA.proposal),decision=exact(paths.decisionPath,SHA.decision);
  assert.deepEqual(exact(paths.sourcePackPath,SHA.sourcePack),pack);
  const fork=exact(paths.forkReceiptPath,SHA.fork);assert.equal(fork.sourceEmissionAfter,pack.sourceId);
  assert.equal(fork.formulaExpressionsAndRowIdsChanged,false);assert.equal(fork.normRatesOrUnitsChanged,false);
  assert.equal(decision.status,'ROOT_REVIEWED_PARTIAL_STEEL_HYDROTEST_APPEND_R2');assert.equal(decision.proposalSha256,SHA.proposal);
  assert.equal(decision.published,false);assert(decision.partialQuantityLocalPublicationDesignAllowed);
  assert.equal(decision.sourceMachinePricePublicationAllowed,false);assert.equal(decision.machinePaidOwnerAllowed,false);
  assert.equal(decision.operatorRoleAdmitted,null);assert.equal(decision.extraOperatorHoursAllowed,false);assert.equal(decision.manual0or1CannotCloseNeed,true);
  assert.equal(decision.expectedBindingRows,18);assert.equal(decision.sourcePriceBindings,0);assert.equal(decision.fullTechnicalAcceptance,false);
  assert.equal(decision.newGroupAbsenceCaptured,false);assert.equal(decision.mandatoryStandardCreatePreflightAndLockedReread,true);
  assert.equal(decision.legacyFivePointGroupUnchanged,true);
  const context=current.executionContext;
  assert.deepEqual(context,targeted.executionContext);assert.deepEqual(context,decision.executionContext);assert.deepEqual(context,proposal.executionContext);
  assert.deepEqual(context,pack.capturedCurrentContext);
  for(const read of [current,targeted])assert(read.completeReadSet&&read.transactionRolledBack&&read.connectionClosed&&read.error===null);
  assert.equal(current.metrics.matchedHeaders,27);assert.equal(current.metrics.currentPassports,17);assert.equal(Object.keys(current.sets).length,2);assert.equal(Object.keys(targeted.sets).length,2);
  const passports=current.sets.currentMatchedPassportParameterOwnerHeaders.rawRows.map((s:string)=>JSON.parse(s));
  assert.equal(passports.length,17);assert.equal(passports.filter((p:Json)=>p.parameter_headers.some((v:Json)=>v.parameter_id==='q'&&v.unit_id==='point'&&v.default_value===100)).length,13);
  const pe=passports.find((p:Json)=>p.catalog_id==='canonical-work:expanded:hydraulic_testing');assert(pe);
  assert.equal(pe.definition_version_id,'2288e50b-63ca-5ca1-ad41-e3ea8ddb6930');assert.equal(pe.definition_version,4);assert.equal(pe.applicability.testedLengthDerivedQuantitiesForbidden,true);
  const absence=JSON.parse(targeted.sets.exactProposedSourceConsumerIdentityHeaders.rawRows[0]);
  for(const k of ['exact_emitted_source_count','casefold_source_count','current_consumer_count','identity_hit_count','manifest_hit_count','search_hit_count','membership_hit_count','exact_locator_count'])assert.equal(absence[k],0,'EXACT_CAPTURED_ABSENCE:'+k);
  const legacyGroup=JSON.parse(targeted.sets.exactExistingWaterTestGroupPlacement.rawRows[0]);
  assert.equal(legacyGroup.group_id,'wg:base:plumbing_interior_water_pipe_pressure_test');assert.equal(legacyGroup.member_count,5);
  assert.equal(legacyGroup.member_set_sha256,'e761f25dfee5e733be1dc27bac892a5e9038619950467f7db972ba518fba58e9');
  assert.equal(legacyGroup.membership_headers.length,5);
  assert.equal(proposal.sourceId,pack.sourceId);assert.equal(pack.sourceId,pack.sourceId.toLowerCase());
  assert.equal(pack.originSourceId,'KG_KRER16_INTERNAL_PIPELINES_2015_STEEL_HYDROTEST_005_01');
  assert.equal(pack.catalogBinding,null);assert.equal(pack.publicationAllowed,false);assert.equal(pack.sourceMachinePricePublicationAllowed,false);
  assert.equal(proposal.catalogId,pack.proposedIdentity.catalogId);assert.equal(decision.catalogId,proposal.catalogId);assert.equal(decision.sourceId,pack.sourceId);
  assert.deepEqual(decision.searchPlacement,proposal.searchPlacement);assert.deepEqual(pack.proposedSearchPlacement,proposal.searchPlacement);
  const placement=proposal.searchPlacement;
  assert.equal(placement.groupMode,'create');assert.equal(placement.groupId,'wg:master:internal_steel_water_hydraulic_test_krer16_07_005_01');
  assert.equal(placement.domainId,'plumbing');assert.equal(placement.systemId,'plumbing');assert.equal(placement.membershipOrdinal,0);
  assert.notEqual(placement.groupId,legacyGroup.group_id);assert.equal(pack.newGroupAbsenceCaptured,false);
  const definition=hydrotestSteelDefinitionR1(),completeness=hydrotestSteelCompletenessMapR1();
  const physical=['whole-worker','hydraulic-plant-consumed',...pack.materials.map(m=>m.id+'-consumed')];
  const boundIds=[...physical,...pack.materials.map(m=>m.id),...pack.operations.map(o=>o.id)].map(rowId);
  const controls=pack.materials.flatMap(m=>pack.materialBalanceControls.map(id=>rowId(m.id+':'+id)));
  const needs=pack.gaps.map(g=>rowId('open:'+g.id));
  assert.equal(boundIds.length,18);assert.equal(controls.length,20);assert.equal(needs.length,6);assert.equal(definition.resources.length,44);
  assert.deepEqual(definition.resources.map(r=>r.row_id).sort(),[...boundIds,...controls,...needs].sort());
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  assert.equal(completeness.entries.length,44);
  const machine=definition.resources.find(r=>r.row_id===rowId('hydraulic-plant-consumed'))!;
  assert.equal(machine.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(machine.procurement_eligible,false);
  assert.equal(machine.source_metadata?.machinePriceScopeStatus,'MACHINE_PRICE_SCOPE_PENDING');assert.equal(machine.source_metadata?.machinePriceOwnerAdmitted,false);
  assert(!definition.resources.some(r=>r.unit_id==='machine_hour'&&r.resource_graph.costTreatment==='OWN_COST'));
  const included=[pack.scopeRu,
    'На100м: единый труд5,01чел.-ч, физическая работа04-0440=1,5маш.-ч; вода1м³, краска0,00005т, олифа0,00002т, льняной очёс0,02кг.',
    'Восемь исходных операций учтены в одном труде; четыре материальных заказа имеют отдельные балансы наличия, резерва, кратности, расхода и остатка.',
    'Только PARTIAL QUANTITY: 04-0440 INFORMATIONAL_SCOPE, состав эксплуатационной цены не допущен; шесть application-owned потребностей сохраняются.'];
  const excluded=[...pack.excludedRu,'Существующие13point-потребителей, PE250 проект, VALTEC PP-R и наружные/промышленные составы и их ручные цены/история не заменяются.'];
  const catalogId=proposal.catalogId;
  const core=(submittedParameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[])=>compileCanonicalEstimateCore({
    operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryMeasureParameterId,
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
    submittedParameters,confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:44,hashJson:async value=>estimateDeterministicHash(value)});
  return {contract:pack.contract,stopCode:'INTERNAL_STEEL_HYDROTEST_005_01',applicationName:'internal-steel-hydrotest-krer16-005-01',expectedBranch:'codex/r4-a5-clean-08b18902',
    masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
    parentReleaseId:context.definitionReleaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
    outputRoot:resolve('.release-runtime/next-wave-internal-steel-hydrotest/publication'),
    sourcePaths:['scripts/estimate/r4a13/prepareHydrotestInternalSteelDn50Column01AppendR1.ts','src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.ts',
      'src/lib/estimate/v4/hydrotestInternalSteelDn50Krer16R1.test.ts',paths.sourcePackPath,paths.currentReadPath,paths.targetedReadPath,paths.proposalPath,paths.decisionPath,paths.forkReceiptPath,
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts',
      'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',pack.source.path,pack.guidance.path],
    catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:pack.titleRu,source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',
      official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,
      use_restriction:pack.scopeRu+' PARTIAL QUANTITY; цена04-0440 не допущена, существующие платные owner не наследуются.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{tested_steel_pipe_length_m:100},acceptanceInput:hydrotestSteelAppendAcceptanceInputR2(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'INTERNAL_STEEL_DN50_005_01_SIX_PHYSICAL_FOUR_MATERIAL_BALANCES_EIGHT_OPERATIONS_SIX_NEEDS_PRICE_PENDING',
    passport:{canonicalRuName:proposal.titleRu,workKey:proposal.workKey,physicalResultRu:'Отдельный внутренний стальной водопровод DN≤50 испытан по проектной программе; расчёт отражает исходный ресурсный состав005-01, а не подтверждает фактическое испытание.',
      includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needs},
    applicability:{primaryMeasureParameterId:pack.primaryMeasureParameterId,exactColumn:pack.normId,sourceQuantityDenominatorM:100,quantityScope:'PARTIAL',
      sourceMachinePricePublicationAllowed:false,machinePriceScopeStatus:'MACHINE_PRICE_SCOPE_PENDING',paidMachineOwners:0,applicationNeeds:6,
      fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,globalAbsenceProved:false,oldPricesOrSavedRowsTransferred:false,
      acceptedCurrentReadSha256:SHA.current,acceptedTargetedReadSha256:SHA.targeted,rootDecisionSha256:SHA.decision,newGroupAbsenceCaptured:false,requiresStandardCreatePreflightAndLockedReread:true},
    binding:{rowId:boundIds[0]!,additionalRowIds:boundIds.slice(1),applicability:{exactColumn:pack.normId,quantityBasis:'100_METRES_INTERNAL_STEEL_NOMINAL_BORE_UP_TO_50_MM',
      sourceArtifactSha256:pack.source.sha256,knownBindings:18,derivedControlsNormativelyBound:false,unresolvedNeedsBound:false,machinePriceAdmission:false}},
    locator:{key:proposal.locatorKey,payload:{exactColumn:pack.normId,sourceArtifactSha256:pack.source.sha256,sourceResources:{labor:pack.labor,machine:pack.machine,materials:pack.materials},
      includedOperations:pack.operations,knownBindingRowIds:boundIds,unboundDerivedControlRows:controls,applicationNeeds:pack.gaps,
      acceptedCurrentReadSha256:SHA.current,acceptedTargetedReadSha256:SHA.targeted,rootDecisionSha256:SHA.decision,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m',canonicalNameRu:proposal.titleRu,aliases:['гидроиспытание внутреннего стального водопровода DN до50мм','КРЕР16-07-005-01','опрессовка стального водопровода по проектной длине'],
      shortScopeRu:pack.scopeRu+' Количественный PARTIAL-состав; цена установки и конкретные незакрытые задачи видимы.',
      keyDistinguishingParameters:[pack.primaryMeasureParameterId,...pack.scopeFacts.map(f=>f.id),'nominal_bore_mm'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:excluded,
      extraSearchTermsRu:'внутренний стальной водопровод номинальный проход DN50 гидравлическое испытание16-07-005-01 проектная длина',
      sourceProvenance:{sourcePack:packPath,sourceId:pack.sourceId,currentReadSha256:SHA.current,targetedReadSha256:SHA.targeted,rootDecisionSha256:SHA.decision,
        machinePricePending:true,fullTechnicalAcceptance:false,globalAbsenceProved:false}},
    catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
      identity:{namespace:'global',domain:'plumbing',sourceIdentity:proposal.sourceIdentity,workKey:proposal.workKey,titleRu:proposal.titleRu,denominatorEligible:true},
      searchPlacement:{...placement,groupMode:'create',elementType:'WORK',operationKind:'TESTING',
        groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',exactNorm:pack.normId,sourceSpecific:true},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,rootDecisionSha256:SHA.decision,fullTechnicalAcceptance:false},
        technologyVariant:'KRER16_07_005_01_INTERNAL_STEEL_WATER_DN_UP_TO_50',normativeClassifiers:['КРЕР16-07-005-01'],
        applicabilityTags:['INTERNAL_WATER','STEEL','NOMINAL_BORE_UP_TO_50','PROJECT_LENGTH_M','PARTIAL_QUANTITY','MACHINE_PRICE_SCOPE_PENDING'],
        publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/rc09:hyd_|rc09:labor:hyd-|rc09:equipment:hyd-|professional_.*_set|materials_0[1-6]/iu],
    owner:'ROOT_SINGLE_INTEGRATOR_PARTIAL_STEEL_HYDROTEST',receiptFileStem:'internal_steel_hydrotest_005_01',
    verifyCore:async()=>{
      for(const source of [pack.source,pack.guidance])assert.equal(sha(readFileSync(resolve(source.path))),source.sha256,'OFFICIAL_SOURCE_EXACT');
      assert(definition.parameters.every(p=>p.default_value===null));assert.deepEqual(definition.runtimeInput,{});
      for(const m of pack.materials)assert(!controls.some(id=>boundIds.includes(id)),'DERIVED_CONTROLS_NOT_NORM_BINDINGS:'+m.id);
      const baseline=await core(hydrotestSteelAppendAcceptanceInputR2());
      for(const [id,q] of [['whole-worker','5.01'],['hydraulic-plant-consumed','1.5'],['water-consumed','1'],['paint-consumed','0.00005'],['linseed-oil-consumed','0.00002'],['linen-consumed','0.02']])
        assert.equal(baseline.rows.find(r=>r.row_id===rowId(id))?.quantity,q,'EXACT_SOURCE:'+id);
      assert.equal(baseline.rows.length,30);assert.equal(baseline.preliminaryNeeds.length,6);
      assert.deepEqual(baseline.preliminaryNeeds.map(n=>n.row_id).sort(),needs.slice().sort());
      assert.equal(baseline.rows.filter(r=>r.included_in_estimate).length,5);assert(baseline.rows.every(r=>r.unit_price===null));
      const provenance={kind:'manual',reason:'VALIDATION_FIXTURE_ONLY manualsavedorder'};
      const edited=await core(hydrotestSteelAppendAcceptanceInputR2(35.5),{[rowId('paint')]:{quantity:'0.03',unitPrice:'77',titleRu:'VALIDATION_FIXTURE_ONLY MA-0115 order',provenance}});
      assert.equal(edited.rows.find(r=>r.row_id===rowId('paint'))?.amount,'2.31');assert.equal(edited.rows.find(r=>r.row_id===rowId('paint-consumed'))?.quantity,'0.00001775');
      const forced=await core(hydrotestSteelAppendAcceptanceInputR2(),{[machine.row_id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
      const forcedMachine=forced.rows.find(r=>r.row_id===machine.row_id)!;assert.equal(forcedMachine.included_in_estimate,false);assert.equal(forcedMachine.included_in_procurement,false);
      const fromSnapshot=await core(hydrotestSteelAppendAcceptanceInputR2(),{},[{price_key:machine.cost_owner_id!,unit_id:'machine_hour',unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]);
      assert.equal(fromSnapshot.rows.find(r=>r.row_id===machine.row_id)?.included_in_estimate,false);assert.equal(fromSnapshot.preliminaryNeeds.length,6);
      for(const id of needs){try{await core(hydrotestSteelAppendAcceptanceInputR2(),{[id]:{quantity:'0',unitPrice:'77',provenance}});throw Error('NEED_MANUAL_ZERO_UNEXPECTEDLY_ACCEPTED');}
        catch(error){assert.equal((error as {code?:string}).code,'ROW_AMENDMENT_INVALID');}}
      return {status:'PASS_PARTIAL_STEEL_HYDROTEST_QUANTITY_CORE_ONLY',resources:44,sourcePhysical:6,materialOrders:4,derivedControlsUnbound:20,
        includedOperations:8,normativeBindings:18,sourcePriceBindings:0,applicationNeeds:6,machinePriceStatus:'MACHINE_PRICE_SCOPE_PENDING',machinePaidOwners:0,
        fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,publicationPerformed:false};
    }};
}
