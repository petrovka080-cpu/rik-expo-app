import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readFrozenDefinitionSnapshotV1} from '../../../src/lib/estimate/backendPlatform/canonicalFrozenDefinitionSnapshotV1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalEstimateStableJson as stable} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {CanonicalEstimateFormulaDefinition,CanonicalEstimateResourceDefinition} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {buildRoofParapet004TechnicalWholeR294,roofParapet004TechnicalIdsR294 as ids} from './roofParapet004TechnicalWholeModelR294';
import {buildMasterSingleDefinitionGeneratedRegistryRowsR1,resolveMasterSingleDefinitionLocatorExcerptSha256R1,validateIndependentCompletenessMapReferences,
 type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1,type MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';

type Json=Record<string,unknown>;type Pin=Readonly<{path:string;sha256:string}>;
const object=(x:unknown):x is Json=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const strings=(x:unknown):x is string[]=>Array.isArray(x)&&x.every(a=>typeof a==='string');
const byteHash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export type RoofParapet004TechnicalPreparationR294=Readonly<{
 sourceRoot:string;currentFullParent:Pin;
 host:Pick<Config,'expectedBranch'|'masterPath'|'masterSha256'|'parentReleaseId'|'parentSearchReleaseId'|'currentReleasePath'|'outputRoot'|'benchmarkOrdinal'>;
 source:Readonly<{sourceKey:string;sourceMetadata:Config['sourceMetadata'];locator:Config['locator']}>;
 sourcePaths:readonly string[];verifyCore:Config['verifyCore'];verifyTargetPrecondition:NonNullable<Config['verifyTargetPrecondition']>;
}>;
function native(input:RoofParapet004TechnicalPreparationR294){assert.equal(input.currentFullParent.sha256,'a2926d0b7985bcb13cc2fe9a8e1e57fcbe58a0440b08abc62e9f7589e3f39628');
 const bytes=fs.readFileSync(input.currentFullParent.path);assert(bytes.length<=4*1024*1024);assert.equal(byteHash(bytes),input.currentFullParent.sha256);
 const raw:unknown=JSON.parse(bytes.toString('utf8'));assert(object(raw)&&object(raw.capture)&&object(raw.contentPassport)&&object(raw.publicIdentity)&&object(raw.membership));
 assert(raw.readOnly===true&&raw.sourceMetadataLosslessRoundtrip===true);assert.equal(raw.publicIdentity.catalog_id,'canonical-work:base:roofing_interior_parapet_seal_technical_room');
 const [m]=readFrozenDefinitionSnapshotV1({models:[{...raw.capture,passport:raw.contentPassport}]},'models').models;assert(m);
 const parameters:AutomaticOwnerDefinition['parameters']=m.parameters.map(row=>{assert(typeof row.parameter_id==='string'&&typeof row.value_type==='string'&&typeof row.required==='boolean');assert(typeof row.ordinal==='number'&&typeof row.title_ru==='string'&&typeof row.unit_id==='string');
  assert(object(row.truth_metadata)&&object(row.constraints_json));return{...row,parameter_id:row.parameter_id,value_type:row.value_type,required:row.required,ordinal:row.ordinal,title_ru:row.title_ru,unit_id:row.unit_id,truth_metadata:row.truth_metadata,constraints_json:row.constraints_json};});
 const formulas:CanonicalEstimateFormulaDefinition[]=m.formulas.map(row=>{assert(typeof row.formula_id==='string');assert(typeof row.expression_source==='string'&&typeof row.output_unit_id==='string'&&typeof row.ast_sha256==='string'&&strings(row.input_parameter_ids));
  const parsed=compileFormulaGraph(row.expression_source);assert.deepEqual(parsed.ast,row.ast);assert.deepEqual(parsed.inputParameterIds,row.input_parameter_ids);
  return{...row,formula_id:row.formula_id,expression_source:row.expression_source,output_unit_id:row.output_unit_id,ast_sha256:row.ast_sha256,input_parameter_ids:row.input_parameter_ids,ast:parsed.ast};});
 const resources:CanonicalEstimateResourceDefinition[]=m.resources.map(row=>{assert(typeof row.row_id==='string'&&typeof row.formula_id==='string'&&typeof row.unit_id==='string');assert(typeof row.id==='string'&&typeof row.ordinal==='number'&&typeof row.section==='string'&&typeof row.category==='string'&&typeof row.title_ru==='string'&&typeof row.row_sha256==='string');
  assert(object(row.resource_graph)&&object(row.inclusion_ast)&&typeof row.procurement_eligible==='boolean');assert(row.cost_owner_id===null||typeof row.cost_owner_id==='string');assert(row.source_metadata===null||object(row.source_metadata));
  return{...row,id:row.id,row_id:row.row_id,formula_id:row.formula_id,unit_id:row.unit_id,ordinal:row.ordinal,section:row.section,category:row.category,title_ru:row.title_ru,row_sha256:row.row_sha256,resource_graph:row.resource_graph,
   inclusion_ast:row.inclusion_ast,procurement_eligible:row.procurement_eligible,cost_owner_id:row.cost_owner_id,source_metadata:row.source_metadata};});
 assert(Array.isArray(raw.capture.normativeSources)&&raw.capture.normativeSources.length===0&&Array.isArray(raw.capture.normativeLocators)&&raw.capture.normativeLocators.length===0);
 const capture:MasterRetainedParentCaptureR1={...raw.capture,definition:m.definition,baseline:m.baseline,parameters,formulas,resources,bindings:m.bindings,normativeSources:[],normativeLocators:[]};
 assert.equal(stable(capture),stable(raw.capture),'ALL_CURRENT_NATIVE_FIELDS_EXACT');assert.equal(parameters[0]?.unit_id,'m2');assert.equal(parameters[0]?.default_value,100,'LEGACY_DEFAULT_PRESERVED_NOT_NEW_MEASURE');
 const base:AutomaticOwnerDefinition={parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]};return{capture,base};
}
/** Phase1 is pure proposed publisher input. No capture/makeCapture/SQL or
 * actual absence/approval claim; the ROOT chooses the exact subject tuple. */
