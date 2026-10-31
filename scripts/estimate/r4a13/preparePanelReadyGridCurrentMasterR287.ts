import {appendLightingOwnedWholeToolPostR1,lightingOwnedWholePostR1} from '../../../src/lib/estimate/backendPlatform/lightingOwnedWholeToolPostR1';
import ownedToolPack from '../../../data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json';
import mountingPrimaryR331 from '../../../data/estimate-benchmarks/source-packs/panel-ready-grid-secondary-mounting-primary-r331.json';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import fixture from '../../../data/estimate-benchmarks/fixtures/panel-ready-grid-whole-post-independent-r287.json';
import {panelReadyGridWholePackR287 as pack,panelReadyGridWholePostR287} from './ownedDomain/panelReadyGridWholePostR287';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {master30CapturedParentR1} from '../../../src/lib/estimate/v4/master30ElectricalPlumbingFactoryKitsR1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {panelReadyGridCompletenessR287,verifyPanelReadyGridPureR287,verifyPanelReadyGridWholePostR287,type PanelReadyGridVerificationR287} from './verifyPanelReadyGridWholePostR287';
const contract='gox.electrical.technical-room.ready-grid-current-master/r287',locatorKey='exact-ready-grid-project-whole-post-r287';
const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json',pointerSha='9b6322feb70e38191e7fe171d82dadebfe47816890d4c339f890477ebc83a258';
export type PanelReadyGridCurrentContextR287=Readonly<{sourceRoot:string;mountingPrimaryAddendumR331?:true;ownedWholeToolInventoryR1?:true;currentFullParent:Readonly<{path:string;sha256:string}>;
  outputRoot?:string;onCoreCall?:PanelReadyGridVerificationR287['onCoreCall'];onOutcome?:PanelReadyGridVerificationR287['onOutcome']}>;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function requiredRecord(value:unknown,label:string){assert(record(value),label);return value;}
