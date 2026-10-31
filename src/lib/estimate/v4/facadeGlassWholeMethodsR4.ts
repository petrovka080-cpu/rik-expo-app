import source from '../../../../data/estimate-benchmarks/source-packs/facade-glass-whole-existing-owner-r4.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
type J=Record<string,any>;
export type FacadeGlassWholeMethodKeyR4='stick'|'structural'|'semi-structural'|'unitized'|'point-fixed';
export const facadeGlassWholePrimaryR4='glass_facade_area_m2';
export const facadeGlassWholeOwnerR4='canonical-work:expanded:curtain_wall_system';
export const facadeGlassWholePackR4=(key:FacadeGlassWholeMethodKeyR4):J=>source.profiles.find(p=>p.key===key)??(()=>{throw Error('FACADE_GLASS_EXACT_SOURCE_METHOD_REQUIRED');})();
export const facadeGlassWholeBomParameterR4=(key:string)=>'glass_bom_'+key.replaceAll('-','_');
export const facadeGlassWholeNormParameterR4=(key:string)=>'glass_unknown_'+key.replaceAll('-','_');
const facts=['glass_exact_method','glass_exact_source_fit','glass_territorial_design','glass_glass_frame_passports','glass_approved_BOM','glass_lifting_PPR','glass_scope_conditions'] as const;
const scope=(key:FacadeGlassWholeMethodKeyR4)=>key==='point-fixed'?'ПЛОСКОЕ_ОДИНОЧНОЕ_СТЕКЛО_ИСХОДНОЕ_КРЕПЛЕНИЕ_С_ДВУМЯ_КОЛЬЦАМИ_ПОМЕЩЕНИЕ_ДОПУСКАЕТ_ИНФИЛЬТРАЦИЮ':key==='unitized'?'ГОТОВЫЙ_ИСХОДНЫЙ_ЗАВОДСКОЙ_МОДУЛЬ_БЕЗ_ПОВТОРНОЙ_ОПЛАТЫ_ИЗГОТОВЛЕНИЯ':'ИСХОДНЫЙ_ЦЕЛЫЙ_МЕТОД_ПРОЕКТ_И_МАТЕРИАЛЫ_ПРИНЯТЫ_ЗАМЕНЫ_НЕ_ПЕРЕНЕСЕНЫ';
const needOps:Record<string,readonly string[]>={
 'whole-labour':['design-base','receive-store','frame','prepare','glazing','seal','nodes','control','cleanup'],
 'cut-drill-driver-post':['prepare','frame','glazing','nodes'],'glass-handling-post':['receive-store','glazing'],'primary-rigging':['receive-store','glazing'],'crane-operation':['receive-store','glazing'],'access-PPE':['frame','prepare','glazing','seal','nodes','control','cleanup'],'power':['prepare','frame','glazing','seal','control'],'working-parts':['prepare','frame','nodes'],'surface-prep':['prepare','glazing','seal'],'weather-sealant':['seal','nodes'],'measurement-torque-tools':['frame','glazing','control'],'quality-services':['design-base','receive-store','frame','glazing','control'],'delivery-store-feed':['receive-store','glazing'],'cleanup-waste':['prepare','seal','cleanup'],'fire-nodes':['nodes'],'structural-adhesive':['glazing','seal','control'],'retainer-period-owner':['glazing','seal','control'],'point-system-project-fit':['design-base','frame','glazing','control'],
};
function operationsFor(p:J,kind:string,key:string):J[]{
 if(kind==='scope')return p.operations;
 const own=kind==='need'?(needOps[key]??['receive-store','glazing','control']):['receive-store',...(kind==='bom'&&key!=='factory-modules'&&p.key!=='unitized'?['prepare']:[]),p.bom.find((r:J)=>r.key===key)?.operation??'glazing','control'];
 return[...new Set(own)].map(k=>p.operations.find((o:J)=>o.key===k)).filter(Boolean);
}

/** Whole physical methods on the EXISTING construction-owner/compiler.
 * Structural/component quantities are actual approved design BOM, never old
 * area multipliers. All incomplete application norms remain protected needs.
 * This module neither publishes nor adds a catalog or assumes KG admission. */
