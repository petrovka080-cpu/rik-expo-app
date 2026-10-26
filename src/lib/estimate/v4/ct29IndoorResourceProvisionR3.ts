import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-resource-provision-r3.json';
import {buildCt29IndoorDeliveryCleanupDefinitionR2,ct29IndoorDeliveryCleanupCompletenessMapR2} from './ct29IndoorDeliveryCleanupR2';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {Ct29PlasterSourcePackS2754} from './ct29IndoorPlasterS2754';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {compareFormulaGraphDecimals} from '../backendPlatform/formulaGraph';

export const ct29IndoorResourceProvisionPackR3 = pack;
const quantityParameter = (key:string) => 'ct29_provision_r3_'+key.replaceAll('-','_');
const suppliedPhysicalItems=new Set(['mixer-drive','mixer-paddle',...pack.handToolProfiles.map(p=>p.resourceKey)]);
const provisionProfile=(key:string)=>pack.handToolProfiles.find(p=>p.resourceKey===key)??pack.mixingDriveProfile;

export function assertCt29HandToolProfilesR3(profiles:typeof pack.handToolProfiles){
  const float=profiles.find(p=>p.resourceKey==='metal-float'),measure=profiles.find(p=>p.resourceKey==='water-measure');
  if(profiles.length!==2||profiles.some(p=>p.requiredCount!==1||p.countExpression!=='min(1,ct29_whole_batches)')
    ||float?.model!=='STAYER0803'||float.specification.bladeLengthMm!==480||float.specification.bladeWidthMm!==130
    ||measure?.model!=='Bürkle7204-1000'||measure.specification.nominalMl!==1000||measure.specification.graduationMl!==10
    ||measure.specification.acceptedDoseMl!==6200||measure.specification.fullFills!==6||measure.specification.partialFillMl!==200
    ||measure.specification.fullFills*measure.specification.nominalMl+measure.specification.partialFillMl!==6200
    ||measure.specification.partialFillMl%measure.specification.graduationMl!==0){
    throw Error('CT29_HAND_TOOL_PROFILE_INCOMPATIBLE');
  }
}

export function assertCt29MixingDriveProfileR3(profile:typeof pack.mixingDriveProfile){
  const {drive,paddle,batch}=profile;
  if(profile.requiredSimultaneousFunctionalCount!==1 || profile.countExpression!=='min(1,ct29_whole_batches)'
    ||drive.sku!=='29018'||drive.suppliedPaddleSku!==paddle.sku||paddle.sku!=='40113-000'
    ||drive.coupling!==paddle.coupling||drive.coupling!=='HEXAFIX'
    ||batch.dryKg!==25||batch.waterMaxL!==6.2||batch.maximumPlanningWetKg!==31.2
    ||compareFormulaGraphDecimals(String(paddle.mixingMinKg),String(batch.maximumPlanningWetKg))>0
    ||compareFormulaGraphDecimals(String(paddle.mixingMaxKg),String(batch.maximumPlanningWetKg))<0
    ||paddle.diameterMm>drive.standardPaddleMaxDiameterMm||paddle.minDriveW>drive.powerW){
    throw Error('CT29_SINGLE_BATCH_DRIVE_PROFILE_INCOMPATIBLE');
  }
}

/** A source-authoring successor, retaining R1/R2 numerical and transport owners.
 * An overhead price scope cannot supply missing physical inventory quantities.
 * Unknown tool profiles stay application-owned needs, including in the UI. */
