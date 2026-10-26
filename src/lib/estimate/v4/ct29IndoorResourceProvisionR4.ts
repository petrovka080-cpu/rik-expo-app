import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-indoor-resource-provision-r4.json';
import {buildCt29IndoorResourceProvisionDefinitionR3,ct29IndoorResourceProvisionCompletenessMapR3,
  ct29IndoorResourceProvisionPackR3} from './ct29IndoorResourceProvisionR3';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import type {Ct29PlasterSourcePackS2754} from './ct29IndoorPlasterS2754';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const ct29IndoorResourceProvisionPackR4=pack;
const parameterId=(key:string)=>'ct29_provision_'+(['mixing-vessel','sprayer'].includes(key)?'r3_':'r4_')+key.replaceAll('-','_');
const priorKnown=['mixer-drive','mixer-paddle','metal-float','water-measure'];
export const ct29KnownPhysicalResourceKeysR4=[...priorKnown,...pack.profiles.map(p=>p.resourceKey)];
export const ct29OpenPhysicalResourceKeysR4=['curing-water',...ct29IndoorResourceProvisionPackR3.needs
  .filter(n=>!ct29KnownPhysicalResourceKeysR4.includes(n.id)).map(n=>n.id),...pack.additionalNeeds.map(n=>n.id)];

export function assertCt29PhysicalProfilesR4(profiles:typeof pack.profiles){
  const vessel=profiles.find(p=>p.resourceKey==='mixing-vessel'),sprayer=profiles.find(p=>p.resourceKey==='sprayer'),
    cleaner=profiles.find(p=>p.resourceKey==='paddle-cleaner');
  if(profiles.length!==3||profiles.some(p=>p.requiredCount!==1||p.countExpression!=='min(1,ct29_whole_batches)')
    ||vessel?.sku!=='60601'||vessel.specification.nominalL!==34||vessel.specification.usefulL!==25
    ||vessel.specification.freshMortarDensityKgPerL!==1.89
    ||vessel.specification.approximateFreshBatchL!==31.2/1.89
    ||vessel.specification.approximateFreshBatchL>vessel.specification.usefulL
    ||vessel.specification.rotationBarIncluded!==false
    ||sprayer?.sku!=='000860.0000'||sprayer.specification.fillL!==1||sprayer.specification.totalL!==1.1
    ||!sprayer.specification.waterCompatibilityConfirmed||!sprayer.specification.adjustableFineNozzle
    ||!sprayer.specification.manualDoubleActingPump||sprayer.specification.careWaterNormL!==null
    ||sprayer.specification.fillCount!==null||cleaner?.sku!=='46036'
    ||cleaner.specification.maxPaddleDiameterMm!==210||cleaner.specification.selectedPaddleDiameterMm!==135
    ||cleaner.specification.integralBrushCount!==2||!cleaner.specification.integralLid
    ||cleaner.specification.compatibleDriveFamily!=='XQ'||cleaner.specification.washWaterL!==null){
    throw Error('CT29_R4_PHYSICAL_PROFILE_INCOMPATIBLE');
  }
}

/** Add physical items to the retained definition. Container capacity is never
 * admitted as a water consumption norm; missing restraint remains mandatory. */
