import idcPack from '../../../data/estimate-benchmarks/source-packs/low-current-idc-whole-manual-post-r24.json';
import proPack from '../../../data/estimate-benchmarks/source-packs/low-current-copper-certifier-pro-stock-r24.json';
import {appendLowCurrentIdcWholeManualPostR24,lowCurrentIdcPostResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/lowCurrentIdcWholeManualPostR24';
import {appendLowCurrentCopperCertifierProStockR24,lowCurrentCopperCertifierProStockResourceIdsR24} from '../../../src/lib/estimate/backendPlatform/lowCurrentCopperCertifierProStockR24';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {canonicalEstimateResourceIncludedByDefault} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalConditionParameterIds} from '../../../src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';

/** One existing SCS successor. Both source-only components use the same actual
 * captured base, not one component pretending to be a historical capture.
 * ROOT still must select/admit the real, bounded composite source identity. */
export type LowCurrentScsPostsCompositionInputR24=Readonly<{
  hostConfig:MasterSingleDefinitionSuccessorConfig;
  capturedParentDefinition:AutomaticOwnerDefinition;
  expectedCapturedComputationSha256:string;
  rootReviewedBundleArtifact:Readonly<{path:string;sha256:string}>;
  newSourcePaths:readonly string[];
  verifyWholePostCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
}>;

export function lowCurrentScsPostsSingleSuccessorDefinitionR24(input:LowCurrentScsPostsCompositionInputR24):AutomaticOwnerDefinition{
  const host=input.hostConfig,base=input.capturedParentDefinition;
  if(host.catalogId!==idcPack.hostCatalogId||host.catalogId!==proPack.hostCatalogId||host.catalogAppend!==undefined)
    throw Error('LOW_CURRENT_POSTS_ONE_EXISTING_SCS_OWNER_REQUIRED');
  if(!host.binding.retainParentBindings||!host.capturedScopedNormativeRegistry)
    throw Error('LOW_CURRENT_POSTS_ACTUAL_PARENT_AND_REGISTRY_CAPTURE_REQUIRED');
  if(host.projectSourcePackagePath!==undefined)throw Error('LOW_CURRENT_POSTS_PROJECT_JSON_NOT_MANUFACTURER_SOURCE_ADMISSION');
  if(!/^[a-f0-9]{64}$/.test(input.rootReviewedBundleArtifact.sha256)
    ||host.sourceMetadata.artifact_sha256!==input.rootReviewedBundleArtifact.sha256
    ||host.sourceMetadata.source_kind!=='MANUFACTURER_PACKAGE_INVENTORY_NO_INSTALLATION_RATE'
    ||!input.newSourcePaths.includes(input.rootReviewedBundleArtifact.path))
    throw Error('LOW_CURRENT_POSTS_ROOT_REVIEWED_REAL_BUNDLE_ARTIFACT_REQUIRED');
  const ids=[...lowCurrentIdcPostResourceIdsR24(),...lowCurrentCopperCertifierProStockResourceIdsR24()];
  if(new Set(ids).size!==ids.length||host.binding.rowId!==ids[0]
    ||JSON.stringify([...(host.binding.additionalRowIds??[])].sort())!==JSON.stringify(ids.slice(1).sort()))
    throw Error('LOW_CURRENT_POSTS_EXACT_FIFTEEN_DISJOINT_NEW_BINDINGS_REQUIRED');
  const requiredNames=['prepareLowCurrentScsPostsSingleSuccessorR24.ts','lowCurrentIdcWholeManualPostR24.ts',
    'lowCurrentCopperCertifierProStockR24.ts','low-current-idc-whole-manual-post-r24.json',
    'low-current-copper-certifier-pro-stock-r24.json','pro-tool-kits.html','d914-series-impact-tools.html','dsx602-datasheet.html'];
  if(requiredNames.some(name=>!input.newSourcePaths.some(path=>path.replace(/\\/g,'/').endsWith('/'+name))))
    throw Error('LOW_CURRENT_POSTS_COMPLETE_SEALED_SOURCE_CLOSURE_REQUIRED');
  const common={catalogId:host.catalogId,parent:base,expectedCapturedComputationSha256:input.expectedCapturedComputationSha256,sourceKey:host.sourceId};
  const idc=appendLowCurrentIdcWholeManualPostR24(common),pro=appendLowCurrentCopperCertifierProStockR24(common);
  for(const child of [idc,pro]){
    if(base.parameters.some((row,index)=>child.parameters[index]!==row)
      ||base.formulas.some((row,index)=>child.formulas[index]!==row)
      ||base.resources.some((row,index)=>child.resources[index]!==row))
      throw Error('LOW_CURRENT_POSTS_NATIVE_CAPTURE_PREFIX_MUST_BE_SAME_OBJECTS');
  }
  const newParameters=[...idc.parameters.slice(base.parameters.length),...pro.parameters.slice(base.parameters.length)];
  const parameters=[...base.parameters,...newParameters.map((row,index)=>({...row,ordinal:base.parameters.length+index}))];
  const formulas=[...base.formulas,...idc.formulas.slice(base.formulas.length),...pro.formulas.slice(base.formulas.length)];
  const newResources=[...idc.resources.slice(base.resources.length),...pro.resources.slice(base.resources.length)];
  if(JSON.stringify(newResources.map(row=>row.row_id))!==JSON.stringify(ids))throw Error('LOW_CURRENT_POSTS_EXACT_COMPONENT_RESOURCE_MAP_REQUIRED');
  const resources=[...base.resources,...newResources.map((row,index)=>{
    const{row_sha256:_old,...body}=row;
    const ordered={...body,ordinal:base.resources.length+index};
    return{...ordered,row_sha256:estimateDeterministicHash(ordered)};
  })];
  for(const [kind,values] of [['parameter',parameters.map(row=>row.parameter_id)],['formula',formulas.map(row=>row.formula_id)],['resource',resources.map(row=>row.row_id)]] as const)
    if(new Set(values).size!==values.length)throw Error('LOW_CURRENT_POSTS_DUPLICATE_'+kind.toUpperCase());
  const parameterIds=new Set(parameters.map(row=>row.parameter_id));
  for(const formula of formulas.slice(base.formulas.length))for(const id of formula.input_parameter_ids)
    if(!parameterIds.has(id))throw Error('LOW_CURRENT_POSTS_UNDECLARED_NEW_FORMULA_PARAMETER:'+id);
  for(const row of newResources){
    if(!row.inclusion_ast)throw Error('LOW_CURRENT_POSTS_NEW_ROW_CONDITION_REQUIRED');
    resolveInclusionGraph(row.inclusion_ast,{});
    for(const id of canonicalConditionParameterIds(row.inclusion_ast))
      if(!parameterIds.has(id))throw Error('LOW_CURRENT_POSTS_UNDECLARED_NEW_CONDITION_PARAMETER:'+id);
  }
  if(newResources.filter(canonicalEstimateResourceIncludedByDefault).map(row=>row.row_id).join('|')!==ids[0])
    throw Error('LOW_CURRENT_POSTS_ONE_NEW_MANUAL_PROVISION_OWNER_NO_PRO_PAID_OWNER');
  return{...base,parameters,formulas,resources};
}