export function prepareRoofParapet004TechnicalCaptureInputR294(input:RoofParapet004TechnicalPreparationR294){
 assert(path.isAbsolute(input.sourceRoot)&&path.resolve(input.sourceRoot)===path.resolve(__dirname,'../../..'),'ONE_OWN_ROOT');
 assert(input.source.sourceKey.trim(),'ROOT_SELECTED004_SUBJECT_REQUIRED');assert.equal(input.source.sourceMetadata.artifact_sha256,'114a0db0688f339f7064c616bf80785ab5245f4eaccbbe049e32c46c6942cfa8');
 assert.deepEqual(input.source.locator.payload.exactColumns,['12-01-004-02','12-01-004-03'],'EXACT_TWO_NATIVE_COLUMNS_ONLY');
 const {capture,base}=native(input),model=buildRoofParapet004TechnicalWholeR294({capture,native:base,sourceKey:input.source.sourceKey});
 const old=new Set(capture.parameters.map(p=>p.parameter_id));const sources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(model.parameters.filter(p=>!old.has(p.parameter_id)).map(p=>[
  p.parameter_id,p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[input.source.sourceKey]}]));
 const retain:MasterRetainParentBindingsR1={capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:sources,
  legacyTemplateAssumptionSources:model.legacyDeclaration,capturedSourcePreimage:{sourceKey:input.source.sourceKey,expected:null}};
 const ownPaths=[...new Set([...input.sourcePaths,input.currentFullParent.path,
  'scripts/estimate/r4a13/roofParapet004TechnicalWholeModelR294.ts','scripts/estimate/r4a13/prepareRoofParapet004TechnicalWholeR294.ts',
  'data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-native00402-r24.json','data/estimate-benchmarks/source-packs/roof-wall-parapet-two-aprons-native00403-r24.json',
  'data/estimate-benchmarks/source-packs/roof-wall-parapet-apron-existing-owner-map00402-r24.json','data/estimate-benchmarks/source-packs/roof-wall0040203-independent-whole-map-r24.json'])].map(p=>path.isAbsolute(p)?p:path.resolve(input.sourceRoot,p));
 for(const p of ownPaths){assert(fs.existsSync(p),'EXPLICIT_SOURCE_PATH_MISSING:'+p);}
 const first=model.sourceRowIds[0];assert(first);
 const config:Config={...input.host,contract:model.contract,stopCode:'ROOF_TECHNICAL_PARAPET004_R294',applicationName:'roof-technical-parapet004-whole',sourcePaths:ownPaths,
  catalogId:capture.definition.catalog_id,sourceId:input.source.sourceKey,normId:model.sourceColumns.join('/'),sourceMetadata:input.source.sourceMetadata,locator:input.source.locator,
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,applicability:model.applicability,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},shortInput:{[ids.method]:ids.one,[ids.length]:'125',[ids.height]:'900'},acceptanceInput:{[ids.method]:ids.two,[ids.length]:'37.5',[ids.height]:'900'},
  verifyCore:input.verifyCore,verifyTargetPrecondition:input.verifyTargetPrecondition,expectedParentShape:[1,59,59],validationScenario:'TECHNICAL_PARAPET_TWO_OWN004_METHODS_NOT_FAMILY539',
  passport:{canonicalRuName:'Герметизация примыкания кровли к парапету в техническом помещении',workKey:'roofing_interior_parapet_seal_technical_room',
   physicalResultRu:'Целое примыкание высотой более600мм с одним либо двумя фартуками по своим точным колонкам.',includedScopeRu:['Три операции00402/03;собственные15nativeстрок каждого метода;один общий22UNKNOWNпост.'],
   excludedScopeRu:['Профили standard/wet/010cap;неизвестныеstock/price/снабжение/монтажныеусловия не становятся подтверждёнными.'],
   independentCompletenessMap:model.independentCompletenessMap,unresolvedApplicableResourceRowIds:[...model.sourceRowIds,...model.postRowIds]},
  binding:{rowId:first,additionalRowIds:model.sourceRowIds.slice(1),applicability:{exactColumns:model.sourceColumns,oldQNotNewGeometry:true,sourceApproval:false},
   applicabilityByRowId:Object.fromEntries(model.sourceRowIds.map(row=>[row,{sourceArtifactSha256:input.source.sourceMetadata.artifact_sha256,
    exactColumns:[row.startsWith('roof_wall_junction00402_r24:')?'12-01-004-02':'12-01-004-03'],sourceBasisQuantity:'100',sourceBasisUnitId:'linear_m',actualProjectApproval:false}])),retainParentBindings:retain},
  search:{primaryUom:'linear_m',canonicalNameRu:'Герметизация примыкания кровли к парапету',aliases:['кровельное примыкание к парапету'],shortScopeRu:'Более600мм;один или два фартука;собственная длина.',
   keyDistinguishingParameters:[ids.method,ids.length,ids.height],clarificationFields:[ids.method,ids.length,ids.height],includedBoundaries:['Только технический existingprofile.'],
   excludedBoundaries:['Прежний q:m2 только legacy;новыйобмер невыводитсяизq100.'],extraSearchTermsRu:'примыкание парапет фартук длина',sourceProvenance:{artifactSha256:input.source.sourceMetadata.artifact_sha256,activationAllowed:false}}};
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:model.independentCompletenessMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
 const generated=buildMasterSingleDefinitionGeneratedRegistryRowsR1({config,resolvedSourceMetadata:config.sourceMetadata,
  resolvedLocators:[{key:config.locator.key,payload:config.locator.payload,excerptSha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}],projectSourcePackage:null,projectSourcePackageSet:null});
 const captureInput:MasterScopedNormativeRegistryInputR1={config:{stopCode:config.stopCode,normId:config.normId,
  binding:{retainParentBindings:{capturedSourcePreimage:retain.capturedSourcePreimage}}},...generated};
 return{status:'PROPOSED_ROWS_NOT_ACTUAL_DB',config,model,native:base,captureInput,sourceAdmission:false,FULL:false};
}
/** Phase2 requires the ORIGINAL genuine formal object from the existing
 * capture arm. Shape/hash/closure/absence/caps remain in the shared owner. */
export function prepareRoofParapet004TechnicalWholeR294(input:RoofParapet004TechnicalPreparationR294,actual:MasterCapturedScopedNormativeRegistryR1):Config{
 const prepared=prepareRoofParapet004TechnicalCaptureInputR294(input),config:Config={...prepared.config,capturedScopedNormativeRegistry:actual};
 assert(resolveMasterScopedNormativeRegistryOptInR1({...prepared.captureInput,config}),'GENUINE_EXACT004_FORMAL_CAPTURE_REQUIRED');return config;
}