export function buildCt29IndoorResourceProvisionDefinitionR3(
  source:Ct29PlasterSourcePackS2754,prefix:string,
):AutomaticOwnerDefinition {
  if(source.catalogId!==pack.catalogId)throw Error('EXACT_CT29_INDOOR_PROVISION_R3_SCOPE_REQUIRED');
  assertCt29MixingDriveProfileR3(pack.mixingDriveProfile);
  assertCt29HandToolProfilesR3(pack.handToolProfiles);
  const base=buildCt29IndoorDeliveryCleanupDefinitionR2(source,prefix),id=(key:string)=>prefix+':'+key;
  const operation=(key:string)=>{
    const o=pack.operations.find(candidate=>candidate.id===key);
    if(!o)throw Error('CT29_PROVISION_OPERATION_NOT_DECLARED:'+key);
    return {operationId:id('operation:'+o.id),operationTitleRu:o.titleRu,completionCriterionRu:o.resultRu,
      processOrdinal:o.ordinal,processRole:'PROCESS' as const};
  };
  const extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,
    sourceId:pack.source.id,normId:pack.contract,sourceMetadata:{source_title:pack.titleRu,
      source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
    applicabilityRu:pack.resultRu,ordinary:[],profile:[],
    conditional:pack.needs.map(need=>({id:quantityParameter(need.id),title:need.titleRu,
      valueType:'decimal' as const,unitId:need.unitId,kind:'internal' as const,min:0})),
    rows:pack.needs.map(need=>({rowId:id(need.id),formulaId:id('formula:'+need.id),
      section:need.operations[0],category:need.category,title:need.titleRu,
      unitId:need.unitId,expression:quantityParameter(need.id),procurement:false,
      costTreatment:need.costTreatment as 'INCLUDED_IN_RESOURCE_ROWS'|'INFORMATIONAL_SCOPE'})),
    deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[pack.incomingBoundaryRu,pack.readiness.ruleRu]});
  const added=new Map(pack.needs.map(need=>[id(need.id),need]));
  const parameters=[...base.parameters,...extra.parameters.map(parameter=>{
    const need=pack.needs.find(n=>quantityParameter(n.id)===parameter.parameter_id)!;
    if(suppliedPhysicalItems.has(need.id))return {...parameter,truth_metadata:{...parameter.truth_metadata,
      source_confirmation_required:false,visibility_role:'INTERNAL_ONLY',value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',
      provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',
      runtime_profile_value:true,preliminary_compilation_allowed:true,preliminary_value_formula_v1:{
        version:'canonical-preliminary-parameter-formula:v1',expression:provisionProfile(need.id).countExpression,
        explicitValuePolicy:'REQUIRE_MATCH',when:{kind:'literal',value:true}}}};
    return {...parameter,truth_metadata:unresolvedApplicationNormTruthR1({
      ...parameter.truth_metadata,source_confirmation_required:false},need.reasonRu)};
  })].map((parameter,ordinal)=>({...parameter,ordinal}));
  const detailKeys=new Set(['net-mixture','25kg-minimum-batches','25kg-prepared-mixture','25kg-plan-excess',
    '25kg-ordered-bags','25kg-mix-water-min','25kg-mix-water-max']);
  const resources=[...base.resources,...extra.resources].map((row,ordinal)=>{
    const need=added.get(row.row_id),key=row.row_id.slice(prefix.length+1),graph=row.resource_graph;
    const supplied=suppliedPhysicalItems.has(key),profile=provisionProfile(key);
    const {row_sha256:_old,...body}=row;
    const presentation=graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;
    const changed={...body,ordinal,
      ...(need?.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{cost_owner_id:id(need.costOwner)}:{}),
      resource_graph:{...graph,
        ...(need?{
          ...(need.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'?{parentCostOwnerId:id(need.costOwner),includedInResourceOwnerRowId:id(need.costOwner)}:{}),
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
            ...operation(need.operations[0]),additionalOperations:need.operations.slice(1).map(operation)},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
            sourceTitleRu:row.title_ru,nameRu:need.titleRu,brandAndModelRu:null,
            specificationRu:need.specificationRu,detailsRu:[need.reasonRu,pack.readiness.ruleRu]}}:{}),
        ...(supplied?{purchaseBalanceV1:{unitId:'pcs',consumedExpression:profile.countExpression,
          stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'1'}}:{}),
        ...(detailKeys.has(key)&&presentation?{publicResourcePresentationV1:{...presentation,rowKind:'CALCULATION_DETAIL'}}:{}),
        ...(key==='25kg-order'?{operationCompositionV1:{
          ...(graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:[operation('application')]}}:{}),
      },
      source_metadata:{...row.source_metadata,physicalResourceCoverageComplete:false,
        ...(need?{official_url:need.requirementsEvidence[0].url,artifact_sha256:need.requirementsEvidence[0].sha256,exact_locator:need.locatorRu,
          sourceRole:need.sourceRole,numericNormAccepted:false,physicalProvisionAccepted:false,
          physicalProvisionReasonRu:need.reasonRu,sourceAuthorObligations:[need.reasonRu],normativeTrace:[],
          expectedCompositionEvidence:need.requirementsEvidence,
          ...(need.costTreatment==='INFORMATIONAL_SCOPE'?{costOwnerAdmissionPending:true,automaticSecondPaymentForbidden:true}:{})}:{}),
        ...(supplied?{physicalProvisionAccepted:true,physicalProvisionProfileId:profile.id,
          physicalProvisionBasis:'ONE_ACTIVE_SEQUENTIAL_POST_NOT_MANUFACTURER_CREW_NORM',
          requiredSimultaneousFunctionalCount:1,manufacturerCrewQuantityNormClaimed:false,
          sourceAuthorObligations:'stillOpenRu' in profile?profile.stillOpenRu:profile.limitsRu,
          physicalProvisionEvidence:profile.sources.map(s=>({sha256:s.sha256,url:s.url,locator:profile.locatorsRu.join('; ')}))}:{}),
        ...(['mixer','loader','hoist'].includes(key)?{physicalMachineProvisionAccepted:false,
          normativeAllocationDoesNotProveActualProvision:true}:{}),
      }};
    return {...changed,row_sha256:estimateDeterministicHash(changed)};
  });
  return {...base,parameters,formulas:[...base.formulas,...extra.formulas],resources};
}

