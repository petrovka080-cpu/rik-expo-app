// Config authoring only: no pg/publisher import, no on-import or CLI publication.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalMachineHourPriceRequirementV1,assertCanonicalMachineHourDefinitionV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {roadUpperGravel150DefinitionR1,roadUpperGravel150PackR1 as data,
 roadUpperGravel150CatalogIdR1 as catalogId,roadUpperGravel150WorkKeyR1 as workKey} from '../../../src/lib/estimate/v4/roadUpperGravel150Krer27Column02R1';
import proofFixture from '../../../data/estimate-benchmarks/fixtures/road-upper-gravel02-append-absence-r1.json';
import {validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(v)).digest('hex');
function need(v:unknown,code:string):asserts v{if(!v)throw Error('ROAD_UPPER02_APPEND:'+code);}
export const roadUpperGravel150AcceptanceInputR1={area_m2:1000,
 road_upper_project_conditions:data.projectConditionsValueRu,accepted_lower_layer:data.acceptedLowerLayerValueRu,
 road_upper_machine_fulfillment:data.machineFulfillmentValues[1],
 coarse_stone_specification:'VALIDATION_FIXTURE_ONLY:40–70mmM1200,notasupplieroffer',coarse_stone_stock:0,coarse_stone_reserve:0,coarse_stone_quantum:1,
 choke_stone_specification:'VALIDATION_FIXTURE_ONLY:5–20mmM1200,notasupplieroffer',choke_stone_stock:0,choke_stone_reserve:0,choke_stone_quantum:1,
 water_specification:'VALIDATION_FIXTURE_ONLY:confirmedwater,notactualsitefact',water_stock:0,water_reserve:0,water_quantum:1};
