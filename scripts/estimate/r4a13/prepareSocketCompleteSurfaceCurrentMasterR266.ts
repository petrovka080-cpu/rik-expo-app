import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import fixture from '../../../data/estimate-benchmarks/fixtures/socket-complete-surface-whole-independent-r266.json';
import {socketCompleteSurfacePackR266 as pack,socketCompleteSurfaceRowR266 as rid,socketCompleteSurfaceWholeR266}
  from './ownedDomain/socketCompleteSurfaceWholeR266';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileFormulaGraph} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as valueSha,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,type MasterSingleDefinitionSuccessorConfig as Config}
  from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {verifySocketCompleteSurfacePureR266,verifySocketCompleteSurfaceWholeR266,type SocketVerificationContextR266}
  from './verifySocketCompleteSurfaceWholeR266';

const contract='gox.electrical.socket-complete-surface.current-master/r266';
const locatorKey='exact-complete-surface-2pe-project-resources-r266';
const parentSha='aaa9033eaa4a0c416d180b4c086b88cef7e3ed5627ce89c38ed7728402ee36c7';
const pointerPath='data/estimate-benchmarks/r568-local-developer-canonical-release.json';
const pointerSha='404bdb3657d36efb731f8131f63dc126e452f635579926d0f3855dbf749053f6';
export type SocketCurrentMasterContextR266=Readonly<{sourceRoot:string;
  currentFullParent:Readonly<{path:string;sha256:string}>;
  actualScopedSourceRead:Readonly<{path:string;sha256:string}>;
  outputRoot?:string;onCoreCall?:SocketVerificationContextR266['onCoreCall'];onOutcome?:SocketVerificationContextR266['onOutcome']}>;