/** Expected resources come from the authored technology manifest, never from
 * the rows under test. A deleted tool need cannot improve completeness. */
export function ct29IndoorResourceProvisionCompletenessMapR3(source:Ct29PlasterSourcePackS2754,prefix:string){
  const base=ct29IndoorDeliveryCleanupCompletenessMapR2(source,prefix),id=(key:string)=>prefix+':'+key;
  return {...base,sourceKind:'TECHNOLOGY_MAP',operationResourceBindingRequired:true,
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
    entries:[...base.entries.map(entry=>({...entry,
      requiredOperationIds:[id('operation:'+entry.operationId),
        ...(entry.expectedResourceId==='purchase-ct29'?[id('operation:application')]:[])]})),
      ...pack.needs.map(need=>({expectedResourceId:need.id,operationId:need.operations[0],
        requiredOperationIds:need.operations.map(key=>id('operation:'+key)),category:need.category,
        specification:need.specificationRu,condition:'EXACT_CT29_INDOOR_SCOPE',sourceId:pack.source.id,
        unitId:need.unitId,quantityRule:suppliedPhysicalItems.has(need.id)?'ONE_ACTIVE_SEQUENTIAL_POST_SHARED_COMPONENT':'UNRESOLVED_APPLICATION_PHYSICAL_PROVISION_NOT_USER_INPUT',
        formulaId:id('formula:'+need.id),resolution:need.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'
          ?{kind:'INCLUDED_COMPONENT_ROW',rowId:id(need.id),parentRowId:id(need.costOwner)}
          :{kind:'ROW',rowId:id(need.id)}})),
      ...pack.notApplicable.map(need=>({expectedResourceId:need.id,operationId:need.operations[0],category:need.category,
        condition:'EXACT_CT29_INDOOR_SCOPE',sourceId:pack.source.id,
        resolution:{kind:'NOT_APPLICABLE',reasonRu:need.reasonRu}}))],
    openAuthorObligations:[...base.openAuthorObligations,...pack.needs.filter(need=>!suppliedPhysicalItems.has(need.id)).map(need=>need.reasonRu)],
  };
}