export function lowCurrentScsPostsSingleSuccessorConfigR24(input:LowCurrentScsPostsCompositionInputR24):MasterSingleDefinitionSuccessorConfig{
  const host=input.hostConfig;
  const{parameters,formulas,resources}=lowCurrentScsPostsSingleSuccessorDefinitionR24(input);
  const ids=[...lowCurrentIdcPostResourceIdsR24(),...lowCurrentCopperCertifierProStockResourceIdsR24()];
  return{...host,sourcePaths:[...new Set([...host.sourcePaths,...input.newSourcePaths])],
    parameterDefinitions:parameters.map(row=>({...row})),formulaDefinitions:formulas.map(row=>({...row})),resourceDefinitions:resources.map(row=>({...row})),
    verifyCore:input.verifyWholePostCore,
    shortInput:{...host.shortInput,[idcPack.profileId]:idcPack.notSelected,[proPack.profileId]:proPack.notSelected},
    acceptanceInput:{...host.acceptanceInput,[idcPack.profileId]:idcPack.profiles[0]!.titleRu,[idcPack.frontCountId]:2,
      [proPack.profileId]:proPack.selectedProfile,[proPack.frontCountId]:1},
    locator:{...host.locator,payload:{...host.locator.payload,scsPhysicalPostsR24:{
      sourceKind:'MANUFACTURER_DECLARED_TWO_COMPATIBLE_PHYSICAL_POST_INVENTORIES_NOT_INSTALLATION_RATE',
      idc:{primary:idcPack.source,parts:idcPack.parts},certification:{primary:proPack.primary,parts:proPack.parts},
      newRowIds:ids,actualCalibrationAccepted:false,serverApprovalClaimed:false,wholeSCSInstallationComplete:false}}},
    passport:{...host.passport,includedScopeRu:[...host.passport.includedScopeRu,idcPack.scopeRu,proPack.scopeRu],
      excludedScopeRu:[...host.passport.excludedScopeRu,...idcPack.notCoveredRu,...proPack.openObjectFacts],
      independentCompletenessMap:{...host.passport.independentCompletenessMap,scsPhysicalPostsR24:{
        idcPartCount:5,proNamedPositions:9,proPhysicalPiecesPerPair:11,proDocumentsPerPair:1,newBindings:ids,
        manualProvisionPaidOwnerId:ids[0],oldCertificationHourOwnerId:proPack.existingMachineHourOwnerRowId,
        proNewPaidOwnerCount:0,nativeRowsAndSourceBindingsUnchanged:true,priceCoverage:'ROOT_OWNER_REVIEW_HOLD'}}},
    applicability:{...host.applicability,scsPhysicalPostsR24:{sourceIdentityAdmittedByConstructor:false,
      declaredInventoryScopeOnly:true,actualStockOrCalibrationConfirmed:false,unknownNeedsAutoClosed:false,
      priceCoverage:'ROOT_OWNER_REVIEW_HOLD',newPublicCards:0,FULL:false}},
  };
}