type Capture=MasterRetainedParentCaptureR1&Readonly<{parameters:AutomaticOwnerDefinition['parameters'];
  formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources']}>;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function requiredRecord(value:unknown,label:string){assert(record(value),label);return value;}
function strings(value:unknown):value is string[]{return Array.isArray(value)&&value.every(v=>typeof v==='string');}
type Parameter=AutomaticOwnerDefinition['parameters'][number];type Formula=AutomaticOwnerDefinition['formulas'][number];type Resource=AutomaticOwnerDefinition['resources'][number];
function parameter(value:unknown):value is Parameter{
  return record(value)&&typeof value.parameter_id==='string'&&typeof value.value_type==='string'
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&typeof value.title_ru==='string'
    &&(value.unit_id===null||typeof value.unit_id==='string')&&typeof value.required==='boolean'
    &&Object.hasOwn(value,'default_value')&&(value.constraints_json===null||record(value.constraints_json))&&record(value.truth_metadata);
}
function formula(value:unknown):value is Formula{
  if(!record(value)||typeof value.formula_id!=='string'||typeof value.expression_source!=='string'
    ||typeof value.output_unit_id!=='string'||!strings(value.input_parameter_ids)||typeof value.ast_sha256!=='string')return false;
  try{assert.deepEqual(value.ast,compileFormulaGraph(value.expression_source).ast);return true;}catch{return false;}
}
function resource(value:unknown):value is Resource{
  return record(value)&&['id','row_id','section','category','title_ru','unit_id','formula_id','row_sha256'].every(k=>typeof value[k]==='string')
    &&typeof value.ordinal==='number'&&Number.isInteger(value.ordinal)&&record(value.inclusion_ast)&&record(value.resource_graph)
    &&typeof value.procurement_eligible==='boolean'&&(value.cost_owner_id===null||typeof value.cost_owner_id==='string')
    &&(value.source_metadata===null||record(value.source_metadata));
}
function rows<T>(value:unknown,check:(v:unknown)=>v is T,label:string):T[]{assert(Array.isArray(value),label);
  const output:T[]=[];for(const row of value){assert(check(row),label);output.push(row);}return output;}
function captureOf(value:unknown):Capture{const c=requiredRecord(value,'FULL_CAPTURE_REQUIRED');return{...c,
  definition:requiredRecord(c.definition,'FULL_DEFINITION_REQUIRED'),baseline:requiredRecord(c.baseline,'FULL_BASELINE_REQUIRED'),
  parameters:rows(c.parameters,parameter,'ACTUAL_PARAMETER_STRUCTURAL_TYPE'),formulas:rows(c.formulas,formula,'ACTUAL_FORMULA_STRUCTURAL_TYPE'),
  resources:rows(c.resources,resource,'ACTUAL_RESOURCE_STRUCTURAL_TYPE'),bindings:rows(c.bindings,record,'ACTUAL_BINDINGS'),
  normativeSources:rows(c.normativeSources,record,'ACTUAL_NORMATIVE_SOURCES'),normativeLocators:rows(c.normativeLocators,record,'ACTUAL_LOCATORS')};}

/** Existing owner/standard retained route only. Requires a real exact-key,
 * artifact and locator witness; the R266 source-empty capture is not absence. */
export function prepareSocketCompleteSurfaceCurrentMasterR266(context:SocketCurrentMasterContextR266):Config{
  assert(isAbsolute(context.sourceRoot));assert.equal(resolve(context.sourceRoot),resolve(__dirname,'../../..'),'ONE_ACTUAL_SOURCE_ROOT_REQUIRED');
  const own=(path:string)=>{const full=resolve(context.sourceRoot,path),rel=relative(context.sourceRoot,full);
    assert(!isAbsolute(path)&&rel!==''&&!isAbsolute(rel)&&!rel.startsWith('..'),'OWN_ROOT_RELATIVE_PATH_REQUIRED');return full;};
  const read=(path:string,sha256:string)=>{assert.match(sha256,/^[0-9a-f]{64}$/u);const bytes=readFileSync(own(path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sha256,'EXACT_SOURCE_BYTE_PIN:'+path);return bytes;};
  assert.equal(context.currentFullParent.sha256,parentSha,'CHANGED_CURRENT_PARENT_REQUIRES_REVIEW');
  const raw=requiredRecord(JSON.parse(read(context.currentFullParent.path,parentSha).toString('utf8')),'ACTUAL_FULL_PARENT_OBJECT');
  assert.equal(raw.readOnly,true);assert.equal(raw.sourceMetadataLosslessRoundtrip,true);const c=captureOf(raw.capture);
  assert.deepEqual(stable(c),stable(raw.capture),'ALL_ACTUAL_FIELDS_RETAINED');
  const identity=requiredRecord(raw.publicIdentity,'PUBLIC_IDENTITY_REQUIRED'),membership=requiredRecord(raw.membership,'ACTUAL_MEMBERSHIP_REQUIRED');
  assert.equal(identity.catalog_id,pack.catalogId);assert.equal(identity.work_key,pack.workKey);
  assert.equal(c.definition.catalog_id,pack.catalogId);assert.equal(c.definition.id,'9ba0918b-153e-543a-b335-b41d44e16fc8');assert.equal(c.definition.definition_version,3);
  assert.equal(c.definition.definition_sha256,'6fe173b6d170f74cb918127fa75b0a9fb970d4afa8e6d744d0b80c75ab2ee4fc');
  assert.equal(c.baseline.id,'47b6fc5a-608b-5aa9-a25d-d920c099ce81');assert.equal(c.baseline.catalog_id,pack.catalogId);assert.equal(c.baseline.definition_version_id,c.definition.id);
  assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length,c.normativeSources.length,c.normativeLocators.length],[1,63,63,0,0,0]);
  const pointer=requiredRecord(JSON.parse(read(pointerPath,pointerSha).toString('utf8')),'CURRENT_POINTER_REQUIRED');
  assert(typeof pointer.definitionReleaseId==='string');assert(typeof pointer.searchReleaseId==='string');
  assert.equal(membership.release_id,pointer.definitionReleaseId);assert.equal(membership.definition_version_id,c.definition.id);
  const witness=requiredRecord(JSON.parse(read(context.actualScopedSourceRead.path,context.actualScopedSourceRead.sha256).toString('utf8')),'REAL_SCOPED_SOURCE_READ_REQUIRED');
  assert.equal(witness.readOnly,true);assert.equal(witness.sourceKey,pack.sourceId);assert.equal(witness.artifactSha256,pack.source.sha256);
  assert.deepEqual(witness.exactLocatorKeys,[locatorKey]);for(const key of['sourceRows','sameArtifactSourceRows','allLocatorsForActualSourceIds','exactLocatorRows'])
    assert.deepEqual(witness[key],[],'REGISTRY_COLLISION_OR_INCOMPLETE_SCOPED_READ_REQUIRES_OWNER_REVIEW:'+key);
  assert.equal(witness.exactKeyAbsent,true);assert.equal(witness.artifactAliasOrLocatorReviewRequired,false);assert.equal(witness.globalAbsence,false);
  const parent:AutomaticOwnerDefinition={parameters:c.parameters,formulas:c.formulas,resources:c.resources,
    runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
  const model=socketCompleteSurfaceWholeR266(parent);verifySocketCompleteSurfacePureR266(parent,model);
  const metadata=requiredRecord(c.definition.source_metadata,'ACTUAL_LEGACY_SOURCE_METADATA');assert(typeof metadata.templateId==='string');
  assert.equal(metadata.templateId,'electrical_interior_socket_install_standard_professional_expanded_v1');
  assert(!Object.hasOwn(metadata,'retainedParentBindingSuccessorV1')&&!Object.hasOwn(metadata,'retainedParentBindingLineageV1'),'CHANGED_RETAINED_HISTORY_REQUIRES_REVIEW');
  const baselineSources=requiredRecord(c.baseline.normative_source_ids,'BASELINE_SOURCE_ARRAYS');
  const qSources=baselineSources.q;assert(strings(qSources));assert.deepEqual(qSources,['r555-source:'+metadata.templateId]);
  const capturedParentSha256=masterRetainedParentCaptureSha256R1(c);
  const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
    legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:metadata.templateId,parameterSources:{q:qSources}},
    newParameterSources:Object.fromEntries(model.parameters.slice(1).map(p=>[p.parameter_id,p.truth_metadata.visibility_role==='INTERNAL_ONLY'
      ?{kind:'DERIVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}]))};
  const sourcePaths=['scripts/estimate/r4a13/prepareSocketCompleteSurfaceCurrentMasterR266.ts','scripts/estimate/r4a13/verifySocketCompleteSurfaceWholeR266.ts',
    'scripts/estimate/r4a13/ownedDomain/socketCompleteSurfaceWholeR266.ts','data/estimate-benchmarks/source-packs/socket-complete-surface-2pe-project-r266.json',
    'data/estimate-benchmarks/fixtures/socket-complete-surface-whole-independent-r266.json',pack.source.logicalPath,context.currentFullParent.path,context.actualScopedSourceRead.path,pointerPath,
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts','src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts'];
  read(pack.source.logicalPath,pack.source.sha256);for(const path of sourcePaths)readFileSync(own(path));
  const bound=[rid('assembly:consumed'),rid('assembly:order')],rowApplicability=Object.fromEntries(bound.map(rowId=>[rowId,{
    contract,manufacturerReference:pack.privateManufacturerReference,unitId:'pcs',completeFactoryUnit:true,
    quantityIsActualProjectSchedule:true,manufacturerLabourNormAccepted:false,actualProjectAuthentication:false}]));
  const cfg:Config={contract,stopCode:'SOCKET_COMPLETE_SURFACE_CURRENT_R266',applicationName:'socket-existing-complete-surface-r266',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt',
    masterSha256:'541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40',
    parentReleaseId:pointer.definitionReleaseId,parentSearchReleaseId:pointer.searchReleaseId,currentReleasePath:pointerPath,
    outputRoot:context.outputRoot??'.release-runtime/socket-existing-complete-surface-r266',sourcePaths:[...new Set(sourcePaths)],
    catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:'Комплектная накладная розетка 2P+E и фактические ресурсы принятого проекта',
      source_authority:'Legrand: только состав заводского изделия и его совместимость; труд и крепёж требуют фактического ППР',
      exact_locator:pack.source.locator,use_restriction:pack.scope,source_kind:'EXACT_COMPLETE_FACTORY_UNIT_WITH_PROJECT_RESOURCES_NOT_LABOUR_RATE',
      official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256},
    parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    shortInput:fixture.testOnlyInput,acceptanceInput:fixture.testOnlyInput,expectedParentShape:[1,63,63],benchmarkOrdinal:266,
    validationScenario:'TEST_ONLY exact complete surface socket; separate actual node count, project resource facts, same existing owner, legacy unverified scope retained',
    passport:{canonicalRuName:'Монтаж розеток в стандартной зоне',workKey:pack.workKey,
      physicalResultRu:'Розеточный узел в подтверждённом комплектном накладном корпусе на подготовленном основании',
      includedScopeRu:[pack.scope],excludedScopeRu:['Норма труда монтажа не подтверждена удержанным КРЕРм08; здесь нет универсальной ставки.',
        'Текущие 18 непроверенных источников прежних 63 строк не становятся физическими нормами.',
        'Данные проекта, фактического допуска, цены и поставки не подтверждены TEST_ONLY входом.'],independentCompletenessMap:fixture.completenessMap},
    applicability:{...structuredClone(c.definition.applicability),currentParentDefinitionId:c.definition.id,sourceQualifiedProjectProfileV1:{contract,
      selectorParameterId:pack.methodParameterId,selectorValue:pack.method,legacyRows:63,manufacturerFactoryUnitAccepted:true,
      actualProjectAuthentication:false,labourNormAccepted:false,priceCoverage:'ROOT_OWNER_REVIEW_HOLD',full:false},
      primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:pack.methodParameterId,selections:[
        {selectorValue:pack.legacyMethod,primaryMeasureParameterId:'q',unitId:'point'},
        {selectorValue:pack.method,primaryMeasureParameterId:pack.countParameterId,unitId:'pcs'}]}},
    binding:{rowId:bound[0],additionalRowIds:bound.slice(1),applicability:rowApplicability[bound[0]],applicabilityByRowId:rowApplicability,retainParentBindings:retained},
    locator:{key:locatorKey,payload:{contract,source:pack.source,readback:pack.readback,privateManufacturerReference:pack.privateManufacturerReference,
      explicitBindingApplicabilityByRowId:rowApplicability,labourNormAccepted:false,projectAuthenticated:false,sourceAuthorityExtendedToLegacy:false}},
    search:{primaryUom:'point',canonicalNameRu:'Монтаж розеток в стандартной зоне',aliases:[],shortScopeRu:'Существующая карточка; внутренний профиль комплектной накладной розетки.',
      keyDistinguishingParameters:[pack.methodParameterId,pack.countParameterId],clarificationFields:[],includedBoundaries:[pack.scope],
      excludedBoundaries:['Иные изделия и основания, штробление, прокладка новой линии, скрытый монтаж, взрывоопасная зона и расчёт зарядного контура не допускаются этим профилем.'],
      extraSearchTermsRu:'розетка комплектная накладная корпус механизм рамка подготовленное основание',sourceProvenance:{contract,capturedParentSha256,
        actualCurrentFileSha256:parentSha,sourceWitnessSha256:context.actualScopedSourceRead.sha256,newPublicCatalogs:0,full:false}},
    forbiddenAdjacentMatchers:[/low_current|cat6|ventilated_facade|natural_stone/iu],owner:'ROOT_SINGLE_INTEGRATOR_ELECTRICAL_EXISTING_OWNER',receiptFileStem:'socket_complete_surface_r266',
    verifyTargetPrecondition:async()=>{
      // Standard publisher precondition: TEST_ONLY input and a real source-key
      // absence witness do not authenticate the installation scope, price or PPR.
      throw Error('STOP_SOCKET_COMPLETE_SURFACE_R266_SOURCE_AND_QUALIFICATION_REVIEW_HOLD');
    },
    verifyCore:async()=>{
      // Exact standard pure retained projection. These UUIDs are TEST_ONLY; no DB IDs are forecast.
      const sourceId='11111111-1111-5111-8111-111111111111',locatorId='22222222-2222-5222-8222-222222222222';
      const fingerprint=valueSha({purpose:'PURE_SOCKET_CURRENT_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',capturedParentSha256,
        currentFullReadSha256:parentSha,sourceHashes:cfg.sourcePaths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(own(path))).digest('hex')}))});
      const m=cfg.sourceMetadata,projection=prepareMasterRetainedBindingRepresentativeR1({config:cfg,newSource:{id:sourceId,source_key:cfg.sourceId,
        title_ru:m.source_title,authority:m.source_authority,official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:null,effective_to:null,
        metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
        newLocators:[{id:locatorId,source_id:sourceId,locator_key:cfg.locator.key,locator:cfg.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(cfg)}]},
        {parameters:model.parameters,formulas:model.formulas.map(f=>c.formulas.some(old=>old.formula_id===f.formula_id)?f:{...f,ast_sha256:valueSha(f.ast)}),
          resources:buildMasterPublicationResourceRowsR1(model.resources),newBindings:bound.map(row_id=>({row_id,locator_id:locatorId,applicability:rowApplicability[row_id]})),
          successorProvenance:{contract,sourceId:cfg.sourceId,normId:cfg.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
            capturedParentSha256,sourceFingerprint:fingerprint,currentFullReadSha256:parentSha},lifecycleMetadata:{contract,masterSha256:cfg.masterSha256,sourceFingerprint:fingerprint}});
      assert.equal(projection.expectedNormativeBindingCount,2);for(const[id,sources]of Object.entries(c.baseline.normative_source_ids))assert.deepEqual(projection.normativeSourceIds[id],sources);
      context.onOutcome?.('ordinary-retained-source-and-composition-guard',{status:'PASS_TEST_ONLY_PROJECTION_NOT_DB_PREFLIGHT',bindings:2});
      return verifySocketCompleteSurfaceWholeR266({parent,model,onCoreCall:context.onCoreCall,onOutcome:context.onOutcome});
    }};
  return cfg;
}