function strings(value:unknown):value is string[]{return Array.isArray(value)&&value.every(v=>typeof v==='string');}
type Parameter=AutomaticOwnerDefinition['parameters'][number];type Formula=AutomaticOwnerDefinition['formulas'][number];type Resource=AutomaticOwnerDefinition['resources'][number];
type Capture=MasterRetainedParentCaptureR1&Readonly<{parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources']}>;
function parameter(value:unknown):value is Parameter{return record(value)&&typeof value.parameter_id==='string'&&typeof value.value_type==='string'
  &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&typeof value.title_ru==='string'&&(value.unit_id===null||typeof value.unit_id==='string')
  &&typeof value.required==='boolean'&&Object.hasOwn(value,'default_value')&&(value.constraints_json===null||record(value.constraints_json))&&record(value.truth_metadata);}
function formula(value:unknown):value is Formula{if(!record(value)||typeof value.formula_id!=='string'||typeof value.expression_source!=='string'
  ||typeof value.output_unit_id!=='string'||!strings(value.input_parameter_ids)||typeof value.ast_sha256!=='string')return false;
  try{assert.deepEqual(value.ast,compileFormulaGraph(value.expression_source).ast);return true;}catch{return false;}}
function resource(value:unknown):value is Resource{return record(value)&&['id','row_id','section','category','title_ru','unit_id','formula_id','row_sha256'].every(key=>typeof value[key]==='string')
  &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&record(value.inclusion_ast)&&record(value.resource_graph)&&typeof value.procurement_eligible==='boolean'
  &&(value.cost_owner_id===null||typeof value.cost_owner_id==='string')&&(value.source_metadata===null||record(value.source_metadata));}
function rows<T>(value:unknown,check:(row:unknown)=>row is T,label:string):T[]{assert(Array.isArray(value),label);const output:T[]=[];for(const row of value){assert(check(row),label);output.push(row);}return output;}
function captureOf(value:unknown):Capture{const c=requiredRecord(value,'FULL_CAPTURE_REQUIRED');return{...c,definition:requiredRecord(c.definition,'FULL_DEFINITION_REQUIRED'),
  baseline:requiredRecord(c.baseline,'FULL_BASELINE_REQUIRED'),parameters:rows(c.parameters,parameter,'ACTUAL_PARAMETER_TYPE'),formulas:rows(c.formulas,formula,'ACTUAL_FORMULA_TYPE'),
  resources:rows(c.resources,resource,'ACTUAL_RESOURCE_TYPE'),bindings:rows(c.bindings,record,'ACTUAL_BINDINGS'),normativeSources:rows(c.normativeSources,record,'ACTUAL_SOURCES'),normativeLocators:rows(c.normativeLocators,record,'ACTUAL_LOCATORS')};}
/** Same observed current technical-room owner. No catalog append or source-absence
 * fiction; publication remains held until source/PPR/price-scope admission. */
export function preparePanelReadyGridCurrentMasterR287(context:PanelReadyGridCurrentContextR287):Config{
  assert(isAbsolute(context.sourceRoot),'EXPLICIT_SOURCE_ROOT_REQUIRED');
  const own=(path:string)=>{assert(!isAbsolute(path),'LOGICAL_PATH_REQUIRED');const absolute=resolve(context.sourceRoot,path),rel=relative(context.sourceRoot,absolute);
    assert(rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel),'SOURCE_PATH_ESCAPE');return absolute;};
  const read=(path:string,expected:string)=>{const bytes=readFileSync(isAbsolute(path)?path:own(path));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'EXACT_BYTES:'+path);return bytes;};
  assert.equal(context.currentFullParent.sha256,pack.actualParent.fullCaptureSha256);assert(isAbsolute(context.currentFullParent.path));
  const full=requiredRecord(JSON.parse(read(context.currentFullParent.path,pack.actualParent.fullCaptureSha256).toString('utf8')),'ACTUAL_FULL_PARENT');
  assert.equal(full.readOnly,true);const c=captureOf(full.capture),identity=requiredRecord(full.publicIdentity,'ACTUAL_PUBLIC_IDENTITY'),membership=requiredRecord(full.membership,'ACTUAL_SELECTED_MEMBERSHIP');
  assert.equal(identity.catalog_id,pack.catalogId);assert.equal(identity.work_key,pack.workKey);assert.equal(c.definition.catalog_id,pack.catalogId);
  assert.equal(c.definition.id,pack.actualParent.definitionId);assert.equal(c.definition.definition_version,5);assert.equal(c.definition.definition_sha256,pack.actualParent.definitionSha256);
  assert.equal(c.baseline.id,pack.actualParent.baselineId);assert.equal(c.baseline.definition_version_id,c.definition.id);assert.equal(c.baseline.catalog_id,pack.catalogId);
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length],[30,112,112,25,2,2]);
  const pointer=requiredRecord(JSON.parse(read(pointerPath,pointerSha).toString('utf8')),'PINNED_CURRENT_POINTER');assert(typeof pointer.definitionReleaseId==='string');assert(typeof pointer.searchReleaseId==='string');
  assert.equal(membership.release_id,pointer.definitionReleaseId);assert.equal(membership.definition_version_id,c.definition.id);
  assert.deepEqual(c.normativeSources.map(source=>source.source_key).sort(),[...pack.heldSourceKeys].sort());
  const resourceIds=new Set(c.resources.map(row=>row.id)),sourceIds=new Set(c.normativeSources.map(source=>source.id)),locatorIds=new Set(c.normativeLocators.map(locator=>locator.id));
  for(const locator of c.normativeLocators)assert(sourceIds.has(locator.source_id),'RETAINED_SOURCE_CLOSURE');
  for(const binding of c.bindings){assert(resourceIds.has(binding.resource_spec_id),'RETAINED_RESOURCE_FK');assert(locatorIds.has(binding.locator_id),'RETAINED_LOCATOR_FK');}
  const parent:AutomaticOwnerDefinition={parameters:c.parameters,formulas:c.formulas,resources:c.resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
  const model=panelReadyGridWholePostR287(parent);verifyPanelReadyGridPureR287(parent,model);
  const metadata=requiredRecord(c.definition.source_metadata,'CURRENT_SOURCE_METADATA');assert(typeof metadata.templateId==='string');
  assert(record(metadata.retainedParentBindingSuccessorV1)&&record(metadata.retainedParentBindingContinuationV1),'ACTUAL_MASTER30_32_PREFIX_HISTORY_REQUIRED');
  const baselineSources=requiredRecord(c.baseline.normative_source_ids,'RETAINED_BASELINE_SOURCES'),qSources=baselineSources.q;assert(strings(qSources));
  const original=captureOf(master30CapturedParentR1(pack.catalogId)),capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256,
    legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:metadata.templateId,parameterSources:{q:qSources},
      approvedTemplatePredecessor:{capturedParent:original,capturedParentSha256:masterRetainedParentCaptureSha256R1(original)}},
    newParameterSources:Object.fromEntries(model.parameters.slice(30).map(parameter=>[parameter.parameter_id,{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}])),
    successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),capturedSourceMetadataSha256:valueSha(metadata),
      capturedPreviousSuccessorSha256:valueSha(metadata.retainedParentBindingContinuationV1.successor)}};
  const sourcePaths=['scripts/estimate/r4a13/preparePanelReadyGridCurrentMasterR287.ts','scripts/estimate/r4a13/verifyPanelReadyGridWholePostR287.ts',
    'scripts/estimate/r4a13/ownedDomain/panelReadyGridWholePostR287.ts','data/estimate-benchmarks/source-packs/panel-ready-grid-whole-post-project-r287.json',
    'data/estimate-benchmarks/fixtures/panel-ready-grid-whole-post-independent-r287.json','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
    'src/lib/estimate/v4/master30ElectricalPlumbingFactoryKitsR1.ts','src/lib/estimate/v4/master32PanelToolProvisionR1.ts',
    'data/estimate-benchmarks/fixtures/master30-electrical-plumbing-five-current-r1.json','data/estimate-benchmarks/fixtures/master32-panel-current-two-v4-r1.json',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    ...pack.sourcePackRefs.map(ref=>ref.logicalPath),pack.primary.localArtifact];
  for(const ref of pack.sourcePackRefs)read(ref.logicalPath,ref.sha256);read(pack.primary.localArtifact,pack.primary.sha256);for(const path of sourcePaths)readFileSync(own(path));
  const map=panelReadyGridCompletenessR287(),bound=model.resources.slice(112).map(row=>row.row_id),allOpenNeeds=['master30:electrical:open:tool-27','master30:electrical:open:tool-55',...fixture.conditionalOldNeedReplacements,...fixture.protectedOldNeedIds];
  const rowApplicability=Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,rowId,projectAuthenticated:false,sourceNormHoursAuthored:false,sourceConnectorCountAuthored:false,
    retainedFactoryOwner:pack.retainedFactory.ownerRowId,retainedPaidToolProvisionOwner:pack.retainedToolPost.ownerRowId,priceNonoverlapAuthenticated:false,fullTechnicalAcceptance:false}]));
  const cfg:Config={contract,stopCode:'PANEL_READY_GRID_CURRENT_R287',applicationName:'panel-ready-grid-project-whole-post-r287',expectedBranch:'codex/r4-a5-clean-08b18902',
    masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',
    parentReleaseId:pointer.definitionReleaseId,parentSearchReleaseId:pointer.searchReleaseId,currentReleasePath:pointerPath,outputRoot:context.outputRoot??'.release-runtime/panel-ready-grid-whole-post-r287',
    sourcePaths:[...new Set(sourcePaths)],catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
    sourceMetadata:{source_title:'Точный готовый панельный узел и фактический проектный монтажный пост',source_authority:'Удержанный точный заводской метод; реальные труд, проверки и услуги только из ППР/фактических ведомостей',
      exact_locator:pack.primary.locatorRu,use_restriction:pack.scopeRu,source_kind:'EXACT_FACTORY_METHOD_WITH_EXPLICIT_PROJECT_FACTS_NOT_LABOUR_CONSUMPTION_NORM',official_url:pack.primary.officialUrl,artifact_sha256:pack.primary.sha256},
    parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,shortInput:structuredClone(c.baseline.input_values),acceptanceInput:fixture.independentTestInputs,
    expectedParentShape:[30,112,112],benchmarkOrdinal:287,validationScenario:'TEST_ONLY same current v5 with exact Master30/32 preservation, actual PPR quantities and unpaid included operations; 17 protected needs remain',
    passport:{canonicalRuName:'Монтаж внутреннего освещения',workKey:pack.workKey,physicalResultRu:'Установленный, подключённый и проверенный светильник в принятой решётке при подтверждённом ППР',
      includedScopeRu:[pack.scopeRu],excludedScopeRu:['Новая линия, коробки и соединители по неподтверждённой ведомости','Доступ, СИЗ, производительность и неизвестный состав цены','Другие условия и модели панели'],
      independentCompletenessMap:map,unresolvedApplicableResourceRowIds:allOpenNeeds},
    applicability:{contract,scope:pack.scopeRu,actualCurrentDefinitionId:c.definition.id,sourceQualification:'ROOT_REVIEW_HOLD',projectAuthenticated:false,priceNonoverlapAuthenticated:false,full:false},
    binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),retainParentBindings:retained,applicability:{contract,full:false},applicabilityByRowId:rowApplicability},
    locator:{key:locatorKey,payload:{contract,sourcePack:pack,sourcePackSha256:createHash('sha256').update(readFileSync(own('data/estimate-benchmarks/source-packs/panel-ready-grid-whole-post-project-r287.json'))).digest('hex'),
      independentCompletenessMap:map,sourceNormHoursAuthored:false,projectAuthenticated:false,sourcePreimage:'UNKNOWN_NOT_READ_FOR_NEW_KEY',full:false}},
    search:{primaryUom:'pcs',canonicalNameRu:'Монтаж внутреннего освещения',aliases:['Установка светильников'],shortScopeRu:pack.scopeRu,
      keyDistinguishingParameters:[pack.retainedFactory.selectorId,pack.retainedToolPost.methodId,pack.fields.method],clarificationFields:[pack.countParameterId,...Object.values(pack.fields)],
      includedBoundaries:[pack.scopeRu],excludedBoundaries:['Без переноса на иной корпус, потолок, сечение или проект','Без повторного заказа заводской панели или оснащения поста'],extraSearchTermsRu:'панель решётка монтаж подключение защитный проводник проверка фактический труд ППР',
      sourceProvenance:{contract,actualParentDefinitionId:c.definition.id,currentFullReadSha256:pack.actualParent.fullCaptureSha256,sourceAuthority:false,projectAuthenticated:false}},
    forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_SAME_TECHNICAL_ROOM_OWNER',receiptFileStem:'panel_ready_grid_whole_post',
    verifyTargetPrecondition:async()=>{throw Error(pack.publicTargetGuard);},
    verifyCore:async()=>{
      verifyPanelReadyGridPureR287(parent,model);const sourceId='TEST_ONLY_PANEL_PROJECT_SOURCE',locatorId='TEST_ONLY_PANEL_PROJECT_LOCATOR';
      const fingerprint=valueSha({contract,currentFullReadSha256:pack.actualParent.fullCaptureSha256,capturedParentSha256,
        sourceHashes:cfg.sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(own(path))).digest('hex')}))});
      const m=cfg.sourceMetadata,projection=prepareMasterRetainedBindingRepresentativeR1({config:cfg,newSource:{id:sourceId,source_key:cfg.sourceId,title_ru:m.source_title,authority:m.source_authority,
        official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:null,effective_to:null,metadata:{contract,sourceKind:m.source_kind,projectAuthenticated:false,universalNormHoursAuthored:false}},
        newLocators:[{id:locatorId,source_id:sourceId,locator_key:cfg.locator.key,locator:cfg.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}]},
        {parameters:model.parameters,formulas:model.formulas.map(formula=>c.formulas.some(old=>old.formula_id===formula.formula_id)?formula:{...formula,ast_sha256:valueSha(formula.ast)}),
          resources:buildMasterPublicationResourceRowsR1(model.resources),newBindings:bound.map(row_id=>({row_id,locator_id:locatorId,applicability:rowApplicability[row_id]})),
          successorProvenance:{contract,sourceId:cfg.sourceId,normId:cfg.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256,sourceFingerprint:fingerprint,currentFullReadSha256:pack.actualParent.fullCaptureSha256},
          lifecycleMetadata:{contract,masterSha256:cfg.masterSha256,sourceFingerprint:fingerprint}});
      assert.equal(projection.expectedNormativeBindingCount,34);for(const[id,sources]of Object.entries(baselineSources))assert.deepEqual(projection.normativeSourceIds[id],sources,'ALL_30_RETAINED_BASELINE_SOURCE_ARRAYS');
      context.onOutcome?.('ordinary-retained-source-and-composition-guard',{status:'PASS_TEST_ONLY_PROJECTION_NOT_PREFLIGHT',bindings:34,oldBindings:25,newBindings:9,currentVersion:5,full:false});
      return verifyPanelReadyGridWholePostR287({parent,model,onCoreCall:context.onCoreCall,onOutcome:context.onOutcome});
    }};const withMounting=context.mountingPrimaryAddendumR331===true?withPanelMountingPrimaryR331(cfg,read):cfg;return context.ownedWholeToolInventoryR1===true?withPanelOwnedWholeInventoryR1(withMounting):withMounting;
}