export function prepareRoadUpperGravel150Column02AppendR1(proof:Json=proofFixture):MasterSingleDefinitionSuccessorConfig {
 need(hash(proof)===data.expectedAbsenceProofStableSha256,'EXACT_SCOPE_AND_ABSENCE_PROOF_REQUIRED');
 need(proof.completeReadSet&&proof.transactionRolledBack&&proof.connectionClosed&&proof.noOwnedProcessStillRunning,'CLOSED_READ_ONLY_PROOF_REQUIRED');
 need(proof.sourcePreimageSha256==='5953cafb42913dfd345ae0a30cdc633463b21fe4c79b985030c99f0f1c5d5f9e'
  &&proof.pair.definitionReleaseId===data.parentPair.definitionReleaseId&&proof.pair.searchReleaseId===data.parentPair.searchReleaseId,'EXACT_PARENT_PAIR_REQUIRED');
 need(Object.values(proof.absenceSets).every((s:any)=>s.rowCount===0),'APPEND_COLLISION_NO_REPLAY');
 need(proof.proposedAppend.catalogId===catalogId&&proof.proposedAppend.workKey===workKey,'EXACT_PROPOSED_IDENTITY_REQUIRED');
 const definition=roadUpperGravel150DefinitionR1();
 const normativeRows=definition.resources.filter(r=>r.source_metadata?.sourceNormQuantityAccepted===true).map(r=>r.row_id);
 const unresolvedRows=definition.resources.filter(r=>r.row_id.startsWith(data.prefix+':open:')).map(r=>r.row_id);
 need(normativeRows.length===17&&unresolvedRows.length===5,'EXACT_NORMATIVE_AND_OPEN_SCOPE_REQUIRED');
 const included=['Россыпь и разравнивание, укатка и поливка, профилирование и планировка только верхнего150мм дорожного слоя',
  'КРЕР27-04-005-02: рабочие36.96чел.-ч, шесть машин суммарно52.72маш.-ч, щебень40–70М1200=189м³, щебень5–20М1200=15м³ и вода30м³ на1000м²',
  'Три независимых владельца поставки: нормативный расход, совместимое наличие, резерв, кратность, заказ и остаток',
  'Нормативные машинисты52.72чел.-ч справочно входят в ставки соответствующих машин; повторная оплата исключена'];
 const excluded=[...data.excluded,'Подтверждение внешней доставки, мобилизации, дополнительного QA, защиты/оснащения и обращения с отходами из площади'];
 const completeness={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,
  evidenceSha256:data.source.sha256,evidenceReferences:[data.source.officialUrl,'PDF48,27-04-005-02'],
  entries:[...data.resources.map(r=>{const rowId=data.prefix+':'+(r.unitId==='machine_hour'?'equipment:'+r.id:r.unitId==='m3'?'material:'+r.id+':consumed':r.id);
   return {operationId:'road-upper02',expectedResourceId:'KRER27-04-005-02:'+r.id,condition:'EXACT_UPPER150MM_M1200_ROAD_METHOD_ON_ACCEPTED_LOWER_LAYER',sourceId:data.sourceId,
    unitId:r.unitId,quantityRule:'AREA_M2_TIMES_PRINTED_RATE_DIVIDED_BY1000',formulaId:data.prefix+':formula:'+rowId.slice(data.prefix.length+1),resolution:{kind:'ROW',rowId}};}),
   ...['spread-level','roll-water','profile-grade'].map(id=>({operationId:'road-upper02',expectedResourceId:'printed-operation:'+id,
    condition:'EXACT_UPPER150MM_M1200_ROAD_METHOD',sourceId:data.sourceId,formulaId:data.prefix+':formula:included:'+id,
    resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:data.prefix+':included:'+id,parentRowId:data.prefix+':worker'}})),
   ...data.unresolvedNeeds.map(g=>({operationId:'road-upper02-completion',expectedResourceId:g.id,condition:'KEEP_UNRESOLVED_UNTIL_ACTUAL_SCOPE_QUANTITY_AND_COST_OWNER_CONFIRMED',
    sourceId:data.sourceId,formulaId:data.prefix+':formula:open:'+g.id,quantityAccepted:false,resolution:{kind:'ROW',rowId:data.prefix+':open:'+g.id}}))]};
 return {contract:data.contract,stopCode:'ROAD_UPPER02',applicationName:'road-upper-gravel150-column02',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/MASTER_TZ_GOX_BUILD_PRODUCTION (10).md',masterSha256:'90e84fbfbf17321f1dd935f5e56a090f31619a3336e582bfabe1e66fcdfa48d7',
  parentReleaseId:data.parentPair.definitionReleaseId,parentSearchReleaseId:data.parentPair.searchReleaseId,
  currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
  outputRoot:resolve('.release-runtime/next-wave-road-upper02/publication'),
  sourcePaths:['scripts/estimate/r4a13/prepareRoadUpperGravel150Column02AppendR1.ts','src/lib/estimate/v4/roadUpperGravel150Krer27Column02R1.ts',
   'data/estimate-benchmarks/source-packs/road-upper-gravel150-krer27-005-02-r1.json','data/estimate-benchmarks/fixtures/road-upper-gravel02-append-absence-r1.json',
   'tests/estimateNorms/roadUpperGravel150Column02R1.contract.test.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
   'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
   'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',data.source.path],
  catalogId,sourceId:data.sourceId,normId:data.normId,
  sourceMetadata:{source_title:'КРЕР27-2015,27-04-005-02: верхний слой двухслойного щебёночного основания150мм',
   source_authority:'Министерство строительства Кыргызской Республики',source_kind:'OFFICIAL_NORM_EXACT_SINGLE_COLUMN',official_url:data.source.officialUrl,
   artifact_sha256:data.source.sha256,exact_locator:'Физическая/печатная стр.48; измеритель1000м²; только колонка27-04-005-02',
   use_restriction:data.projectConditionsValueRu+' '+data.acceptedLowerLayerValueRu+' Другой слой, внутреннее основание или недоступная тяжёлым механизмам площадка не допускаются этим профилем.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{area_m2:1000},acceptanceInput:roadUpperGravel150AcceptanceInputR1,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'ROAD_UPPER02_SOURCE11ROWS_SIX_MACHINE_COVERAGE_THREE_SUPPLY_BALANCES_FIVE_OPEN_NEEDS',
  passport:{canonicalRuName:data.titleRu,workKey,physicalResultRu:'Отдельно учтённый верхний150мм слой двухслойного наружного дорожного щебёночного основания, М1200, на принятом нижнем слое.',
   includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:unresolvedRows},
  applicability:{primaryMeasureParameterId:'area_m2',exactNorm:'KRER27-04-005-02',upperLayerThicknessMm:150,lowerLayerAlreadyAccepted:true,
   heavyRoadFleetAccessRequired:true,insideBuildingNotAdmitted:true,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0,
   hiddenDefaultProfile:false,oldGeneric59RowsOrPricesImported:false,sourceScopeAbsenceProofSha256:data.sourcePreimageSha256},
  binding:{rowId:normativeRows[0],additionalRowIds:normativeRows.slice(1),applicability:{exactColumn:'27-04-005-02',quantityBasis:'1000M2_UPPER150MM_LAYER_ONLY',sourceArtifactSha256:data.source.sha256}},
  locator:{key:data.expectedAppend.locatorKey,payload:{kind:'EXACT_OFFICIAL_ROAD_UPPER_LAYER_SOURCE',sourceArtifact:data.source.path,sourceArtifactSha256:data.source.sha256,
   physicalPrintedPage:48,column:'27-04-005-02',sourceRows:data.resources,sourceNormativeBindingRowIds:normativeRows,
   independentScopeAbsenceProofSha256:data.sourcePreimageSha256,quantityScope:'PARTIAL',fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0}},
  search:{primaryUom:'m2',canonicalNameRu:data.titleRu,aliases:['верхний слой двухслойного щебёночного основания150мм','щебеньМ1200 40–70 и5–20 дорожное основание'],
   shortScopeRu:'Только верхний150мм дорожный слой на готовом нижнем слое; шесть тяжёлых механизмов и точная колонка02. Наличие, поставка, цены и дополнительные работы требуют фактов.',
   keyDistinguishingParameters:['area_m2',...projectFactsForConfig()],clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'КРЕР27-04-005-02 верхний дорожный слой150мм двухслойное щебёночное основание М1200',
   sourceProvenance:{sourcePack:'data/estimate-benchmarks/source-packs/road-upper-gravel150-krer27-005-02-r1.json',appendDistinctUpperLayer:true,
    sourcePreimageSha256:data.sourcePreimageSha256,noExistingGenericRatesOrSavedPricesTransferred:true,fullTechnicalAcceptance:false}},
  catalogAppend:{requireUniqueWorkKey:true,identity:{namespace:'global',domain:'roadworks',sourceIdentity:'master-work:'+workKey,workKey,titleRu:data.titleRu,denominatorEligible:true},
   searchPlacement:{groupMode:'create',groupId:data.expectedAppend.groupId,groupNameRu:'Дорожное основание: верхний щебёночный слой150ммМ1200',domainId:'roadworks',systemId:'road_base',
    subsystemId:data.expectedAppend.groupId,assemblyId:data.expectedAppend.groupId,workFamilyId:'road_upper_base_150mm_krer27_005_02',breadcrumb:['Дорожные основания','Верхний щебёночный слой150мм'],
    groupOracleDisposition:{contract:data.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:'KRER27_04_005_02_UPPER150MM'},membershipOrdinal:0,
    independentDisposition:{contract:data.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,appendedWithoutReplacingExistingIdentity:true,fullTechnicalAcceptance:false},
    elementType:'WORK',operationKind:'NEW_INSTALLATION',technologyVariant:'KRER27_04_005_02_UPPER_LAYER_150MM_M1200',constructionState:'NEW',normativeClassifiers:['КРЕР27-04-005-02'],
    applicabilityTags:['OUTDOOR_ROAD_BASE','UPPER_LAYER_ONLY','150MM','M1200','HEAVY_ROAD_FLEET','LOWER_LAYER_ACCEPTED','PARTIAL_COMPOSITION'],
    publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
  forbiddenAdjacentMatchers:[/asphalt:|road-base:|gravel-base:|professional_.*_set|materials_0[1-6]/iu],owner:'NEXT_WAVE_ROAD_UPPER02_SINGLE_INTEGRATOR',receiptFileStem:'road_upper_gravel150_column02',
  verifyCore:async()=>{
   need(validateIndependentCompletenessMapReferences({completenessMap:completeness,
    formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}).length===0,'EXACT_INCLUDED_OPERATION_PARENT_MAP_REQUIRED');
   need(createHash('sha256').update(readFileSync(resolve(data.source.path))).digest('hex')===data.source.sha256,'PRIMARY_PDF_PIN_REQUIRED');
   need(definition.parameters.every(p=>p.default_value==null)&&Object.keys(definition.runtimeInput).length===0,'HIDDEN_SITE_DEFAULT_FORBIDDEN');
   for(const expected of data.machineCoverageAdmissionRequired.resourceRows){
    const requirement=canonicalMachineHourPriceRequirementV1(expected.rowId,'machine_hour');
    const row=definition.resources.find(r=>r.row_id===expected.rowId)!;
    const admitted=assertCanonicalMachineHourDefinitionV1({catalogId,rowId:row.row_id,unitId:row.unit_id,sourceMetadata:row.source_metadata});
    need(requirement?.resourceCode===expected.resourceCode&&requirement.operator===expected.operator&&admitted?.resourceCode===expected.resourceCode,'ROOT_EXISTING_MACHINE_COVERAGE_MAP_ADMISSION_REQUIRED');
   }
   const result=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:data.contract,catalogId,primaryMeasureParameterId:'area_m2',
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
    submittedParameters:roadUpperGravel150AcceptanceInputR1,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:definition.resources.length,hashJson:hash});
   for(const [id,q] of [['worker','36.96'],['operators','52.72'],['material:coarseStone:consumed','189'],['material:chokeStone:consumed','15'],['material:water:consumed','30']])
    need(result.rows.find(r=>r.row_id===data.prefix+':'+id)?.quantity===q,'EXACT_SOURCE_QUANTITY_REQUIRED:'+id);
   need(result.rows.find(r=>r.row_id===data.prefix+':operators')?.included_in_estimate===false,'SECOND_OPERATOR_PAYMENT_FORBIDDEN');
   need(result.preliminaryNeeds.length===5,'FIVE_SOURCE_GAPS_REQUIRED');
   return {status:'PASS_EXACT_COLUMN02_QUANTITY_CORE_ONLY',publicationPerformed:false,oldGenericRatesImported:false,fullTechnicalAcceptance:false,
    acceptedNewCompleteTypes:0,sourceRows:11,normativeBindingRows:17,unresolvedNeeds:5,coverageOwners:6};
  }};
}
function projectFactsForConfig(){return ['road_upper_project_conditions','accepted_lower_layer','road_upper_machine_fulfillment'];}