export function buildCt29IndoorResourceProvisionDefinitionR4(source:Ct29PlasterSourcePackS2754,prefix:string):AutomaticOwnerDefinition {
  if(source.catalogId!==pack.catalogId)throw Error('EXACT_CT29_INDOOR_PROVISION_R4_SCOPE_REQUIRED');
  assertCt29PhysicalProfilesR4(pack.profiles);
  const base=buildCt29IndoorResourceProvisionDefinitionR3(source,prefix),id=(key:string)=>prefix+':'+key,
    cleaner=pack.profiles.find(p=>p.resourceKey==='paddle-cleaner')!,lock=pack.additionalNeeds[0],
    additional=[{key:cleaner.resourceKey,title:cleaner.titleRu,category:cleaner.category,costOwner:cleaner.costOwnerKey},
      {key:lock.id,title:lock.titleRu,category:lock.category,costOwner:lock.costOwner}],
    extra=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.source.id,normId:pack.contract,
      sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
        artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},applicabilityRu:pack.resultRu,ordinary:[],profile:[],
      conditional:additional.map(n=>({id:parameterId(n.key),title:n.title,valueType:'integer',unitId:'pcs',kind:'conditional',min:0})),
      rows:additional.map(n=>({rowId:id(n.key),section:'Обеспечение подработ CT29',category:n.category,title:n.title,unitId:'pcs',
        formulaId:id('formula:'+n.key),expression:parameterId(n.key),procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS'})),
      deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[pack.readiness.ruleRu]}),
    profiles=new Map(pack.profiles.map(p=>[id(p.resourceKey),p]));
  const parameters=[...base.parameters,...extra.parameters].map((p,ordinal)=>{
    const profile=pack.profiles.find(profile=>parameterId(profile.resourceKey)===p.parameter_id);
    if(!profile)return {...p,ordinal,...(p.parameter_id===parameterId(lock.id)?{truth_metadata:unresolvedApplicationNormTruthR1(
      {...p.truth_metadata,source_confirmation_required:false},lock.reasonRu)}:{})};
    const {unresolved_norm_reason:_reason,...truth}=p.truth_metadata;
    return {...p,ordinal,truth_metadata:{...truth,source_confirmation_required:false,visibility_role:'INTERNAL_ONLY',
      value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
      runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',runtime_profile_value:true,preliminary_compilation_allowed:true,
      preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:profile.countExpression,
        explicitValuePolicy:'REQUIRE_MATCH',when:{kind:'literal',value:true}}}};
  });
  const operation=(key:string)=>{
    const o=pack.operations.find(o=>o.id===key);if(!o)throw Error('CT29_R4_UNKNOWN_OPERATION:'+key);
    return {operationId:id('operation:'+o.id),operationTitleRu:o.titleRu,completionCriterionRu:o.resultRu,
      processOrdinal:o.ordinal,processRole:'PROCESS' as const};
  };
  const resources=[...base.resources,...extra.resources].map((row,ordinal)=>{
    const profile=profiles.get(row.row_id),isLock=row.row_id===id(lock.id),
      shared=pack.sharedPoweredCleaningRequirements.find(n=>row.row_id===id(n.resourceKey));
    if(shared){
      const {row_sha256:_hash,...body}=row,changed={...body,ordinal,resource_graph:{...row.resource_graph,
        operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
          ...operation(shared.operations[0]),additionalOperations:shared.operations.slice(1).map(operation)}},
        source_metadata:{...row.source_metadata,additionalRequiredOperationEvidence:shared.requirementsEvidence,
          additionalRequiredOperationReasonRu:shared.reasonRu}};
      return {...changed,row_sha256:estimateDeterministicHash(changed)};
    }
    if(!profile&&!isLock)return {...row,ordinal};
    const {row_sha256:_hash,...body}=row,operations=profile?.operations??lock.operations,
      title=profile?.titleRu??lock.titleRu,specification=profile?.specificationRu??lock.specificationRu,
      details=profile?[profile.derivationRu,...profile.limitsRu,pack.readiness.ruleRu]:[lock.reasonRu,pack.readiness.ruleRu],
      evidence=profile?.sources??lock.requirementsEvidence,locator=profile?profile.locatorsRu.join('; '):lock.locatorRu,
      changed={...body,ordinal,title_ru:title,cost_owner_id:id(profile?.costOwnerKey??lock.costOwner),
        resource_graph:{...row.resource_graph,parentCostOwnerId:id(profile?.costOwnerKey??lock.costOwner),
          includedInResourceOwnerRowId:id(profile?.costOwnerKey??lock.costOwner),
          operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.titleRu,
            ...operation(operations[0]),additionalOperations:operations.slice(1).map(operation)},
          publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',
            sourceTitleRu:title,nameRu:title,brandAndModelRu:null,specificationRu:specification,detailsRu:details},
          // A functional post count is not an admitted order. Stock, reserve
          // and supply quantum require actual provision records; no policy here.
        },
        source_metadata:{...row.source_metadata,official_url:evidence[0].url,artifact_sha256:evidence[0].sha256,exact_locator:locator,
          numericNormAccepted:false,physicalProvisionAccepted:!!profile,physicalResourceCoverageComplete:false,
          sourceRole:profile?'CALCULATED_SINGLE_SERIAL_POST_CONCRETE_TOOL_PROVISION':'UNRESOLVED_REQUIRED_PHYSICAL_COMPONENT',
          physicalProvisionReasonRu:profile?.derivationRu??lock.reasonRu,expectedCompositionEvidence:evidence,normativeTrace:[],
          sourceAuthorObligations:profile?.limitsRu??[lock.reasonRu],
          ...(profile?{physicalProvisionProfileId:profile.id,physicalProvisionBasis:'ONE_ACTIVE_SEQUENTIAL_POST_NOT_MANUFACTURER_CREW_NORM',
            requiredSimultaneousFunctionalCount:1,manufacturerCrewQuantityNormClaimed:false,
            physicalProvisionEvidence:evidence.map(s=>({url:s.url,sha256:s.sha256,locator}))}:{})}};
    return {...changed,row_sha256:estimateDeterministicHash(changed)};
  });
  return {...base,parameters,formulas:[...base.formulas,...extra.formulas],resources};
}

