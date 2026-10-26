import assert from 'node:assert/strict';
import {statSync,realpathSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import independentMap from '../../../data/estimate-benchmarks/source-packs/masonry-glass-opening-existing-owner-map-r223.json';
import source from '../../../data/estimate-benchmarks/source-packs/masonry-glass-opening-existing-owner-r223.json';
import fixture from '../../../data/estimate-benchmarks/fixtures/masonry-glass-opening-existing-owner-r223.json';
import displaySource from '../../../data/estimate-benchmarks/source-packs/masonry-glass-m25-display-link-r152.json';
import {prepareMasonryGlassBlockNormalAppendR103,masonryGlassBlockNormalPreflightR103} from './prepareMasonryGlassBlockNormalAppendR103';
import {masonryGlassM25OperationDefinitionR152} from '../../../src/lib/estimate/v4/masonryGlassM25OperationDisplayR152';
import {masonryGlassOpeningExistingDefinitionR223 as build,compileMasonryGlassOpeningExistingR223 as compile,
 masonryGlassOpeningPrimaryR223 as primary,GLASS_OPENING_CATALOG_R223 as catalogId,
 GLASS_OPENING_CHOICE_ID_R223 as selector,GLASS_OPENING_LEGACY_R223 as legacy,
 GLASS_OPENING_OWN_R223 as glass,GLASS_OPENING_AREA_R223 as area,GLASS_OPENING_HEIGHT_R223 as height,
 GLASS_OPENING_SOURCE_R223 as sourceId} from '../../../src/lib/estimate/v4/masonryGlassOpeningExistingOwnerR223';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalApprovedBaselineRuntimeParameters} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolvePrimaryMeasureSelectionV1} from '../../../src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1';
import {validateCanonicalEstimateParameters} from '../../../src/lib/estimate/backendPlatform/parameterConstraints';
import {validateCanonicalEstimateParameterInputs} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
 assertMasterRetainedBindingSnapshotR1,type MasterRetainedBindingSnapshotR1,
 type MasterRetainedParentCaptureR1,type MasterRetainedBindingGuardInputR1,type MasterRetainParentBindingsR1}
 from './masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,
 resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
 resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1,
 type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

type Json=Record<string,unknown>;
type OpeningArtifactPinR223=Readonly<{path:string;sha256:string}>;
export type MasonryOpeningPublisherSourceProjectionR223=Readonly<{
 canonicalRoot:string;runtimeEvidenceRoot:string;
 files:readonly Readonly<{original:OpeningArtifactPinR223;projected:OpeningArtifactPinR223}>[];
}>;
export type MasonryOpeningFirstApplyR223=Readonly<{
 contract:'root-masonry-opening-first-apply/r1';
 operationalMasterPin:OpeningArtifactPinR223;expectedBranch:string;currentPointerSha256:string;
 parentSnapshot:OpeningArtifactPinR223;scopedRegistry:OpeningArtifactPinR223;
 publisherSourceProjection:MasonryOpeningPublisherSourceProjectionR223;
}>;
type Context={releaseId:string;searchReleaseId:string;sourceRoot:string;outputRoot:string;rootFirstApplyR223?:MasonryOpeningFirstApplyR223};
type Capture=MasterRetainedParentCaptureR1&Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;
/** Preserve the exact existing owner/core arrays across the ordinary Config boundary. */
type OpeningConfigR223=Omit<Config,'parameterDefinitions'|'formulaDefinitions'|'resourceDefinitions'>&Readonly<{
 parameterDefinitions:AutomaticOwnerDefinition['parameters'];
 formulaDefinitions:AutomaticOwnerDefinition['formulas'];
 resourceDefinitions:AutomaticOwnerDefinition['resources'];
}>;
const paths={model:'src/lib/estimate/v4/masonryGlassOpeningExistingOwnerR223.ts',
 config:'scripts/estimate/r4a13/prepareMasonryGlassOpeningExistingOwnerR223.ts',
 test:'scripts/estimate/r4a13/masonryGlassOpeningExistingOwnerR223.test.ts',
 pack:'data/estimate-benchmarks/source-packs/masonry-glass-opening-existing-owner-r223.json',
 map:'data/estimate-benchmarks/source-packs/masonry-glass-opening-existing-owner-map-r223.json',
 fixture:'data/estimate-benchmarks/fixtures/masonry-glass-opening-existing-owner-r223.json',
 capture:'data/estimate-benchmarks/fixtures/masonry-opening-current-full-parent-r223.json'};