export type PanelReadyGridSubmittedSourceOptionsR1=Readonly<{
  enableSourceOnlyCalculation?:true;
  includeMountingPrimaryAddendumR331?:true;
  includeOwnedWholeToolInventoryR1?:true;
  rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];
  priceItems?:CanonicalEstimateCompileCoreInput['priceItems'];
}>;

/** Actual submitted-input preview of this same existing backend Config. This
 * performs no publish/save/source assignment and never treats HTTP fields as
 * authenticated project, source, PPR, safety or price-coverage evidence. The
 * existing unconditional writer hold remains in cfg.verifyTargetPrecondition.
 * The historical verifyCore/finite13 entry is not invoked by this caller. */
export async function compilePanelReadyGridCurrentSubmittedR1(submittedParameters:Record<string,unknown>,
  context:PanelReadyGridCurrentContextR287,options:PanelReadyGridSubmittedSourceOptionsR1={}){
  if(options.enableSourceOnlyCalculation!==true)throw Error('PANEL_CURRENT_SUBMITTED_SOURCE_ONLY_OPT_IN_REQUIRED');
  // Existing real V5 identity, pointer, parent, source/locator/binding closure,
  // selected source artifact bytes and legacy model invariants run unchanged.
  if(options.includeMountingPrimaryAddendumR331===true&&submittedParameters[pack.retainedFactory.selectorId]!==pack.retainedFactory.choiceRu)
    throw Error('PANEL_MOUNTING_ADDENDUM_EXACT_READY_GRID_FACTORY_PROFILE_REQUIRED');
  if(options.includeOwnedWholeToolInventoryR1===true&&(submittedParameters[pack.retainedFactory.selectorId]!==pack.retainedFactory.choiceRu
    ||submittedParameters[pack.retainedToolPost.methodId]!==pack.retainedToolPost.methodRu||submittedParameters[pack.retainedToolPost.fitId]!==pack.retainedToolPost.fitRu))
    throw Error('PANEL_OWNED_WHOLE_POST_EXACT_EXISTING_FACTORY_METHOD_AND_FIT_REQUIRED');
  const cfg=preparePanelReadyGridCurrentMasterR287({...context,mountingPrimaryAddendumR331:options.includeMountingPrimaryAddendumR331,ownedWholeToolInventoryR1:options.includeOwnedWholeToolInventoryR1});
  const parameters=rows(cfg.parameterDefinitions,parameter,'PANEL_SUBMITTED_PARAMETERS');
  const formulas=rows(cfg.formulaDefinitions,formula,'PANEL_SUBMITTED_FORMULAS');
  const resources=rows(cfg.resourceDefinitions,resource,'PANEL_SUBMITTED_RESOURCES');
  const result=await compileCanonicalEstimateCore({operation:options.rowOverrides?'recalculate':'compile',
    catalogId:cfg.catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:submittedParameters[pack.retainedFactory.selectorId]===pack.retainedFactory.choiceRu?pack.countParameterId:'q',
    parameterDefinitions:parameters,formulaDefinitions:formulas,resourceDefinitions:resources,
    submittedParameters,confirmedParameters:{},currencyCode:'KGS',priceItems:options.priceItems??[],rowOverrides:options.rowOverrides,
    maximumResourceRows:resources.length,hashJson:async value=>estimateDeterministicHash(value)});
  return{contract:'electrical.current-panel.actual-submitted-source-only-preview/v1',result,
    sourceAuthorityPromoted:false,projectAuthenticated:false,priceNonoverlapAuthenticated:false,
    fullTechnicalAcceptance:false,publicationAllowed:false,savedHere:false,
    existingWriterHoldCode:pack.publicTargetGuard,
    retainedOwnerRowIds:[pack.retainedFactory.ownerRowId,pack.retainedToolPost.ownerRowId],
    protectedOldNeedIds:[...pack.protectedOldNeedIds],
    boundary:'Actual submitted values determine this preview; no fixture input, TEST_ONLY source/locator, source authority assignment or server fact confirmation is injected.'};
}