export function facadeGlassWholeDefinitionR4(key:FacadeGlassWholeMethodKeyR4):AutomaticOwnerDefinition{
 const p=facadeGlassWholePackR4(key),rid=(s:string)=>p.prefix+':'+s,primary=facadeGlassWholePrimaryR4,positive={kind:'greater_than' as const,parameterId:primary,value:0};
 if(source.existingOwnerAnchor!==facadeGlassWholeOwnerR4||source.existingParentCaptureSha256!=='38d9fccbf92673c03d9a388d93f6d637cf5191ddb654a4a4f31d3ead20977023'||source.profiles.length!==5)throw Error('FACADE_GLASS_EXACT_OWNER_AND_SOURCE_CAPTURE_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[
  {id:facts[0],title:'Точный согласованный метод стеклянного фасада',unitId:null,valueType:'enum',kind:'conditional',values:[p.titleRu],requiredWhen:positive},
  ...facts.slice(1,6).map(id=>({id,title:({glass_exact_source_fit:'Принятая совместимость исходной системы, креплений и заполнения',glass_territorial_design:'Фактический принятый проект и условия территории',glass_glass_frame_passports:'Паспорта фактического стекла, каркаса, креплений и герметиков',glass_approved_BOM:'Принятая поэлементная ведомость фасада, узлов и креплений',glass_lifting_PPR:'Фактический ППР подачи, подъёма, доступа и монтажного звена'} as Record<string,string>)[id]!,unitId:null,valueType:'text' as const,kind:'conditional' as const,requiredWhen:positive})),
  {id:facts[6],title:'Фактические границы исходного метода',unitId:null,valueType:'enum',kind:'conditional',values:[scope(key)],requiredWhen:positive},
  ...p.bom.map((b:J)=>({id:facadeGlassWholeBomParameterR4(b.key),title:'По принятой ведомости: '+b.titleRu,unitId:b.unitId,valueType:b.unitId==='piece'?'integer' as const:'decimal' as const,kind:'conditional' as const,min:b.unitId==='piece'&&b.positiveRequired?1:0,requiredWhen:positive})),
  ...p.needs.map((n:J)=>({id:facadeGlassWholeNormParameterR4(n.key),title:n.titleRu,unitId:null,valueType:'decimal' as const,kind:'internal' as const,min:0})),
 ];
 const row=(s:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({rowId:rid(s),formulaId:rid('formula:'+s),section:p.titleRu,title,category,unitId,expression,inclusion:positive,inputParameterIds:[...facts],procurement:false,costTreatment:'INFORMATIONAL_SCOPE',...extra});
 const rows:AutomaticRowSpec[]=[
  row('scope:whole',p.titleRu,'work','m2',primary),
  ...p.bom.map((b:J)=>row('bom:'+b.key,b.titleRu,b.informationalStockOnly?'equipment':'material',b.unitId,facadeGlassWholeBomParameterR4(b.key),b.informationalStockOnly?{}:{costTreatment:'OWN_COST',procurement:true})),
  ...p.derivedSourceRows.map((b:J)=>row('source:'+b.key,b.titleRu,'material',b.unitId,facadeGlassWholeBomParameterR4(b.sourceInputKey)+'*'+b.sourceMultiplier,{costTreatment:'OWN_COST',procurement:true})),
  ...p.needs.map((n:J)=>row('need:'+n.key,n.titleRu,n.category,n.unitId??'',facadeGlassWholeNormParameterR4(n.key))),
 ];
 const main=p.sources[0];
 const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:p.prefix,sourceId:'gox_facade_glass_whole_r4_'+key,normId:'EXACT_MANUFACTURER_WHOLE_METHOD_AND_APPROVED_PROJECT_BOM',sourceMetadata:{source_title:p.titleRu,source_document_version:p.scope.internalExactSystem,definition_hash:main.sha256,artifact_sha256:main.sha256,exact_locator:p.sources.map((s:J)=>s.key+':PDF'+s.pdfPagesActuallyRead.join(',')).join(';')},applicabilityRu:p.titleRu+'; собственный исходный метод и принятый проект; старые45строк, нормы, цены и область допуска не переносятся. Полное физическое обеспечение не принято.',ordinary:[{id:primary,title:'Фактическая площадь фасада в границах выбранного стеклянного метода',unitId:'m2',valueType:'decimal',kind:'ordinary',min:0}],profile:[],conditional,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:p.exclusions});
 return{...built,parameters:built.parameters.map(q=>{
  const n=p.needs.find((n:J)=>q.parameter_id===facadeGlassWholeNormParameterR4(n.key)),b=p.bom.find((b:J)=>q.parameter_id===facadeGlassWholeBomParameterR4(b.key));
  if(n)return{...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,n.missing)};
  if(q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY')return q;
  const geometry=q.parameter_id===primary;
  return{...q,required:geometry,...(b?.positiveRequired&&b.unitId!=='piece'?{constraints_json:{...q.constraints_json,exclusiveMin:0}}:{}),truth_metadata:{...q.truth_metadata,
   visibility_role:geometry?'USER_INPUT':'INTERNAL_ONLY',value_source_role:geometry?'USER_INPUT':q.parameter_id===facts[0]?'MANUFACTURER_CONFIRMED':q.parameter_id===facts[6]?'ENGINEERING_DESIGN':'PROJECT_DOCUMENTATION',
   preliminary_compilation_allowed:!geometry,source_confirmation_required:false,
   provenance:{consumer_input_role_v1:geometry?'OBJECT_FACT':'APPLICATION_TECHNICAL',...(geometry?{}:{source_readback_only_v1:true,consumer_question_allowed:false})}}};
 }),resources:built.resources.map(r=>{
  const rowKey=r.row_id.slice(p.prefix.length+1),kind=rowKey.startsWith('need:')?'need':rowKey.startsWith('bom:')?'bom':rowKey.startsWith('scope:')?'scope':'source',id=rowKey.slice(rowKey.indexOf(':')+1),b=p.bom.find((b:J)=>kind==='bom'&&b.key===id),n=p.needs.find((n:J)=>kind==='need'&&n.key===id),d=p.derivedSourceRows.find((d:J)=>kind==='source'&&d.key===id),ops=operationsFor(p,kind,id),f=built.formulas.find(f=>f.formula_id===r.formula_id)!,{row_sha256:_old,...body}=r;
  const next={...body,resource_graph:{...r.resource_graph,...(n?{}:{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...f.input_parameter_ids],reasonRu:'Измените принятый проектный факт. Исходная норма, материал и способ крепления не заменяются ручным количеством.'}}),...(n?.key?.startsWith('factory-')?{includedInResourceOwnerRowId:rid('bom:factory-modules')}:{}),operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:p.prefix,groupTitleRu:p.titleRu,operationId:rid('operation:'+ops[0]!.key),operationTitleRu:ops[0]!.titleRu,processOrdinal:1,additionalOperations:ops.slice(1).map((o:J,i:number)=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:i+2,processRole:'PROCESS',completionCriterionRu:'Выполнена операция «'+o.titleRu+'» в точном исходном методе; незакрытое обеспечение сохранено.'})),completionCriterionRu:n?n.missing:'Исходный компонент и принятая ведомость; полная готовность по независимой карте отдельно.'}},source_metadata:{...r.source_metadata,source_artifact_sha256:main.sha256,sourceRole:n?'UNRESOLVED_APPLICATION_NORM':kind==='scope'?'ACTUAL_WORK_SCOPE_NOT_RESOURCE_NORM':d?'EXACT_SOURCE_COMPONENT_COUNT':'ACTUAL_APPROVED_PROJECT_BOM_NOT_AREA_NORM',normativeTrace:n?[]:[{sourceId:'gox_facade_glass_whole_r4_'+key,source_artifact_sha256:main.sha256,exact_locator:d?.locator??'actualapprovedsourcefitprojectBOM;notconsumptionrate'}],sourceScope:p.scope,automaticGenericPriceInheritanceAllowed:false,noHistorical45ResourceNormOrPriceTransfer:true,...(b?.informationalStockOnly?{sourceStockNotConsumption:true,inventoryProcurementNotAdmitted:true,periodProvisionNeedsSeparateWholeOwner:true}:{}),...(n?{normative_source_ids:[],quantityNormAccepted:false,missingFact:n.missing,insideFactoryModulePurchase:n.key.startsWith('factory-')}:{}),full_technical_acceptance:false,newFull:0}};
  return{...next,row_sha256:hash(next)};
 })};
}
export function compileFacadeGlassWholeMethodR4(key:FacadeGlassWholeMethodKeyR4,parameters:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];model?:AutomaticOwnerDefinition;confirmedParameters?:CanonicalEstimateCompileCoreInput['confirmedParameters']}={}){
 if(Object.keys(parameters).some(id=>id!==facadeGlassWholePrimaryR4))throw Object.assign(new Error('FACADE_GLASS_TECHNICAL_VALUES_REQUIRE_SOURCE_READBACK'),{code:'PARAMETER_VALIDATION_FAILED'});
 const d=options.model??facadeGlassWholeDefinitionR4(key);
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:source.contract,catalogId:facadeGlassWholeOwnerR4,primaryMeasureParameterId:facadeGlassWholePrimaryR4,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:parameters,confirmedParameters:options.confirmedParameters??{},rowOverrides:options.rowOverrides??{},priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:hash});
}
/** Independent whole operation/resource expectation based on source method and
 * project BOM classes, not enumerated from generated compiler resources. */