const record=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const same=(a:unknown,b:unknown)=>assert.deepEqual(stable(a),stable(b));
const nativeOracle:Readonly<Record<string,readonly (readonly string[])[]>>=fixture.nativeOracle;
let calls=0;
export const masonryGlassOpeningActualEntriesR223=()=>calls;
function save(name:string,value:unknown){const root=process.env.MASONRY_R223_ACTUAL_OUTPUT;
 assert(root,'MASONRY_R223_ACTUAL_OUTPUT_REQUIRED');mkdirSync(root,{recursive:true});
 writeFileSync(resolve(root,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}

export function masonryGlassOpeningCapturedR223(sourceRoot:string):Capture{
 const path=resolve(sourceRoot,paths.capture);assert.equal(sha(path),source.parent.fullFileSha256);
 // Same exact-byte typed read boundary used by the existing NVF retained Config.
 // No static JSON import: the entire whole parent and metadata remain present.
 const packet:{capture:Capture;readOnly:boolean}=JSON.parse(readFileSync(path,'utf8'));
 assert.equal(packet.readOnly,true);const c=packet.capture;
 assert.equal(c.definition.catalog_id,catalogId);assert.equal(c.definition.id,source.parent.definitionId);
 assert.equal(c.definition.definition_sha256,source.parent.definitionSha256);assert.equal(c.definition.definition_version,3);
 assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length,c.bindings.length],[1,59,59,0]);
 assert.equal(c.parameters[0]?.parameter_id,'q');assert.equal(c.parameters[0]?.unit_id,'m2');
 assert.equal(c.parameters[0]?.default_value,100);assert.equal(c.baseline.id,source.parent.baselineId);
 assert.deepEqual(c.baseline.input_values,{q:100});assert.deepEqual(c.baseline.input_classification,{q:'ASSUMPTION'});
 assert.deepEqual(c.normativeSources,[]);assert.deepEqual(c.normativeLocators,[]);
 return c;
}
const original=(c:Capture):AutomaticOwnerDefinition=>({parameters:c.parameters,formulas:c.formulas,resources:c.resources,
 runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']});


// Authoring/backend only. R103 historical216 still validates its original
// bytes; only the explicitly opted-in final Config receives operational219.
function openingRootPreparationR223(context:Context,base:Pick<Config,'masterPath'|'masterSha256'>){
 if(!Object.hasOwn(context,'rootFirstApplyR223'))return undefined;
 const proof=context.rootFirstApplyR223;
 function check(value:unknown,code:string):asserts value{assert(value,'MASONRY_OPENING_ROOT_APPLY_'+code);}
 check(record(proof)&&proof.contract==='root-masonry-opening-first-apply/r1','CONTEXT');
 check(record(proof.operationalMasterPin)&&typeof proof.operationalMasterPin.path==='string'
  &&proof.operationalMasterPin.sha256==='66ef69e13c4c189c17215dd614ac35714d2f98c8a944fb859a8a2c9eb450154c','OPERATIONAL_MASTER219_REQUIRED');
 check(sha(proof.operationalMasterPin.path)===proof.operationalMasterPin.sha256,'OPERATIONAL_MASTER_BYTES');
 check(base.masterSha256==='541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40','HISTORICAL_MASTER216_UNCHANGED');
 check(typeof proof.expectedBranch==='string'&&proof.expectedBranch.length>0,'BRANCH_REQUIRED');
 const pointerBytes=readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'));
 check(createHash('sha256').update(pointerBytes).digest('hex')===proof.currentPointerSha256,'CURRENT_POINTER_SHA');
 const pointer:unknown=JSON.parse(pointerBytes.toString('utf8'));
 check(record(pointer)&&pointer.productionAccessed===false&&pointer.definitionReleaseId===context.releaseId
  &&pointer.searchReleaseId===context.searchReleaseId&&pointer.definitionReleaseStatus==='prepared'&&pointer.searchReleaseStatus==='draft','CURRENT_POINTER_PAIR');
 const read=(pin:OpeningArtifactPinR223):Json=>{
  check(record(pin)&&typeof pin.path==='string'
   &&pin.path.startsWith('data/estimate-benchmarks/source-artifacts/masonry-opening-first-apply-r223/')
   &&pin.path.endsWith('.json')&&!pin.path.split('/').some(part=>part==='.'||part==='..')
   &&/^[a-zA-Z0-9_./-]+$/.test(pin.path)&&/^[a-f0-9]{64}$/.test(pin.sha256),'ARTIFACT_PIN');
  const path=resolve(context.sourceRoot,pin.path);check(statSync(path).size<=4*1024*1024,'ARTIFACT_BYTE_CAP');
  const bytes=readFileSync(path);check(createHash('sha256').update(bytes).digest('hex')===pin.sha256,'ARTIFACT_SHA');
  const value:unknown=JSON.parse(bytes.toString('utf8'));check(record(value),'ARTIFACT_OBJECT');return value;
 };
 check(proof.parentSnapshot?.path!==proof.scopedRegistry?.path,'DISTINCT_ARTIFACTS');
 const parentSnapshot=read(proof.parentSnapshot) as unknown as MasterRetainedBindingSnapshotR1;
 const scopedRegistry=read(proof.scopedRegistry) as unknown as MasterCapturedScopedNormativeRegistryR1;
 return{parentSnapshot,scopedRegistry,sourcePaths:[proof.parentSnapshot.path,proof.scopedRegistry.path,
  'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts'],marker:{contract:'root-reviewed-operational-master/r1',
   historicalMasterPin:{path:base.masterPath,sha256:base.masterSha256},operationalMasterPin:{...proof.operationalMasterPin},
   precededReviewDecisionMasterPin:{path:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_18_2026-10-26.txt',
    sha256:'3675b6e7e4dac0da2d1efed39ea7074899b5fa456d434385e8ae9ca5443fac66',status:'SOURCE_REVIEW_ONLY_NOT_PUBLICATION'},
   parentSnapshot:{...proof.parentSnapshot},scopedRegistry:{...proof.scopedRegistry},currentPointerSha256:proof.currentPointerSha256,
   publisherSourceProjection:structuredClone(proof.publisherSourceProjection),
   parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,expectedBranch:proof.expectedBranch}};
}

// Publisher9ec runs git status on every sourcePaths entry. ROOT creates these
// exact-byte private projections first; this factory reads and checks only.
// Keep original external pins for the callback and historical provenance.
function openingPublisherSourceProjectionR223(context:Context,sourcePaths:readonly string[]){
 const proof=context.rootFirstApplyR223;if(!proof)return sourcePaths;
 function check(value:unknown,code:string):asserts value{assert(value,'MASONRY_OPENING_SOURCE_PROJECTION_'+code);}
 const projection=proof.publisherSourceProjection;
 check(record(projection)&&Array.isArray(projection.files),'REQUIRED');
 const canonicalRoot='C:\\dev\\rik-expo-app-r4a5-dc4f0ce7';
 check(projection.canonicalRoot===canonicalRoot,'CANONICAL_ROOT');
 const root=resolve(canonicalRoot);
 check(resolve(context.sourceRoot)===root&&resolve('.')===root&&realpathSync(root)===root,'SOURCE_ROOT');
 const inside=(parent:string,path:string)=>{const r=relative(parent,path);return r!==''&&!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};
 const privateRoot=resolve(root,'.release-runtime');
 check(typeof projection.runtimeEvidenceRoot==='string'&&isAbsolute(projection.runtimeEvidenceRoot),'RUNTIME_ROOT');
 const runtimeRoot=resolve(projection.runtimeEvidenceRoot);
 check(inside(privateRoot,runtimeRoot)&&realpathSync(privateRoot)===privateRoot
  &&inside(privateRoot,realpathSync(runtimeRoot)),'RUNTIME_ROOT');
 const external=new Set(sourcePaths.map(path=>resolve(root,path)).filter(path=>!inside(root,path)));
 const replacements=new Map<string,string>(),projectedTargets=new Set<string>();
 for(const file of projection.files){
  check(record(file)&&record(file.original)&&record(file.projected)
   &&typeof file.original.path==='string'&&typeof file.projected.path==='string'
   &&typeof file.original.sha256==='string'&&typeof file.projected.sha256==='string'
   &&/^[a-f0-9]{64}$/.test(file.original.sha256)&&file.original.sha256===file.projected.sha256,'SHA_IDENTITY');
  const original=resolve(root,file.original.path),projected=resolve(root,file.projected.path);
  check(external.has(original),'UNREQUESTED_ORIGINAL');
  check(!replacements.has(original),'DUPLICATE_ORIGINAL');
  check(inside(runtimeRoot,projected)&&inside(realpathSync(runtimeRoot),realpathSync(projected)),'PROJECTED_PATH_SCOPE');
  const actualProjected=realpathSync(projected);
  check(!projectedTargets.has(actualProjected),'DUPLICATE_PROJECTED');projectedTargets.add(actualProjected);
  check(statSync(original).isFile()&&sha(original)===file.original.sha256,'ORIGINAL_BYTES');
  check(statSync(projected).isFile()&&sha(projected)===file.projected.sha256,'PROJECTED_BYTES');
  replacements.set(original,relative(root,projected).split(sep).join('/'));
 }
 check(replacements.size===external.size,'MISSING_EXTERNAL_PIN');
 return [...new Set(sourcePaths.map(path=>{const absolute=resolve(root,path);
  if(inside(root,absolute)){
   check(inside(root,realpathSync(absolute)),'CANONICAL_PATH_ESCAPE');
   return relative(root,absolute).split(sep).join('/');
  }
  const projected=replacements.get(absolute);check(projected,'MISSING_EXTERNAL_PIN');return projected;
 }))];
}
function assertOpeningRootPreparationR223(config:Config,proof:NonNullable<ReturnType<typeof openingRootPreparationR223>>){
 const input=masonryGlassOpeningRetainedGuardInputR223(config);
 assertMasterRetainedBindingSnapshotR1(input,proof.parentSnapshot);
 same(config.capturedScopedNormativeRegistry,proof.scopedRegistry);
 // R70 deliberately narrows its input Config. Pass the same complete typed
 // Config to the scoped guard so normId/catalogAppend retain their field types.
 assert(resolveMasterScopedNormativeRegistryOptInR1({...input,config}),'MASONRY_OPENING_ROOT_APPLY_SCOPED_REGISTRY_REQUIRED');
}
/** Existing same-parent normal Config only. Old APPEND envelope is discarded;
 * its immutable R154 whole model, source/readers and display owners are reused.
 * expected:null is a strict future precondition, not a live absence assertion. */
export function masonryGlassOpeningExistingConfigR223(context:Context):OpeningConfigR223{
 const c=masonryGlassOpeningCapturedR223(context.sourceRoot),parent=original(c),next=build(parent);
 // Use the existing typed Config constructor. R154 whole model remains the
 // child builder; its old standalone verification callback is not imported.
 for(const pin of displaySource.inputs)assert.equal(sha(resolve(context.sourceRoot,pin.path)),pin.sha256,pin.path);
 const normalBase=prepareMasonryGlassBlockNormalAppendR103('opening-fill',context);
 masonryGlassBlockNormalPreflightR103(normalBase,'opening-fill');
 const{catalogAppend:_append,verifyCore:_oldVerify,...base}=normalBase;
 assert(_append,'EXACT_HISTORICAL_APPEND_ENVELOPE_ONLY');
 const ownIds=new Set(c.parameters.map(p=>p.parameter_id));
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
  capturedSourcePreimage:{sourceKey:sourceId,expected:null},
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',
   templateId:String(c.definition.source_metadata.templateId),parameterSources:structuredClone(c.baseline.normative_source_ids)},
  newParameterSources:Object.fromEntries(next.parameters.filter(p=>!ownIds.has(p.parameter_id)).map(p=>[p.parameter_id,
   p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[sourceId]}]))};
 const rootPreparation=openingRootPreparationR223(context,base);
 const originalSourcePaths=[...new Set([...base.sourcePaths,...(rootPreparation?.sourcePaths??[]),
  'data/estimate-benchmarks/source-packs/masonry-glass-m25-display-link-r152.json',
  ...displaySource.inputs.map(pin=>pin.path),...Object.values(paths),
  ...(rootPreparation?[base.masterPath,context.rootFirstApplyR223!.operationalMasterPin.path]:[])])];
 const publisherSourcePaths=openingPublisherSourceProjectionR223(context,originalSourcePaths);
 const config:OpeningConfigR223={...base,contract:source.contract,
  ...(rootPreparation?{masterPath:context.rootFirstApplyR223!.operationalMasterPin.path,
   masterSha256:context.rootFirstApplyR223!.operationalMasterPin.sha256,expectedBranch:context.rootFirstApplyR223!.expectedBranch,
   capturedScopedNormativeRegistry:rootPreparation.scopedRegistry,
   // Existing9ec invokes this before its own R70 locks. Recheck changing
   // byte/pointer inputs here; live DB reads/locks stay with that publisher.
   verifyTargetPrecondition:async(_client,_phase)=>{
    const fresh=openingRootPreparationR223(context,base);assert(fresh);same(fresh.marker,rootPreparation.marker);
    same(openingPublisherSourceProjectionR223(context,originalSourcePaths),publisherSourcePaths);
    assertOpeningRootPreparationR223(config,fresh);
   }}:{}),stopCode:'MASONRY_GLASS_OPENING_EXISTING_R223',
  applicationName:'masonry-glass-opening-existing-r223',receiptFileStem:'masonry_glass_opening_existing_r223',
  outputRoot:context.outputRoot,catalogId,sourceId,normId:'08-04-002-03|08-04-002-04',expectedParentShape:[1,59,59],
  sourcePaths:publisherSourcePaths,
  sourceMetadata:{...base.sourceMetadata,source_title:'Заполнение проёма пустотелыми стеклоблоками',
   artifact_sha256:source.primaryArtifactSha256,source_kind:'SAME_EXISTING_OPENING_OWN_GLASS03_04_RETAINED_COMPOSITION_NOT_FULL',
   exact_locator:'КРЕР08,2015;08-04-002-03/04;PDF55,100м²; exact R154 native/whole-labour/M25 operation references',
   use_restriction:'Только пустотелые бесцветные194×194×98мм стеклоблоки, собственные армирование/готовыйМ25. Собственная измеренная площадь; не q100, не самостоятельная перегородка и не проектное подтверждение/FULL.'},
  parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
  shortInput:{q:100,[selector]:legacy},acceptanceInput:{q:100,[selector]:legacy},
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  validationScenario:'RETAINED_LEGACY_V3_AND_OWN_GLASS_OPENING03_04_IN_ONE_EXISTING_CARD',
  passport:{...base.passport,canonicalRuName:'кладка проема в кладке в стандартной зоне',workKey:'masonry_interior_opening_lay_standard',
   physicalResultRu:'Сохранённый состав кладки проёма либо заполнение проёма стеклоблоками по отдельной измеренной площади.',
   independentCompletenessMap:independentMap,
   includedScopeRu:['Старые59строк сохранены только в прежней ветви.','Собственные03/04 заполнения проёма стеклоблоками с целым исходным трудом и прежними единичными владельцами.'],
   excludedScopeRu:[...base.passport.excludedScopeRu,'Площадь не подтверждает объект, армирование, комплект доступа, наличие и приёмку; legacyq не определяет площадь стеклоблоков.']},
  applicability:{...(rootPreparation?{rootFirstApplyR223:rootPreparation.marker}:{}),legacyApplicability:structuredClone(c.definition.applicability),primaryMeasureSelectionV1:primary(),
   ownGlassColumns:['08-04-002-03','08-04-002-04'],oldAndNewPhysicalRowsMutuallyExclusive:true,
   newPublicCatalogIds:0,fullTechnicalAcceptance:false,sourceProfileChoiceIsNotProjectApproval:true},
  binding:{...base.binding,retainParentBindings:retained},
  locator:{key:'kg-krer08-04-002-glass-opening-existing-r223',payload:{contract:source.contract,
   ownWholeSource:source,independentCompletenessMap:independentMap,retainedParentFileSha256:source.parent.fullFileSha256,
   historicalR154WholeOwnersPreserved:true,fullTechnicalAcceptance:false}},
  search:{...base.search,canonicalNameRu:'кладка проема в кладке в стандартной зоне',aliases:[],
   shortScopeRu:'Существующая карточка проёма: прежний состав либо пустотелые стеклоблоки с собственной измеренной площадью.',
   keyDistinguishingParameters:[selector],clarificationFields:[selector],
   sourceProvenance:{contract:source.contract,existingCatalogId:catalogId,noNewPublicCard:true,normalLockedRequired:true}},
  verifyCore:()=>verifyMasonryGlassOpeningExistingR223(config,context.sourceRoot)};
 if(rootPreparation)assertOpeningRootPreparationR223(config,rootPreparation);
 assert.equal(config.catalogAppend,undefined);return config;
}