/** Supplementary primary reference only: same ordinary Config/source slot,
 * unchanged quantities, history, primary passport, price owners and writer hold. */
function withPanelMountingPrimaryR331(cfg:Config,read:(path:string,expected:string)=>Uint8Array):Config{
  assert.equal(cfg.catalogId,mountingPrimaryR331.catalogId,'PANEL_MOUNTING_SAME_EXISTING_OWNER');
  assert.equal(cfg.sourceId,pack.sourceId);assert.equal(cfg.normId,pack.normId);
  assert.equal(pack.primary.sha256,mountingPrimaryR331.mainPassportPreserved.sha256,'PANEL_PRIMARY_PASSPORT_NOT_REPLACED');
  read('data/estimate-benchmarks/source-packs/panel-ready-grid-secondary-mounting-primary-r331.json','be23e68ff52fb75cbbf97984d1b61fff23d0aa305f6c0bc61263345d42dad372');
  for(const artifact of mountingPrimaryR331.supportingArtifacts)read(artifact.logicalPath,artifact.sha256);
  return{...cfg,sourcePaths:[...new Set([...cfg.sourcePaths,'data/estimate-benchmarks/source-packs/panel-ready-grid-secondary-mounting-primary-r331.json',...mountingPrimaryR331.supportingArtifacts.map(a=>a.logicalPath)])],
    applicability:{...cfg.applicability,secondaryMountingPrimaryR331:{contract:mountingPrimaryR331.contract,
      scope:'SUPPORTING_RECESSED_FACTORY_METHOD_ONLY_NOT_ADMITTED_SOURCE_OR_OBJECT_CONTEXT',
      sourceAuthorityPromoted:false,projectAuthenticated:false,additionalMountingQuantity:null,protected17Closed:0}},
    locator:{...cfg.locator,payload:{...cfg.locator.payload,secondaryManufacturerMountingPrimaryR331:structuredClone(mountingPrimaryR331)}}};
}