export function facadeGlassWholeCompletenessR4(key:FacadeGlassWholeMethodKeyR4){
 const p=facadeGlassWholePackR4(key),rid=(s:string)=>p.prefix+':'+s;
 const entry=(kind:string,id:string,category:string,unitId:string|null,title:string,rule:string)=>{const ops=operationsFor(p,kind,id);return{expectedResourceId:p.prefix+':expected:'+id,operationId:rid('operation:'+ops[0]!.key),requiredOperationIds:ops.map(o=>rid('operation:'+o.key)),category,unitId,specification:title,condition:p.titleRu,sourceId:'gox_facade_glass_whole_r4_'+key,quantityRule:rule,formulaId:rid('formula:'+kind+':'+id),resolution:{kind:'ROW',rowId:rid(kind+':'+id)}};};
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',exactSourceMethodKind:'WHOLE_MANUFACTURER_METHOD_AND_APPROVED_PROJECT_BOM',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:p.sources[0].sha256,evidenceReferences:p.sources.map((s:J)=>s.url),entries:[entry('scope','whole','work','m2',p.titleRu,'ACTUAL_WORK_SCOPE_INFORMATION_ONLY_NOT_LABOUR_OR_MATERIAL_NORM'),...p.bom.map((b:J)=>entry('bom',b.key,b.informationalStockOnly?'equipment':'material',b.unitId,b.titleRu,b.informationalStockOnly?'ACTUAL_PROJECT_STOCK_NOT_CONSUMPTION':'ACTUAL_APPROVED_PROJECT_BOM_NOT_AREA_NORM')),...p.derivedSourceRows.map((b:J)=>entry('source',b.key,'material',b.unitId,b.titleRu,'LITERAL_SOURCE_PER_APPROVED_COMPONENT')),...p.needs.map((n:J)=>entry('need',n.key,n.category,n.unitId,n.titleRu,'UNRESOLVED_APPLICATION_NORM_NOT_USER_QUANTITY'))],fullTechnicalAcceptance:false,newFULL:0};
}
/** TEST_ONLY synthetic accepted facts, never model defaults/actual acts. */
export function facadeGlassWholeControlR4(key:FacadeGlassWholeMethodKeyR4,more:Record<string,unknown>={}):Record<string,unknown>{const p=facadeGlassWholePackR4(key);return{[facadeGlassWholePrimaryR4]:'100',glass_exact_method:p.titleRu,glass_exact_source_fit:'TEST_ONLY exactoriginalmanufacturer/glass/frame/fittingapproval;notactualact',glass_territorial_design:'TEST_ONLY acceptedprojectinexactoriginalinternationaljurisdiction;localregulatorylocalizationseparate',glass_glass_frame_passports:'TEST_ONLY chosenexactglass/thickness/mass/frame/chemicalpassports;notderivedfromarea',glass_approved_BOM:'TEST_ONLY independentapprovedcomponentandfixingschedule',glass_lifting_PPR:'TEST_ONLY fullsafeaccess/crew/liftingPPR;notcapacityalone',glass_scope_conditions:scope(key),...Object.fromEntries(p.bom.map((b:J)=>[facadeGlassWholeBomParameterR4(b.key),b.testOnlyQuantity])),...more};}