export function ct29IndoorResourceProvisionCompletenessMapR4(source:Ct29PlasterSourcePackS2754,prefix:string){
  const base=ct29IndoorResourceProvisionCompletenessMapR3(source,prefix),id=(key:string)=>prefix+':'+key,
    replacedReasons=new Set(ct29IndoorResourceProvisionPackR3.needs.filter(n=>pack.profiles.some(p=>p.resourceKey===n.id)).map(n=>n.reasonRu)),
    extra=[{key:'paddle-cleaner',operations:['mixing','completion'],specification:pack.profiles[2].specificationRu},
      {key:'mixing-rotation-lock',operations:['mixing'],specification:pack.additionalNeeds[0].specificationRu}];
  return {...base,entries:[...base.entries.map(entry=>{
    const profile=pack.profiles.find(p=>p.resourceKey===entry.expectedResourceId);
    const shared=pack.sharedPoweredCleaningRequirements.find(n=>n.resourceKey===entry.expectedResourceId);
    if(shared)return {...entry,requiredOperationIds:shared.operations.map(o=>id('operation:'+o))};
    return profile?{...entry,specification:profile.specificationRu,
      quantityRule:'ONE_ACTIVE_SEQUENTIAL_POST_SHARED_COMPONENT',requiredOperationIds:profile.operations.map(o=>id('operation:'+o))}:entry;
  }),...extra.map(item=>({expectedResourceId:item.key,operationId:item.operations[0],requiredOperationIds:item.operations.map(o=>id('operation:'+o)),
    category:'equipment',specification:item.specification,condition:'EXACT_CT29_INDOOR_SCOPE',sourceId:pack.source.id,unitId:'pcs',
    quantityRule:item.key==='paddle-cleaner'?'ONE_ACTIVE_SEQUENTIAL_POST_SHARED_COMPONENT':'UNRESOLVED_APPLICATION_PHYSICAL_PROVISION_NOT_USER_INPUT',
    formulaId:id('formula:'+item.key),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:id(item.key),parentRowId:id('labor')}}))],
    openAuthorObligations:[...base.openAuthorObligations.filter(r=>!replacedReasons.has(r)),pack.additionalNeeds[0].reasonRu]};
}