/** Preview-only continuation of this existing Config. No registry/parent binding
 * is assigned to declared ownership. Historical finite13 is never used as a
 * proof of this opt-in branch; the unchanged publisher gate still refuses it. */
function withPanelOwnedWholeInventoryR1(cfg:Config):Config{
  const parameters=rows(cfg.parameterDefinitions,parameter,'PANEL_OWNED_PARAMETERS');
  const formulas=rows(cfg.formulaDefinitions,formula,'PANEL_OWNED_FORMULAS');
  const resources=rows(cfg.resourceDefinitions,resource,'PANEL_OWNED_RESOURCES');
  const model=appendLightingOwnedWholeToolPostR1({parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]});
  return{...cfg,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    sourcePaths:[...new Set([...cfg.sourcePaths,'src/lib/estimate/backendPlatform/lightingOwnedWholeToolPostR1.ts',
      'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts',
      'data/estimate-benchmarks/source-packs/master32-panel-tool-provision-r1.json',...ownedToolPack.sourceArtifacts.map(artifact=>artifact.path)])],
    applicability:{...cfg.applicability,ownedWholeToolInventoryR1:{contract:lightingOwnedWholePostR1.contract,
      inventoryAuthenticated:false,sourceAuthorityPromoted:false,publicationAllowed:false,full:false}},
    locator:{...cfg.locator,payload:{...cfg.locator.payload,ownedWholeToolInventoryR1:{contract:lightingOwnedWholePostR1.contract,
      countParameterId:lightingOwnedWholePostR1.countId,inventoryReferenceParameterId:lightingOwnedWholePostR1.scheduleId,
      capabilitySourceOnly:'master32_dvo6561_ready_grid_class_i_whole_tool_post_r1',newRegistryIds:0,toolTypes:21,physicalPiecesPerDeclaredWholeSet:31,
      unresolvedApplicationNeeds:lightingOwnedWholePostR1.openNeeds.map(n=>({key:n.key,parameterId:n.parameterId,
        rowId:lightingOwnedWholePostR1.prefix+':need:'+n.key,reasonRu:n.reasonRu})),
      renewalMetrologyAndAdditionalTestNormsAuthored:false,
      actualInventoryAuthenticated:false,sourceAuthorityPromoted:false,protected17Closed:0,full:false}}},
    verifyCore:async()=>{throw Error('PANEL_OWNED_WHOLE_POST_NEW_BOUND_CASES_REQUIRED_NOT_HISTORICAL_FINITE13');}};
}