/** Reuse the existing subject registry proposal; no second UUID or SQL owner. */
export function masonryGlassOpeningRetainedGuardInputR223(config:Config):MasterRetainedBindingGuardInputR1{
 const uuid=(seed:string)=>{const bytes=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');
  bytes[6]=(bytes[6]!&15)|80;bytes[8]=(bytes[8]!&63)|128;const h=bytes.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
 const id=uuid(`${config.contract}:${sourceId}:source`),lid=uuid(`${config.contract}:${sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
 const input:MasterRetainedBindingGuardInputR1={config,newSource:{id,source_key:sourceId,title_ru:m.source_title,authority:m.source_authority,
  official_url:m.official_url??null,artifact_sha256:m.artifact_sha256,effective_from:null,effective_to:null,
  metadata:{contract:config.contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
  newLocators:[{id:lid,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
 return input;
}

export function masonryGlassOpeningRetainedPureR223(config:Config,sourceRoot:string){
 const retained=config.binding.retainParentBindings;assert(retained);const c=masonryGlassOpeningCapturedR223(sourceRoot);
 assert.equal(config.catalogAppend,undefined);assert.equal(config.catalogId,catalogId);assert.equal(config.sourceId,sourceId);
 assert.deepEqual(config.expectedParentShape,[1,59,59]);assert.deepEqual(config.runtimeProfileInput,{});
 assert(config.parameterDefinitions.every(p=>p.default_value===null));assert.equal(config.resourceDefinitions.length,97);
 for(const before of c.formulas)same(config.formulaDefinitions.find(f=>f.formula_id===before.formula_id),before);
 for(const before of c.resources){const after=config.resourceDefinitions.find(r=>r.row_id===before.row_id);assert(after);
  for(const key of ['id','row_id','formula_id','unit_id','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'])same(after[key],before[key]);
  same(after.inclusion_ast,{kind:'and',operands:[{kind:'equals',parameterId:selector,value:legacy},before.inclusion_ast]});}
 const child=masonryGlassM25OperationDefinitionR152('opening-fill');
 for(const row of child.resources){const after=config.resourceDefinitions.find(r=>r.row_id===row.row_id);assert(after);
  const protectedFields:readonly (keyof AutomaticOwnerDefinition['resources'][number])[]=
   ['id','row_id','formula_id','unit_id','cost_owner_id','procurement_eligible','source_metadata','resource_graph'];
  for(const key of protectedFields)same(after[key],row[key]);}
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:independentMap,formulaDefinitions:config.formulaDefinitions,resourceDefinitions:config.resourceDefinitions}),[]);
 const model=build(original(c));const glassInput={[selector]:glass,[area]:'12.5',[height]:'4'};
 // Existing published and(selected legacy,literal true), as in NVF R5.
 // Filter only the NEW composed scope; the captured historical baseline stays.
 const confirmedGlass=canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters:glassInput});
 assert.deepEqual(confirmedGlass,{});
 assert.deepEqual(canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters:{[selector]:legacy}}),{q:100});
 assert.deepEqual(canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters:{}}),{});
 assert.deepEqual(c.baseline.input_values,{q:100});assert.deepEqual(c.baseline.input_classification,{q:'ASSUMPTION'});
 const schema=model.parameters.map(p=>({parameterId:p.parameter_id,valueType:p.value_type,unitId:p.unit_id,
  visibilityRole:typeof p.truth_metadata.visibility_role==='string'?p.truth_metadata.visibility_role:undefined,
  constraints:p.constraints_json??{},formulaConsumers:Array.isArray(p.truth_metadata.formula_consumers)?p.truth_metadata.formula_consumers:[]}));
 // A q-only request or absent physical choice cannot fall back to ordinal q.
 for(const submitted of [{q:100},{}]){
  const unresolved=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:submitted});
  assert.equal(unresolved.kind,'CLARIFICATION_REQUIRED');
  if(unresolved.kind==='CLARIFICATION_REQUIRED')assert.equal(unresolved.reason,'SELECTION_REQUIRED');
 }
 const bothRoots={...glassInput,q:100};
 const explicit=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:bothRoots});
 assert.equal(explicit.kind,'RESOLVED');
 if(explicit.kind==='RESOLVED')assert.deepEqual(explicit.primaryMeasure,{parameterId:area,unitId:'m2'});
 // Separate meanings: confirmed historical q100 must not fill own missing area;
 // explicitly submitted q in glass is forbidden by the existing constraints.
 const missingOwnArea={[selector]:glass,[height]:'4'};
 const confirmedMissing=canonicalApprovedBaselineRuntimeParameters(c.baseline,{parameterDefinitions:model.parameters,inputParameters:missingOwnArea});
 assert.deepEqual(confirmedMissing,{});
 // The current common core admits a first PRELIMINARY revision when a value
 // is absent; it must neither manufacture area nor transfer historical q100.
 const unresolvedValues=validateCanonicalEstimateParameters(model.parameters,missingOwnArea,{confirmedParameters:confirmedMissing});
 assert.equal(unresolvedValues[area],undefined);assert.equal(unresolvedValues.q,undefined);
 // Same pure schema validator used by consumerCanonicalBaselineCompile.ts.
 // The ordinary editor must retain this selected primary requirement.
 // This is the existing pure schema validator, not an actual UI/API PASS.
 const editorSchema:Parameters<typeof validateCanonicalEstimateParameterInputs>[0]['schema']=
  model.parameters.filter(p=>model.ordinaryParameterIds.includes(p.parameter_id)).map(p=>{
   const visibility=p.truth_metadata.visibility_role,role=p.truth_metadata.value_source_role,valueType=p.value_type;
   assert(valueType==='decimal'||valueType==='enum','EXACT_FOUR_ORDINARY_SCHEMA_VALUE_TYPES');
   assert.equal(p.default_value,null,'ORDINARY_SCHEMA_HAS_NO_HIDDEN_DEFAULT');
   assert.equal(visibility,'USER_INPUT');assert(role==='USER_INPUT'||role==='VISIBLE_BASELINE_ASSUMPTION');
   return{parameterId:p.parameter_id,ordinal:p.ordinal,titleRu:p.title_ru,valueType,unitId:p.unit_id,
    required:p.required,defaultValue:p.default_value,constraints:p.constraints_json??{},valueSourceRole:role};
  });
 const editor=validateCanonicalEstimateParameterInputs({schema:editorSchema,rawInputs:missingOwnArea});
 const primaryIssue=editor.issues.find(issue=>issue.parameterId===area&&(issue.code==='REQUIRED'||issue.code==='REQUIRED_WHEN'));
 assert(primaryIssue);assert.equal(editor.parameters[area],undefined);
 assert.throws(()=>validateCanonicalEstimateParameters(model.parameters,bothRoots,{confirmedParameters:confirmedGlass}),
  {code:'PARAMETER_VALIDATION_FAILED',message:'parameter q is forbidden by cross-field rule'});
 const identity=resolvePrimaryMeasureSelectionV1({selectionMetadata:primary(),parameterSchema:schema,submittedParameters:glassInput,
  parentPrimaryMeasure:{parameterId:'q',unitId:'m2'}});
 assert.equal(identity.kind,'NEW_ROOT_REQUIRED');if(identity.kind==='NEW_ROOT_REQUIRED')assert.deepEqual(identity.carryForward,{parameters:false,rowOverrides:false,prices:false});
 const input=masonryGlassOpeningRetainedGuardInputR223(config);
 assert.equal(input.newLocators.length,1,'EXACT_EXISTING_GLASS_LOCATOR_REQUIRED');
 const locator=input.newLocators[0];assert(locator);const lid=locator.id;
 const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldIds=new Set(c.formulas.map(f=>f.formula_id));
 const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldIds.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
 const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[lid]);
 const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[lid]).map(row_id=>({row_id,locator_id:lid,applicability:applicable[row_id]}));
 const fingerprint=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_RETAINED_GLASS_OPENING_NOT_DATABASE_OR_PUBLICATION',
  capture:retained.capturedParentSha256,sources:config.sourcePaths.map(path=>({path,sha256:sha(resolve(sourceRoot,path))})),source:input.newSource,locators:input.newLocators});
 const prepared=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
  successorProvenance:{contract:config.contract,sourceId,normId:config.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
   capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
  lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
 assert.equal(prepared.expectedNormativeBindingCount,18);same(prepared.normativeSourceIds.q,c.baseline.normative_source_ids.q);
 return{scope:'PURE_NORMAL_RETAINED_REPRESENTATIVE_NOT_DB_OR_LOCKED',expectedBindings:18,oldRows:59,ownRows:38,unknownOccurrences:20,
  publishedScopeGuard:{kind:'EXISTING_SELECTED_CONTRACT',capturedHistoricalQ100Preserved:true,glassConfirmedQAbsent:true,
   legacyChoiceRetainsQ100:true,absentChoiceDoesNotReuseQ100:true,qOnlyPrimaryRejected:true,bothRootsSelectOwnPrimary:true,
   missingOwnAreaRemainsUnresolvedDespiteHistoricalBaseline:true,explicitLegacyQInGlassRejected:true,newRootRequiredWithoutCarryforward:true,
   pureEditorPrimaryIssue:{code:primaryIssue.code,parameterId:primaryIssue.parameterId},actualUi:'UNRUN'},
  coreMapping:{missingOwnArea:'missing-own-area-not-q100',submittedBothRoots:'legacy-q-in-glass-forbidden'},full:false};
}

export async function verifyMasonryGlassOpeningExistingR223(config:Config,sourceRoot:string){
 const pure=masonryGlassOpeningRetainedPureR223(config,sourceRoot);save('PURE_BEFORE_ALL_CORE_R223',pure);
 const c=masonryGlassOpeningCapturedR223(sourceRoot),parent=original(c),model=build(parent);
 let results=0,preliminaryResults=0,rejects=0;const observed:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>[]=[];
 for(const scenario of fixture.scenarios){
  calls++;process.stdout.write('MASONRY_R223_ACTUAL_CORE_ENTRY='+calls+';case='+scenario.key+'\n');
  let outcome:Awaited<ReturnType<typeof compileCanonicalEstimateCore>>;
  try{outcome=scenario.key==='original-legacy'
   ?await compileCanonicalEstimateCore({operation:'compile',compilerVersion:source.contract,catalogId,primaryMeasureParameterId:'q',
     parameterDefinitions:[...parent.parameters],formulaDefinitions:[...parent.formulas],resourceDefinitions:[...parent.resources],
     submittedParameters:{q:100},confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:59,hashJson:hashMasterSingleDefinitionSuccessorReceiptR1})
   :await compile(model,c.baseline,scenario.input);
   save('CORE_OUTCOME_'+String(calls).padStart(2,'0'),{case:scenario.key,kind:'RESULT',result:outcome});
  }catch(error:unknown){const code=record(error)?error.code:null;
   save('CORE_OUTCOME_'+String(calls).padStart(2,'0'),{case:scenario.key,kind:'REJECT',code,message:error instanceof Error?error.message:String(error)});
   assert.equal(scenario.expected,'REJECT');assert.equal(code,'PARAMETER_VALIDATION_FAILED');rejects++;continue;}
  assert.equal(scenario.expected,'RESULT');results++;observed.push(outcome);
  if(scenario.key==='missing-own-area-not-q100'){
   preliminaryResults++;
   // An actual core RESULT is explicitly incomplete, never a substitute area.
   const prefix='masonry:glass-block:krer:08-04-002-03';
   assert.equal(outcome.parameters[area],undefined);assert.equal(outcome.parameters.q,undefined);
   assert.equal(outcome.rows.length,0);assert.equal(outcome.preliminaryNeeds.length,19);
   assert(outcome.preliminaryNeeds.every(need=>need.row_id.startsWith(prefix+':')&&need.quantity===null
    &&need.unit_price===null&&!need.procurement_eligible));
   for(const key of ['whole-labour','glass-block','reinforcement','ready-cement-lime-m25']){
    const need=outcome.preliminaryNeeds.find(need=>need.row_id===prefix+':'+key);assert(need);
    assert(need.missing_parameter_ids.includes(area));assert(!need.missing_parameter_ids.includes('q'));
   }
   assert.equal(Number(outcome.totals.amount),0);assert.equal(outcome.totals.includedRowCount,0);
   assert.equal(outcome.totals.pricedRowCount,0);assert.deepEqual(outcome.priceSnapshotIds,[]);
   continue;
  }
  if(scenario.key==='original-legacy')continue;
  if(scenario.key==='composed-legacy'){
   const before=observed[0];assert(before);same(outcome.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.included_in_estimate,r.included_in_procurement]),
    before.rows.map(r=>[r.row_id,r.quantity,r.unit_id,r.included_in_estimate,r.included_in_procurement]));
   assert(![...outcome.rows,...outcome.preliminaryNeeds].some(r=>r.row_id.startsWith('masonry:glass-block:')));continue;}
  assert(scenario.normId);const prefix='masonry:glass-block:krer:'+scenario.normId;
  assert(outcome.rows.every(r=>r.row_id.startsWith(prefix+':')));assert.equal(outcome.rows.length,9);
  assert.equal(outcome.preliminaryNeeds.length,10);assert(outcome.preliminaryNeeds.every(r=>r.row_id.startsWith(prefix+':need:')&&r.quantity===null));
  assert.equal(outcome.parameters.q,undefined);assert.deepEqual(outcome.rows.filter(r=>r.included_in_estimate).map(r=>r.row_id),[prefix+':whole-labour']);
  const expectedRows=nativeOracle[scenario.normId];assert(expectedRows);
  for(const expected of expectedRows){
   const row=outcome.rows.find(r=>r.row_id===prefix+':'+expected[0]);assert(row);assert.equal(row.quantity,expected[1]);assert.equal(row.unit_id,expected[2]);}
  for(const key of ['whole-labour','ready-cement-lime-m25']){const row=outcome.rows.find(r=>r.row_id===prefix+':'+key);assert(row);
   const trace=row.calculation_trace;assert(record(trace)&&record(trace.resourceGraph));
   assert.deepEqual(canonicalEstimateOperationReferences(trace.resourceGraph.operationCompositionV1).map(r=>r.operationId).sort(),
    ['assemble','base-alignment'].map(key=>prefix+':operation:'+key).sort());}
  assert(outcome.rows.every(r=>!r.included_in_procurement&&r.unit_price===null));
 }
 assert.equal(calls,8);assert.equal(results,5);assert.equal(preliminaryResults,1);assert.equal(rejects,3);
 const final={status:'FINITE_EXISTING_OPENING_WHOLE03_04_NOT_DB_UI_OR_FULL',actualCoreEntries:calls,results,ordinaryResults:results-preliminaryResults,preliminaryResults,rejects,pure,
  realProjectObjects:0,closedUnknowns:0,actualNormalDb:'UNRUN',LOCKED:'UNRUN',workerSave:'UNRUN',full:false};save('FINAL_R223',final);return final;
}
