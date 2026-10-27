import ct54ActualQuantityPlan from '../../../data/estimate-benchmarks/source-packs/ct54-actual-project-quantity-plan-r1.json';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Client} from 'pg';
import {captureMasterScopedNormativeRegistryPreimageR1} from './masterScopedNormativeRegistryPreimageR1';
import {resolve} from 'node:path';
import {buildWallPaintReferenceProjectSystemS2735,withWallPaintCt54ActualQuantityPlanR1} from '../../../src/lib/estimate/v4/wallPaintConstructorS2735';
import reference from '../../../data/estimate-benchmarks/source-packs/ct54-manual-reference-project-system-r608.json';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {assembleMasterSingleDefinitionManagedRegistryCandidateR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {makeMasterDeferredProjectQuantityBasisR1} from './masterTypedPartialQuantityBasisR1';
type Json=Record<string,unknown>;
const method='ct54_reference_method';
const contract='ct54-reference-project-system-publication/s2735-r613-v1';
const ct54ReferencePhysicalEvidenceR619=[{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-27\\files-pasted-by-the-user-c\\work\\finishing\\expanded-finishing-family-master222\\ct54-reference-canonical-forward-r608\\PROJECT_SYSTEM_METHOD.md","kind":"PROJECT_SYSTEM","locatorKey":"ct54-manual-project-system-r608:method","byteSha256":"31f6a6651795aa722d845c3bff84255a8a34ce3170edf30356cd30c45eaa8640","bytes":3195},{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-27\\files-pasted-by-the-user-c\\work\\finishing\\expanded-finishing-family-master222\\ct54-reference-canonical-forward-r608\\after\\data\\estimate-benchmarks\\source-packs\\ct54-manual-reference-project-system-r608.json","kind":"SOURCE_OWNED_DECLARATION","locatorKey":"ct54-manual-project-system-r608:31-resources-70-reviews","byteSha256":"3c54b07a2f8f9565d210ec571611f219264e7594837d9efa7146e1ceca5dd92c","bytes":80249},{"path":"C:\\dev\\rik-expo-app-r4a5-dc4f0ce7\\.release-runtime\\r568\\s27-58\\ct54-mixer-gap-source\\CERESIT-CT-54-current-linked-en_GL.pdf","kind":"OFFICIAL_PRODUCT_TDS","locatorKey":"ceresit-ct54-en-gl-c_ct54_tds_1_0819:pp1-2","byteSha256":"7e595dd60379f4e1fdee47c69418cd755c4909d9a16a29b818533d41679ebfb0","bytes":406791},{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-26\\files-pasted-by-the-user-c\\work\\masonry\\ct54-two-primary-storch-byte-capture-r1\\captured\\STORCH_DURASTAR_6905_11393.pdf","kind":"OFFICIAL_TOOL_PDF","locatorKey":"storch-6905-11393:physical1-2","byteSha256":"3f67c249df8b4bd4c7b01495d29d27edadfaccd2ea0f01215b43afbe205d4660","bytes":411742},{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-26\\files-pasted-by-the-user-c\\work\\masonry\\ct54-two-primary-storch-byte-capture-r1\\captured\\STORCH_TRAY_6719_12151.pdf","kind":"OFFICIAL_TOOL_PDF","locatorKey":"storch-6719-12151:physical2","byteSha256":"1b2f40aa908d28497bf1b2f53d5360b1dc50d10c67a8a6a58a1c4bdade202807","bytes":303625},{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-26\\files-pasted-by-the-user-c\\work\\masonry\\finishing-ct54-manual-roller-source-only-r1\\revision04\\PRIMARY_COMPATIBILITY_OBSERVATIONS_CT54_MANUAL_POST_R2.json","kind":"RETAINED_OFFICIAL_HTML_OBSERVATIONS_NOT_PDF_BYTE_PROOF","locatorKey":"storch:cover140625-frame146525-8mm-html-observations","byteSha256":"b1b9a2a970b2bc49eb2698d89d5479aec06365025f37d7e0180a51f5d50eb564","bytes":4703}] as const;
export type Ct54ReferencePublicationContextR613=Readonly<{
  parentReleaseId:string;parentSearchReleaseId:string;currentReleasePath:string;outputRoot:string;
  selectedCurrentReleasePath:string;referencePointerMode:'PREPARED_NOT_ACTIVE_COPY';
  expectedBranch:string;masterPath:string;masterSha256:string;
  currentDefinitionVersionId:string;currentDefinitionSha256:string;approvedTemplateBaselineId:string;
  capturedParentPath:string;capturedParentByteSha256:string;expectedParentShape:readonly[number,number,number];
  quantityPlan?:'ACTUAL_PROJECT_PLAN_R1';
  actualReferenceReadback?:Readonly<{path:string;sha256:string}>;
  quantityTargetObservation?:Readonly<{path:string;sha256:string}>;
  // ROOT resolves the fresh target under existing normal/locked guards.
  verifyTargetPrecondition:NonNullable<MasterSingleDefinitionSuccessorConfig['verifyTargetPrecondition']>;
  verifyCore:MasterSingleDefinitionSuccessorConfig['verifyCore'];
  capturedScopedNormativeRegistry?:MasterSingleDefinitionSuccessorConfig['capturedScopedNormativeRegistry'];
}>;
/** Metadata-only binding of already authored counts; no formulas or values change. */
export function ct54ReferencePublicationModelR613(quantityPlan?:'ACTUAL_PROJECT_PLAN_R1'):AutomaticOwnerDefinition{
 const base=buildWallPaintReferenceProjectSystemS2735();
 const quantityIds=new Set(reference.resources.slice(1).map(r=>r.quantityParameterId));
 const byQuantity=new Map(reference.resources.map(r=>[r.quantityParameterId,r]));
 const ordinaryModel:AutomaticOwnerDefinition={...base,ordinaryParameterIds:base.ordinaryParameterIds.filter(id=>id!==method),
  parameters:base.parameters.map(p=>{
   const t=p.truth_metadata,guide={...(t.guide as Json),guide_version:reference.contract,
    source_document:reference.sourceId,source_snapshot_hash:reference.projectSystemDocumentSha256,
    source_locator:'ct54-manual-project-system-r608:method',
    applicability:'Проверка источника выбранного ручного метода для готовой минеральной стены; не подтверждение условий объекта или выполнения работ.',
    verified_at:'2026-10-27T08:19:33Z'};
   if(p.parameter_id===method)return {...p,required:false,default_value:null,truth_metadata:{...t,
    visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY',
    input_origin_class:'APPLICATION_METHOD_CONSTANT',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
    guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:'PROJECT_DOCUMENTATION'}}};
   const quantity=quantityIds.has(p.parameter_id),object=Object.hasOwn(reference.conditions,p.parameter_id);
   if(!quantity&&!object)return {...p,truth_metadata:{...t,guide}};
   const r=byQuantity.get(p.parameter_id),wholeCount=quantity&&(r?.unitId==='piece'||r?.unitId==='pair');
   return {...p,required:object,default_value:null,value_type:wholeCount?'integer':p.value_type,
    constraints_json:{...p.constraints_json,...(wholeCount?{min:1}:{})},
    truth_metadata:{...t,visibility_role:'USER_INPUT',value_source_role:quantity?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',
     input_origin_class:'KNOWN_PRIMARY_WORK_SCOPE',preliminary_compilation_allowed:quantity,
     provenance:{consumer_input_role_v1:quantity?'ADVANCED_OPTION':'OBJECT_FACT'},
     guide:{...guide,guide_kind:'PROJECT_DEFINED',source_role:'USER_SUPPLIED_OBJECT_FACT',guide_validation_policy:'MANDATORY_BLOCK',
      guide_short_ru:quantity?'Укажите фактическое необходимое количество; неизвестное остаётся нерассчитанным.':'Подтвердите только фактическое условие выбранного объекта; демонстрационный пример не является фактом старой сметы.'}}};
  })};
 return quantityPlan==='ACTUAL_PROJECT_PLAN_R1'?withWallPaintCt54ActualQuantityPlanR1(ordinaryModel):ordinaryModel;
}
export function prepareCt54ReferencePublicationR613(ctx:Ct54ReferencePublicationContextR613|null):MasterSingleDefinitionSuccessorConfig{
 if(!ctx||[ctx.parentReleaseId,ctx.parentSearchReleaseId,ctx.currentReleasePath,ctx.currentDefinitionVersionId,
  ctx.currentDefinitionSha256,ctx.approvedTemplateBaselineId,ctx.capturedParentPath,ctx.capturedParentByteSha256].some(v=>!v))
  throw Error('STOP_CT54_REFERENCE_FRESH_CURRENT_TUPLE_REQUIRED');
 if(ctx.referencePointerMode!=='PREPARED_NOT_ACTIVE_COPY'||!ctx.selectedCurrentReleasePath
  ||resolve(ctx.currentReleasePath).toLowerCase()===resolve(ctx.selectedCurrentReleasePath).toLowerCase())
  throw Error('STOP_CT54_REFERENCE_SELECTED_POINTER_MUST_BE_PRESERVED');
 if(ctx.actualReferenceReadback||ctx.quantityTargetObservation){
  if(ctx.quantityPlan!=='ACTUAL_PROJECT_PLAN_R1'||!ctx.actualReferenceReadback||!ctx.quantityTargetObservation)throw Error('STOP_CT54_MEASURED_REFERENCE_COMPLETE_CONTEXT_REQUIRED');
  assertCt54MeasuredCurrentContextR930({...ctx,quantityPlan:'ACTUAL_PROJECT_PLAN_R1',actualReferenceReadback:ctx.actualReferenceReadback,quantityTargetObservation:ctx.quantityTargetObservation});
 }
 const model=ctx.actualReferenceReadback?ct54MeasuredModelFromActualReferenceR930(ctx.actualReferenceReadback):ct54ReferencePublicationModelR613(ctx.quantityPlan),rows=model.resources;
 const actualPlan=ctx.quantityPlan==='ACTUAL_PROJECT_PLAN_R1';
 const sourceId=actualPlan?ct54ActualQuantityPlan.sourceId:reference.sourceId,methodValue=reference.conditions.ct54_reference_method;
 const acceptanceInput={area_m2:20,...reference.conditions}; // explicitly DEMO validation fixture, never defaults
 const sourcePaths=[...(ctx.actualReferenceReadback?[ctx.actualReferenceReadback.path]:[]),...(ctx.quantityTargetObservation?[ctx.quantityTargetObservation.path]:[]),...(actualPlan?['data/estimate-benchmarks/source-packs/ct54-actual-project-quantity-plan-r1.json',ct54ActualQuantityPlan.sourceDocumentPath]:[]),'src/lib/estimate/v4/wallPaintConstructorS2735.ts',
  'data/estimate-benchmarks/source-packs/ct54-manual-reference-project-system-r608.json',
  'scripts/estimate/r4a13/prepareCt54ReferencePublicationR613.ts','scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.ts',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts'];
 const config:MasterSingleDefinitionSuccessorConfig={contract,stopCode:'CT54_REFERENCE_PROJECT_SYSTEM',applicationName:'CT54 source reference',
  expectedBranch:ctx.expectedBranch,masterPath:ctx.masterPath,masterSha256:ctx.masterSha256,
  parentReleaseId:ctx.parentReleaseId,parentSearchReleaseId:ctx.parentSearchReleaseId,currentReleasePath:ctx.currentReleasePath,outputRoot:ctx.outputRoot,
  sourcePaths,catalogId:'canonical-work:base:plaster_paint_interior_paint_wall_paint_standard',sourceId,normId:actualPlan?'PROJECT_SYSTEM:CT54_ACTUAL_QUANTITY_PLAN_R1':'PROJECT_SYSTEM:CT54_READY_GROUND_MANUAL_R608',
  sourceMetadata:{source_title:'Ручная окраска готовой минеральной стены',source_authority:actualPlan?'Документированные физические измерители/распределение фактического плана + retainedCT54norm; no realobjectclaim':'Авторский PROJECT_SYSTEM + adopted CT54 TDS; DEMO interfaces only',
   source_kind:'PROJECT_SYSTEM',artifact_sha256:actualPlan?ct54ActualQuantityPlan.sourceDocumentSha256:reference.projectSystemDocumentSha256,official_url:null,
   exact_locator:actualPlan?ct54ActualQuantityPlan.sourceDocumentPath:'PROJECT_SYSTEM_METHOD.md; CT54 C_CT54_TDS_1_0819 pp1–2; retained STORCH cover/frame/tray evidence',
   use_restriction:'Только явно выбранные условия reference; не автоматически применимо к старой смете, акриловой краске или реальному неподтверждённому объекту.'},
  ...(ctx.capturedScopedNormativeRegistry===undefined?{}:{capturedScopedNormativeRegistry:ctx.capturedScopedNormativeRegistry}),
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:rows,
  shortInput:acceptanceInput,acceptanceInput,runtimeProfileInput:{[method]:methodValue},runtimeProfileClassification:{[method]:'RUNTIME_STRUCTURAL_DEFAULT'},
  runtimeProfileSourceIds:{[method]:[sourceId]},
  verifyCore:async()=>{const before=verifyCt54ReferencePhysicalEvidenceR619(ctx.quantityPlan);const result=await ctx.verifyCore();
    const after=verifyCt54ReferencePhysicalEvidenceR619(ctx.quantityPlan);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('STOP_CT54_REFERENCE_DOCUMENT_DRIFT');
    return {...result,ct54ReferencePhysicalSourcePins:after};},
  verifyTargetPrecondition:async(client,phase)=>{const before=verifyCt54ReferencePhysicalEvidenceR619(ctx.quantityPlan);await ctx.verifyTargetPrecondition(client,phase);
    const after=verifyCt54ReferencePhysicalEvidenceR619(ctx.quantityPlan);if(JSON.stringify(before)!==JSON.stringify(after))throw Error('STOP_CT54_REFERENCE_DOCUMENT_DRIFT');},
  expectedParentShape:ctx.expectedParentShape,
  benchmarkOrdinal:1,validationScenario:'EXPLICIT_DEMO_CT54_REFERENCE_COMPOSITION_WITH_30_DEFERRED_PROJECT_QUANTITIES',
  passport:{canonicalRuName:'Окраска внутренних стен',workKey:'plaster_paint_interior_paint_wall_paint_standard',
   physicalResultRu:'Готовая минеральная стена окрашена вручную в два слоя.',
   includedScopeRu:['7 конкретных операций,31 ресурс,70 проверок классов PROJECT_SYSTEM.',actualPlan?'27количеств производны от19физических/организационных измерителей;3прямых количества и8документальныхtrace остаются фактическими входами безdefault.':'Все количества оснащения, воды, энергии и труда остаются нерассчитанными до фактического ввода.'],
   excludedScopeRu:['Новая подготовка основания,ремонт,грунтование,распыление,работа на высоте.','Подача на объект/этаж и окончательная внешняя обработка отходов — заданные интерфейсы.'],
   independentCompletenessMap:reference.independentComposition},
  applicability:{referenceProjectSystem:reference.contract,demoOnly:true,activationAllowed:false,productionEligible:false,fullTechnicalAcceptance:false,
   captureAnchor:{definitionVersionId:ctx.currentDefinitionVersionId,definitionSha256:ctx.currentDefinitionSha256,approvedTemplateBaselineId:ctx.approvedTemplateBaselineId,
    path:ctx.capturedParentPath,byteSha256:ctx.capturedParentByteSha256}},
  binding:{rowId:rows[0]!.row_id,additionalRowIds:rows.slice(1).map(r=>r.row_id),
   ordinaryCompositeSourceV1:{contract:'master-ordinary-composite-source/v1',capturedSourcePreimage:{sourceKey:sourceId,expected:null}},
   applicability:{projectSystem:reference.contract,quantityNormAdded:false,countsAreDeferredObjectFacts:true,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(rows.map(r=>[r.row_id,{sourceRole:'SOURCE_REVIEWED_COMPOSITION_NOT_ADMITTED_NEW_NORM',fullTechnicalAcceptance:false}]))},
  locator:{key:actualPlan?'ct54-actual-project-quantity-plan-r1:31-resources-27-derived-rules:v1':'ct54-manual-reference-project-system-r608:31-resources-70-class-reviews:v1',payload:{
   contract:reference.contract,projectSystemDocumentSha256:reference.projectSystemDocumentSha256,
   sourceOwnedResourceRoster:reference.resources,independentCompletenessMap:reference.independentComposition,
   ...(actualPlan?{actualProjectQuantityRules:ct54ActualQuantityPlan,actualQuantityClaims:false}:{}),
   conditions:reference.conditions,conditionTitlesRu:reference.conditionTitlesRu,
   sourceEvidence:[...ct54ReferencePhysicalEvidenceR619,...(actualPlan?[{path:resolve(__dirname,'../../..',ct54ActualQuantityPlan.sourceDocumentPath),kind:'PROJECT_QUANTITY_RULES',locatorKey:ct54ActualQuantityPlan.contract,byteSha256:ct54ActualQuantityPlan.sourceDocumentSha256,bytes:ct54ActualQuantityPlan.sourceDocumentBytes}]:[])],
   demoOnly:true,sourceAdmissionGranted:false}},
  search:{primaryUom:'m2',canonicalNameRu:'Окраска внутренних стен',aliases:['Окраска внутренних стен'],shortScopeRu:'Ручная окраска готовой минеральной стены по явно выбранному проектному методу.',
   keyDistinguishingParameters:[method],clarificationFields:Object.keys(reference.conditions).filter(id=>id!==method),
   includedBoundaries:['Ручной валик и кисть,с земли,готовая совместимая стена'],excludedBoundaries:['Автоматический перенос DEMO в реальный объект'],
   extraSearchTermsRu:'окраска стены вручную минеральная силикатная краска',sourceProvenance:{projectSystem:reference.contract,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/CE40/iu,/M150/iu,/CT126/iu],owner:'finishing-ct54-reference-project-system',receiptFileStem:'ct54_reference_project_system'};
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 const source=candidate.newSource,locator=candidate.newLocators[0]!;
 const partialQuantityBasis=makeMasterDeferredProjectQuantityBasisR1({parameters:model.parameters,formulas:model.formulas,resources:model.resources,
  parameterIds:actualPlan?[...ct54ActualQuantityPlan.parameters.filter(p=>p.valueType!=='text').map(p=>p.id),...ct54ActualQuantityPlan.rules.filter(r=>r.after==='DIRECT_MANUAL_UNCHANGED').map(r=>r.quantityParameterId)]:reference.resources.slice(1).map(r=>r.quantityParameterId),
  source:{sourceId:source.id,sourceKey:source.source_key,artifactSha256:String(source.artifact_sha256),locatorId:locator.id,
   locatorExcerptSha256:locator.excerpt_sha256,locatorPayload:locator.locator},
  method:{parameterId:method,value:methodValue,version:reference.contract}});
 return {...config,passport:{...config.passport,partialQuantityBasis}};
}

/** ROOT calls this before/after its governed prepare/apply. Local pinned files,
 * not a self-described locator, establish the source byte witness. No DB IO. */
export function verifyCt54ReferencePhysicalEvidenceR619(quantityPlan?:'ACTUAL_PROJECT_PLAN_R1'){
 let total=0;
 const pins=[...ct54ReferencePhysicalEvidenceR619,...(quantityPlan==='ACTUAL_PROJECT_PLAN_R1'?[{path:resolve(__dirname,'../../..',ct54ActualQuantityPlan.sourceDocumentPath),kind:'PROJECT_QUANTITY_RULES',locatorKey:ct54ActualQuantityPlan.contract,byteSha256:ct54ActualQuantityPlan.sourceDocumentSha256,bytes:ct54ActualQuantityPlan.sourceDocumentBytes}]:[])];
 return pins.map(pin=>{
  if(pin.bytes<=0||pin.bytes>2*1024*1024)throw Error('STOP_CT54_REFERENCE_DOCUMENT_ROW_CAP');
  const before=statSync(pin.path);total+=before.size;
  if(!before.isFile()||before.size!==pin.bytes||before.size>2*1024*1024||total>3*1024*1024)
    throw Error('STOP_CT54_REFERENCE_DOCUMENT_ACTUAL_CAP:'+pin.locatorKey);
  const bytes=readFileSync(pin.path),after=statSync(pin.path);
  if(bytes.length!==pin.bytes||after.size!==before.size||after.mtimeMs!==before.mtimeMs||createHash('sha256').update(bytes).digest('hex')!==pin.byteSha256)
    throw Error('STOP_CT54_REFERENCE_DOCUMENT_BYTE_PIN:'+pin.locatorKey);
  return {path:pin.path,byteSha256:pin.byteSha256,bytes:bytes.length};
 });
}
const ct54CurrentReadPinsR619={"COMPLETE_ORDINARY_WHOLE_REPLACEMENT_INPUT_RECEIPT.json":{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-27\\files-pasted-by-the-user-c\\work\\current-ordinary-ct54-read-r619\\actual-readset\\COMPLETE_ORDINARY_WHOLE_REPLACEMENT_INPUT_RECEIPT.json","sha256":"bfd654e830a06014b40380ea9012e75b8f2115a5ef66dba045eb93661fce07e5"},"CURRENT_WHOLE_REPLACEMENT_TARGET_1.json":{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-27\\files-pasted-by-the-user-c\\work\\current-ordinary-ct54-read-r619\\actual-readset\\CURRENT_WHOLE_REPLACEMENT_TARGET_1.json","sha256":"0b0f18e651eccf1cb01d39c2a8d11a9c4ee308b1ea4d67e204ce81b1e916dff5"},"EXACT_NEW_SOURCE_REGISTRY_SCOPE.json":{"path":"C:\\Users\\User\\Documents\\Codex\\2026-10-27\\files-pasted-by-the-user-c\\work\\current-ordinary-ct54-read-r619\\actual-readset\\EXACT_NEW_SOURCE_REGISTRY_SCOPE.json","sha256":"9cf0a7f3d97d17e927ddb7582c0147676590d9cdac880bd18e8bfd1907be746e"}} as const;
type Ct54ReadTargetR619=Readonly<{catalogId:string;selectedReleaseId:string;selectedSearchReleaseId:string;
 membership:Readonly<{definition_version_id:string;approved_template_baseline_id:string}>;
 definition:Readonly<{id:string;definition_sha256:string;definition_version:number}>;
 shape:readonly[number,number,number];retainedParentCapture:boolean;actualComputationSha256:null}>;
function readPinnedCt54JsonR619<T>(pin:Readonly<{path:string;sha256:string}>):T{
 const bytes=readFileSync(pin.path);if(createHash('sha256').update(bytes).digest('hex')!==pin.sha256)
  throw Error('STOP_CT54_R619_CURRENT_PIN:'+pin.path);
 return JSON.parse(bytes.toString('utf8')) as T;
}
function ct54CurrentR619(){
 const pins=ct54CurrentReadPinsR619;
 const receipt=readPinnedCt54JsonR619<Readonly<{status:string;readOnly:boolean;transactionRolledBack:boolean;databaseWrites:number;
  definitionReleaseId:string;searchReleaseId:string;pointerBeforeSha256:string;pointerAfterSha256:string;
  results:readonly Readonly<{catalogId:string;metadataProjection:Readonly<{sha256:string}>}>[]}>>(pins['COMPLETE_ORDINARY_WHOLE_REPLACEMENT_INPUT_RECEIPT.json']);
 const target=readPinnedCt54JsonR619<Ct54ReadTargetR619>(pins['CURRENT_WHOLE_REPLACEMENT_TARGET_1.json']);
 const scope=readPinnedCt54JsonR619<Readonly<{exactSourceKey:string;exactLocatorKey:string;sourceCount:number;locatorCount:number;
  exactKeyAbsenceOnly:boolean;formalRegistryAdmission:boolean}>>(pins['EXACT_NEW_SOURCE_REGISTRY_SCOPE.json']);
 if(receipt.status!=='PASS_READONLY_ORDINARY_WHOLE_REPLACEMENT_INPUT_NOT_ADMISSION'||!receipt.readOnly||!receipt.transactionRolledBack||receipt.databaseWrites!==0
  ||receipt.results.length!==1||receipt.results[0]!.metadataProjection.sha256!==pins['CURRENT_WHOLE_REPLACEMENT_TARGET_1.json'].sha256
  ||target.catalogId!=='canonical-work:base:plaster_paint_interior_paint_wall_paint_standard'||target.retainedParentCapture!==false||target.actualComputationSha256!==null
  ||target.selectedReleaseId!==receipt.definitionReleaseId||target.selectedSearchReleaseId!==receipt.searchReleaseId
  ||target.membership.definition_version_id!==target.definition.id||scope.exactSourceKey!==reference.sourceId
  ||scope.exactLocatorKey!=='ct54-manual-reference-project-system-r608:31-resources-70-class-reviews:v1'
  ||scope.sourceCount!==0||scope.locatorCount!==0||scope.exactKeyAbsenceOnly!==true||scope.formalRegistryAdmission!==false)
  throw Error('STOP_CT54_R619_CURRENT_HEADER_BINDING');
 const selectedPointer="C:\\dev\\rik-expo-app-r4a5-dc4f0ce7\\data\\estimate-benchmarks\\r568-local-developer-canonical-release.json";
 if(receipt.pointerBeforeSha256!==receipt.pointerAfterSha256
  ||createHash('sha256').update(readFileSync(selectedPointer)).digest('hex')!==receipt.pointerAfterSha256)
  throw Error('STOP_CT54_R619_SELECTED_POINTER_DRIFT');
 return {target,selectedPointer};
}
type Ct54R619RootContext=Omit<Ct54ReferencePublicationContextR613,'parentReleaseId'|'parentSearchReleaseId'|'currentDefinitionVersionId'
 |'currentDefinitionSha256'|'approvedTemplateBaselineId'|'capturedParentPath'|'capturedParentByteSha256'|'expectedParentShape'|'selectedCurrentReleasePath'>;
/** Fresh actual R619 headers, not a fabricated retained full-parent capture. */
export function prepareCt54ReferencePublicationFromReadR619(root:Ct54R619RootContext|Ct54ReferencePublicationContextR613){
 if('currentDefinitionVersionId' in root)return prepareCt54ReferencePublicationR613(root);
 if(root.quantityPlan==='ACTUAL_PROJECT_PLAN_R1')throw Error('STOP_CT54_QUANTITY_PLAN_FRESH_COMPLETE_CONTEXT_REQUIRED');
 const {target,selectedPointer}=ct54CurrentR619();
 return prepareCt54ReferencePublicationR613({...root,parentReleaseId:target.selectedReleaseId,parentSearchReleaseId:target.selectedSearchReleaseId,
  currentDefinitionVersionId:target.definition.id,currentDefinitionSha256:target.definition.definition_sha256,
  approvedTemplateBaselineId:target.membership.approved_template_baseline_id,selectedCurrentReleasePath:selectedPointer,
  capturedParentPath:ct54CurrentReadPinsR619['CURRENT_WHOLE_REPLACEMENT_TARGET_1.json'].path,
  capturedParentByteSha256:ct54CurrentReadPinsR619['CURRENT_WHOLE_REPLACEMENT_TARGET_1.json'].sha256,expectedParentShape:target.shape});
}
/** Materialization only on ROOT's existing dedicated RRRO client. This function
 * starts no connection/transaction, writes no SQL, creates no passport and adds
 * no capture algorithm. Existing helper enforces RO/isolation/raw caps/closure. */
export type Ct54ReviewedCapturePinsR619=Readonly<{
 expectedSourcePins:Readonly<Record<string,string>>;
 expectedReferencePointerSha256:string;
 expectedSelectedPointerSha256?:string;
}>;
/** Expected hashes come from ROOT's reviewed frozen candidate, never from this reader. */
function verifyCt54CaptureSourcePinsR619(config:MasterSingleDefinitionSuccessorConfig,pins:Ct54ReviewedCapturePinsR619,selectedCurrentReleasePath?:string){
 const paths=config.sourcePaths,keys=Object.keys(pins.expectedSourcePins).sort();
 if(JSON.stringify(keys)!==JSON.stringify([...paths].sort())||!/^([a-f0-9]{64})$/.test(pins.expectedReferencePointerSha256))
  throw Error('STOP_CT54_REVIEWED_SOURCE_PIN_CLOSURE');
 let total=0;
 const check=(path:string,expected:string)=>{
  if(!/^[a-f0-9]{64}$/.test(expected))throw Error('STOP_CT54_REVIEWED_SOURCE_HASH_REQUIRED');
  const before=statSync(path);total+=before.size;
  if(!before.isFile()||before.size<=0||before.size>2*1024*1024||total>8*1024*1024)throw Error('STOP_CT54_CAPTURE_SOURCE_CAP');
  const bytes=readFileSync(path),after=statSync(path);
  if(bytes.length!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs
   ||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('STOP_CT54_CAPTURE_SOURCE_DRIFT:'+path);
 };
 for(const path of paths)check(resolve(__dirname,'../../..',path),pins.expectedSourcePins[path]!);
 check(config.currentReleasePath,pins.expectedReferencePointerSha256);
 if(selectedCurrentReleasePath){
  if(!pins.expectedSelectedPointerSha256)throw Error('STOP_CT54_FRESH_SELECTED_POINTER_PIN_REQUIRED');
  check(selectedCurrentReleasePath,pins.expectedSelectedPointerSha256);
 }
}
/** A complete ROOT-supplied context uses the same materializer with fresh
 * parent/selected guards. Legacy calls keep their original R619 path. Neither
 * a source-key absence nor a historical callback is fresh source admission. */
export async function captureCt54ReferenceFormalRegistryR619(client:Pick<Client,'query'>,
 root:Ct54R619RootContext|Ct54ReferencePublicationContextR613,pins:Ct54ReviewedCapturePinsR619){
 if(Object.hasOwn(root,'capturedScopedNormativeRegistry'))throw Error('STOP_CT54_FORMAL_CAPTURE_MUST_NOT_REPLACE_DECLARATION');
 const fresh='currentDefinitionVersionId' in root?root:undefined;
 if(root.quantityPlan==='ACTUAL_PROJECT_PLAN_R1'&&!fresh)throw Error('STOP_CT54_QUANTITY_PLAN_FRESH_COMPLETE_CONTEXT_REQUIRED');
 const before=verifyCt54ReferencePhysicalEvidenceR619(root.quantityPlan),config=fresh
  ?prepareCt54ReferencePublicationR613(fresh):prepareCt54ReferencePublicationFromReadR619(root);
 const check=()=>verifyCt54CaptureSourcePinsR619(config,pins,fresh?.selectedCurrentReleasePath);
 check();
 const candidate=assembleMasterSingleDefinitionManagedRegistryCandidateR1(config,{projectSourcePackage:null,projectSourcePackageSet:null}).retentionCandidate;
 await config.verifyTargetPrecondition!(client,'PREFLIGHT');
 const capturedScopedNormativeRegistry=await captureMasterScopedNormativeRegistryPreimageR1(client,candidate);
 await config.verifyTargetPrecondition!(client,'PREFLIGHT');
 const after=verifyCt54ReferencePhysicalEvidenceR619(root.quantityPlan);if(!fresh)ct54CurrentR619();check();
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('STOP_CT54_REFERENCE_DOCUMENT_DRIFT');
 return {contract:'ct54-reference-formal-registry-materialization/r619',capturedScopedNormativeRegistry,
  managedSource:candidate.newSource,managedLocators:candidate.newLocators,physicalDocumentPins:after,
  ...(fresh?{freshParentBinding:{parentReleaseId:fresh.parentReleaseId,
    currentDefinitionVersionId:fresh.currentDefinitionVersionId,currentDefinitionSha256:fresh.currentDefinitionSha256,
    approvedTemplateBaselineId:fresh.approvedTemplateBaselineId,expectedParentShape:fresh.expectedParentShape,
    capturedParentPath:fresh.capturedParentPath,capturedParentByteSha256:fresh.capturedParentByteSha256,
    selectedCurrentReleasePath:fresh.selectedCurrentReleasePath,
    expectedSelectedPointerSha256:pins.expectedSelectedPointerSha256,
    expectedReferencePointerSha256:pins.expectedReferencePointerSha256,quantityPlan:fresh.quantityPlan}}:{}),
  aggregateRawScopeCapBytes:3145728,sourceAdmissionGranted:false,definitionPublished:false};
}

export type Ct54MeasuredReferencePinR930=Readonly<{path:string;sha256:string}>;
type Ct54ActualReferenceR930=Readonly<{
 contract:string;originProof:Readonly<{sha256:string;resultIndex:number;bodySide:string}>;
 referenceReleaseId:string;selectedReleaseId:string;referenceHeader:Readonly<{definition_version_id:string;approved_template_baseline_id:string;definition_version:number;definition_sha256:string}>;
 body:Readonly<{parameters:AutomaticOwnerDefinition['parameters'];formulas:AutomaticOwnerDefinition['formulas'];resources:AutomaticOwnerDefinition['resources'];bindings:readonly Json[];sources:readonly Json[];locators:readonly Json[]}>;
 formalRegistryCapture:false;
}>;
function ct54ActualReferenceReadbackR930(pin:Ct54MeasuredReferencePinR930):Ct54ActualReferenceR930{
 if(pin.sha256!=='e4f8534c4ba883d8d0e4414e0fe6a3bd389a29a6997d675825af303bd9db634c')throw Error('STOP_CT54_ACTUAL_R930_REFERENCE_BYTE_PIN_REQUIRED');
 // A specific typed view only AFTER the complete raw/parsed ROOT-origin fixture
 // byte digest is fixed; it is neither a request payload nor a fabricated capture.
 const actual=readPinnedCt54JsonR619<Ct54ActualReferenceR930>(pin),h=actual.referenceHeader;
 if(actual.contract!=='ACTUAL_R930_CT54_USER_REFERENCE_READBACK_NOT_FORMAL_CAPTURE'
  ||actual.originProof.sha256!=='bbb852c6045067e6b5484e386dacb6115c5ad5cd6bc30a971745dac18ecf746d'
  ||actual.originProof.resultIndex!==0||actual.originProof.bodySide!=='referenceBody'||actual.formalRegistryCapture!==false
  ||actual.referenceReleaseId!=='514af229-9dbd-5c45-9383-6d21fe2b9f21'||actual.selectedReleaseId===actual.referenceReleaseId
  ||h.definition_version_id!=='0a31889f-6085-550b-9c74-dbbbc7cb9555'||h.approved_template_baseline_id!=='2348f432-87d8-5058-8f65-a2539cba7b32'
  ||h.definition_version!==10||h.definition_sha256!=='696c0a974e9e16b82862ef76eba4b44913a0b2c45dff0cef711a9168f635d58b'
  ||actual.body.parameters.length!==39||actual.body.formulas.length!==31||actual.body.resources.length!==31||actual.body.bindings.length!==31
  ||actual.body.locators.length!==1||actual.body.sources.length!==1)throw Error('STOP_CT54_ACTUAL_REFERENCE_NOT_SELECTED_VGT_REQUIRED');
 return actual;
}
/** The same27 existing formula rules, now applied to the exact published user
 * reference body. No oldselected VGT graph or baseline values cross this path. */
export function ct54MeasuredModelFromActualReferenceR930(pin:Ct54MeasuredReferencePinR930):AutomaticOwnerDefinition{
 const a=ct54ActualReferenceReadbackR930(pin),base:AutomaticOwnerDefinition={parameters:a.body.parameters,formulas:a.body.formulas,resources:a.body.resources,
  runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['area_m2',...Object.keys(reference.conditions).filter(id=>id!==method)]};
 return withWallPaintCt54ActualQuantityPlanR1(base);
}
export type Ct54MeasuredCurrentContextR930=Ct54ReferencePublicationContextR613&Readonly<{
 quantityPlan:'ACTUAL_PROJECT_PLAN_R1';actualReferenceReadback:Ct54MeasuredReferencePinR930;quantityTargetObservation:Ct54MeasuredReferencePinR930;
}>;
/** A finite explicit context through the EXISTING producer/materializer. The
 * requested-key absence remains an observation; normal scoped capture is still
 * required by ordinaryCompositeSourceV1 and the typed/publication contracts. */
function assertCt54MeasuredCurrentContextR930(ctx:Ct54MeasuredCurrentContextR930):void{
 const actual=ct54ActualReferenceReadbackR930(ctx.actualReferenceReadback),h=actual.referenceHeader;
 if(ctx.quantityPlan!=='ACTUAL_PROJECT_PLAN_R1'||ctx.parentReleaseId!==actual.referenceReleaseId
  ||ctx.currentDefinitionVersionId!==h.definition_version_id||ctx.currentDefinitionSha256!==h.definition_sha256
  ||ctx.approvedTemplateBaselineId!==h.approved_template_baseline_id||JSON.stringify(ctx.expectedParentShape)!=='[39,31,31]'
  ||resolve(ctx.capturedParentPath)!==resolve(ctx.actualReferenceReadback.path)||ctx.capturedParentByteSha256!==ctx.actualReferenceReadback.sha256)
  throw Error('STOP_CT54_CURRENT_REFERENCE_PARENT_CONTEXT_REQUIRED');
 const targetPin=ctx.quantityTargetObservation;
 if(targetPin.sha256!=='8d3c3c7a8f65734c8173890f2d993193ae26822c7849839130a515d68f2e3c27')throw Error('STOP_CT54_FRESH_R934_QUANTITY_SOURCE_OBSERVATION_REQUIRED');
 const observed=readPinnedCt54JsonR619<Readonly<{referenceReleaseId:string;selectedReleaseId:string;newSourceAbsentBoth:boolean;
  referenceTarget:Readonly<{catalogId:string;sourceId:string;header:typeof h;sets:Readonly<{newSource:Readonly<{rowCount:number}>}>}>}>>(targetPin);
 if(observed.referenceReleaseId!==actual.referenceReleaseId||observed.selectedReleaseId!==actual.selectedReleaseId||!observed.newSourceAbsentBoth
  ||observed.referenceTarget.catalogId!=='canonical-work:base:plaster_paint_interior_paint_wall_paint_standard'
  ||observed.referenceTarget.sourceId!==ct54ActualQuantityPlan.sourceId
  ||observed.referenceTarget.header.definition_version_id!==h.definition_version_id||observed.referenceTarget.header.definition_sha256!==h.definition_sha256
  ||observed.referenceTarget.header.approved_template_baseline_id!==h.approved_template_baseline_id||observed.referenceTarget.header.definition_version!==h.definition_version
  ||observed.referenceTarget.sets.newSource.rowCount!==0)throw Error('STOP_CT54_R934_REFERENCE_NEW_QUANTITY_SOURCE_CONTEXT_REQUIRED');
}
export function prepareCt54MeasuredCurrentReferenceR930(ctx:Ct54MeasuredCurrentContextR930):MasterSingleDefinitionSuccessorConfig{
 return prepareCt54ReferencePublicationR613(ctx);
}

