import source from '../../../../data/estimate-benchmarks/source-packs/cm11-ce40-whole-floor-source-blocker-r1.json';
import {cm11SmallCeramicDefinitionS2754 as cm11,cm11SmallCeramicPrefixS2754 as cp} from './cm11SmallCeramicS2754';
import {ce40ReadyCeramicDefinitionS2754,ce40ReadyCeramicPrefixS2754} from './ce40ReadyCeramicGroutingS2754';
import {buildAutomaticConstructionOwnerR1,compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
type Json=Record<string,unknown>;
export const cm11Ce40KzWholeFloorPackR1=source;
export const cm11Ce40KzSelectableFloorPackR2=source;
export const cm11Ce40KzPrimaryMeasureSelectionR2=source.selectableSuccessorR2.primaryMeasureSelectionV1;
const p=source.executableProfile,n=p.namespace,r=(key:string)=>n+':'+key,a='floor_area_m2',
 glue=p.cm11Expression,grout=p.ce40Expression,primer=p.primerExpression,tiles=p.tileExpression,
 water=`(${glue})*6/25+(${grout})*0.6/2`,ep=ce40ReadyCeramicPrefixS2754(2),owner=r('whole-owner');
const formulas=(d:AutomaticOwnerDefinition)=>new Map(d.formulas.map(f=>[f.formula_id,f]));
const operations=(keys:readonly string[])=>{const refs=keys.map(key=>{const o=p.operations.find(o=>o.id===key);if(!o)throw Error('KZ_FLOOR_OPERATION:'+key);return{operationId:r('operation:'+key),operationTitleRu:o.titleRu,processOrdinal:p.operations.indexOf(o)*10,processRole:'PROCESS' as const,completionCriterionRu:'Подработа выполнена по единому региональному профилю; физические открытые потребности сохранены.'};});return{contractVersion:'canonical-operation-resource/v1',groupId:n,groupTitleRu:p.titleRu,...refs[0]!,additionalOperations:refs.slice(1)};};
const batchGap=`ceil((${glue})/5)-(${glue})/5+ceil((${grout})/6)-(${grout})/6`;
/** Whole-subwork adapter: reuse the two original factories and their row
 * identities, replace the complete regional profile, and merge support owners.
 * Historical global factories, numerical rates and saved revisions are intact. */
export function cm11Ce40KzWholeFloorDefinitionR1():AutomaticOwnerDefinition{
 const ce=ce40ReadyCeramicDefinitionS2754(2),templates=[cm11,ce],byId=new Map(templates.flatMap(d=>d.resources.map(row=>[row.row_id,row] as const))),
  oldFormulas=new Map(templates.flatMap(d=>[...formulas(d)])),rows:AutomaticRowSpec[]=[],bindings=new Map<string,string[]>(),provenance=new Map<string,Json>();
 const add=(key:string,title:string,category:string,unitId:string,expression:string,ops:string[],extra:Partial<AutomaticRowSpec>={})=>{const rowId=r(key);rows.push({rowId,formulaId:r('formula:'+key),section:p.titleRu,title,category,unitId,expression,procurement:false,...extra});bindings.set(rowId,ops);};
 const expressions:Record<string,string>={
  [cp+':tile-consumed']:tiles,[cp+':tile-order']:tiles,[cp+':cm11-consumed']:glue,[cp+':cm11-order']:`ceil((${glue})/5)*5`,[cp+':cm11-bags']:`${effectivePurchaseBalanceExpressionsR1({ownerRowId:cp+':cm11-order',orderUnitId:'kg',consumed:glue,stock:'0',reserve:'0',quantum:'5'}).effective}/5`,
  [cp+':water-consumed']:`(${glue})*6/25`,[cp+':water-order']:water,[cp+':ct17-consumed']:primer,[cp+':ct17-5l-order']:`ceil((${primer})/5)*5`,[cp+':ct17-5l-containers']:`${effectivePurchaseBalanceExpressionsR1({ownerRowId:cp+':ct17-5l-order',orderUnitId:'l',consumed:primer,stock:'0',reserve:'0',quantum:'5'}).effective}/5`,
  [cp+':water-min']:`(${glue})*5.75/25`,[cp+':water-max']:`(${glue})*6/25`,
  [ep+':ce40-table-quantity']:grout,[ep+':ce40-plan-coverage']:`(${grout})-(${grout})`,[ep+':ce40-mixed-plan']:grout,[ep+':ce40-order']:`ceil((${grout})/2)*2`,
  [ep+':ce40-buckets']:`${effectivePurchaseBalanceExpressionsR1({ownerRowId:ep+':ce40-order',orderUnitId:'kg',consumed:grout,stock:'0',reserve:'0',quantum:'2'}).effective}/2`,
  [ep+':ce40-dry-remaining']:effectivePurchaseBalanceExpressionsR1({ownerRowId:ep+':ce40-order',orderUnitId:'kg',consumed:grout,stock:'0',reserve:'0',quantum:'2'}).remaining,[ep+':water-mixing']:`(${grout})*0.6/2`};
 const orders:Record<string,{consumed:string;quantum?:string}>={[cp+':tile-order']:{consumed:tiles},[cp+':cm11-order']:{consumed:glue,quantum:'5'},[cp+':water-order']:{consumed:water},[cp+':ct17-5l-order']:{consumed:primer,quantum:'5'},[ep+':ce40-order']:{consumed:grout,quantum:'2'}};
 for(const[basePrefix,declarations]of [[cp,p.cm11Rows],[ep,p.ce40Rows]] as const)for(const[key,op]of declarations){const rowId=basePrefix+':'+key,t=byId.get(rowId),expression=expressions[rowId];
  if(!t||!oldFormulas.has(t.formula_id)||!expression)throw Error('KZ_WHOLE_SOURCE_ROW_REQUIRED:'+rowId);
  const order=orders[rowId],balance=order?(order.quantum?
   effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:t.unit_id,consumed:order.consumed,stock:'0',reserve:'0',quantum:order.quantum}):
   effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:t.unit_id,consumed:order.consumed,stock:'0',reserve:'0',quantityMode:'canonical_decimal',balanceScope:'new_order_vs_required_consumption'})):null;
  const title=(p.publicRowNames as Record<string,string>)[key];if(!title)throw Error('KZ_R2_EXACT_PUBLIC_NAME_REQUIRED:'+key);
  rows.push({rowId,formulaId:t.formula_id,section:p.titleRu,title,category:t.category,unitId:t.unit_id,expression,procurement:t.procurement_eligible,costTreatment:order?'OWN_COST':'INFORMATIONAL_SCOPE',...(balance?.owner??{})});
  bindings.set(rowId,rowId===cp+':water-order'?['cm11-mixing','ce40-mixing']:[op]);
  provenance.set(rowId,{reusedWholeFactory:basePrefix===cp?'cm11SmallCeramicDefinitionS2754':'ce40ReadyCeramicDefinitionS2754(2)',historicalSourceMetadata:t.source_metadata,regionalProfileReplacement:basePrefix===cp?'WHOLE_CM11_CT17_RU_KZ':'EXISTING_CE40_RU_KZ_UNCHANGED'});
 }
 const all=p.operations.map(o=>o.id);add('whole-owner','Укладка керамического пола с грунтованием, швами и обычным обеспечением','work','m2',a,all,{costTreatment:'OWN_COST'});
 for(const op of p.operations)add('included-'+op.id,op.titleRu,'work','m2',a,[op.id],{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});
 for(const c of source.wholeMixingNodePlan.components){const key=c.rowId.split(':mix:')[1]!;add('mix-'+key,c.title,c.category,c.unitId,c.expression,c.operations,{costTreatment:'INCLUDED_IN_RESOURCE_ROWS'});}
 for(const g of p.gaps)add(g.rowKey,g.titleRu,g.category,g.unitId,'kz_floor_open_'+g.key.replaceAll('-','_'),g.operations,
  {costTreatment:g.costTreatment as AutomaticRowSpec['costTreatment'],...(g.key==='batch-provision'?{inclusion:{kind:'formula_greater_than' as const,expression:batchGap,unitId:'item',value:0}}:{})});
 const s=source.regionalProfileDecision,pdf=s.source,base=buildAutomaticConstructionOwnerR1({contract:p.contract,semanticOwner:n,sourceId:p.publicationSourceId,normId:'CM11_CT17_CE40_RU_KZ_SELECTED_WHOLE_FLOOR_R2',
  sourceMetadata:{source_title:p.titleRu,source_document_version:'CM11/CT17/CE40ru_KZ signed2025; explicit source-supported composite',definition_hash:pdf.sha256,artifact_sha256:pdf.sha256,exact_locator:s.cm11.sourceLocator},
  applicabilityRu:p.scopeRu,ordinary:[{id:'floor_length_m',title:'Длина прямоугольного пола',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0.001},{id:'floor_width_m',title:'Ширина прямоугольного пола',valueType:'decimal',unitId:'linear_m',kind:'ordinary',min:0.001}],
  profile:[],conditional:[{id:'floor_area_m2',title:'Площадь прямоугольного пола',valueType:'decimal',unitId:'m2',kind:'internal',min:0.000001},
   ...p.gaps.map(g=>({id:'kz_floor_open_'+g.key.replaceAll('-','_'),title:g.titleRu,valueType:'decimal' as const,unitId:g.unitId,kind:'internal' as const,min:0}))],rows,
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[p.scopeRu,'Нет гарантии приблизительного расходаCE40; малые последние замесы не округляются в фиктивный расход.']});
 return{...base,parameters:base.parameters.map(par=>par.parameter_id.startsWith('kz_floor_open_')?{...par,truth_metadata:unresolvedApplicationNormTruthR1(par.truth_metadata,p.gaps.find(g=>'kz_floor_open_'+g.key.replaceAll('-','_')===par.parameter_id)!.reasonRu)}:
  par.parameter_id==='floor_area_m2'?{...par,truth_metadata:{...par.truth_metadata,source_confirmation_required:false,visibility_role:'INTERNAL_ONLY',
   value_source_role:'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE',runtime_profile_classification:'PRELIMINARY_SOURCE_FORMULA',runtime_profile_value:true,
   preliminary_compilation_allowed:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:p.areaExpression,explicitValuePolicy:'REQUIRE_MATCH',when:{kind:'literal',value:true}},
   guide:{guide_kind:'DERIVED_VALUE_RULE',guide_short_ru:'Площадь вычисляется из измеренных длины и ширины прямоугольного пола.',
    source_document:source.selectableSuccessorR2.computedPhysicalPrimaryArea.geometryRule.sourceDocument,
    source_locator:source.selectableSuccessorR2.computedPhysicalPrimaryArea.geometryRule.locator,guide_version:p.contract,applicability:p.scopeRu,guide_validation_policy:'MANDATORY_BLOCK',
    source_role:'ENGINEERING_DESIGN',source_snapshot_hash:source.selectableSuccessorR2.computedPhysicalPrimaryArea.geometryRule.sha256,
    verified_at:source.selectableSuccessorR2.computedPhysicalPrimaryArea.geometryRule.verifiedAt}}}:
  {...par,truth_metadata:{...par.truth_metadata,source_confirmation_required:false,...(p.geometry.includes(par.parameter_id)?{provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(par.truth_metadata.guide as Json),source_role:'USER_MEASURED'}}:{})}}),
  resources:base.resources.map(row=>{const {row_sha256:_old,...body}=row,kind=rows.find(x=>x.rowId===row.row_id)!.costTreatment,included=kind==='INCLUDED_IN_RESOURCE_ROWS',ops=bindings.get(row.row_id)!;
   const sourceRole=(source.selectableSuccessorR2.publicRowRoles as Record<string,string>)[row.row_id]??'RESOURCE';
   const detailOwner=row.row_id.startsWith(ep+':')?(row.row_id.endsWith(':water-mixing')?cp+':water-order':ep+':ce40-order'):
    row.row_id.includes(':ct17-')?cp+':ct17-5l-order':row.row_id.endsWith(':tile-consumed')?cp+':tile-order':
     row.row_id.includes(':water-')?cp+':water-order':cp+':cm11-order';
   const graph={...row.resource_graph,scopeContextParameterIds:p.geometry,operationCompositionV1:operations(ops),...(included?{parentCostOwnerId:owner,includedInResourceOwnerRowId:owner}:{}),
    ...(sourceRole==='CALCULATION_DETAIL'?{purchaseBalanceOwnerRowId:detailOwner}:{}),
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu:row.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[],...(sourceRole==='RESOURCE'?{}:{rowKind:sourceRole})}};
   const gap=p.gaps.find(g=>r(g.rowKey)===row.row_id),evidence=row.row_id.startsWith(ep+':')?source.primaryEvidence.find(e=>e.path.endsWith('/CE-40-ru_KZ.pdf')):row.row_id.startsWith(cp+':ct17-')?s.ct17.source:pdf;
   const trace=gap?[]:((row.source_metadata?.normativeTrace??[]) as Json[]).map(t=>({...t,source_definition_hash:evidence?.sha256,definition_hash:evidence?.sha256,artifact_sha256:evidence?.sha256,exact_locator:row.row_id.startsWith(ep+':')?'CE40ru_KZ PDF1–2,exact10x10cm/2mm approximate row and selected net mixing plan':row.row_id.startsWith(cp+':ct17-')?'CT17ru_KZ PDF1–2,0.1–0.2l/m2 per normal coat':s.cm11.sourceLocator}));
   const content={...body,cost_owner_id:included?owner:row.cost_owner_id,resource_graph:graph,source_metadata:{...row.source_metadata,...provenance.get(row.row_id),normativeTrace:trace,countryProfile:'RU_KZ_CERESIT_SELECTED_CEMENT_FLOOR',
    primaryRegionalProfile:s,planningOnly:true,noActualSiteAcceptanceClaimed:true,noActualStockCredit:true,noSupplierMultipleInvented:true,wholeSubworksReused:true,conditionsAreNotQuantityServices:true,
    rectangularLayoutScope:p.scopeRu,approximateConsumptionNotGuaranteed:true,full_technical_acceptance:false,
    ...(gap?{sourceRole:'UNRESOLVED_APPLICATION_NORM',normative_source_ids:[],missingPhysicalQuantityReasonRu:gap.reasonRu,physicalNeedNotPriceGap:true}:{}),
    ...(row.row_id===r('open-batch-provision')?{wholeSmallBatchAssemblyReview:source.wholeMixingNodePlan.smallBatchReview}:{}),
    ...(!gap&&row.row_id.startsWith(r('mix-'))?{wholeMixingAssemblySourceReference:'cm11-ce40-whole-floor-source-blocker-r1.json#/wholeMixingNodePlan',smallBatchCandidateAdmitted:false,quantityMeaning:'ONE_SELECTED_SEQUENTIAL_WORKSTATION_NOT_PPE_OR_WEAR_LIFE_NORM',
     costAndSupplyScope:{costOwnerRowId:owner,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',procurementEligible:false,ownershipClaimed:false,
      scope:'Working sequential station provided with the whole work; not an owned stock item, supplier order or durable renewal allowance'}}:{}),
   }};return{...content,row_sha256:hash(content)};
  })};
}
export function compileCm11Ce40KzWholeFloorR1(submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:source.catalogId,compilerVersion:p.contract,primaryMeasureParameterId:p.primaryGeometry,definition:cm11Ce40KzWholeFloorDefinitionR1(),submittedParameters});}
/** The oracle is declared from source subworks and the authored profile, never
 * from this adapter's emitted resources. */
export function cm11Ce40KzWholeFloorCompletenessR1(){
 const entry=(rowId:string,formulaId:string,unitId:string,category:string,ops:string[],included=false)=>({expectedResourceId:'kz-whole:'+rowId,operationId:ops[0]!,sourceId:p.publicationSourceId,condition:p.scopeRu,specification:rowId,unitId,category,formulaId,quantityRule:'EXPLICIT_WHOLE_RU_KZ_SOURCE_SUBWORK_OR_SERIAL_PROVISION',requiredOperationIds:ops.map(op=>r('operation:'+op)),resolution:included?{kind:'INCLUDED_COMPONENT_ROW',rowId,parentRowId:owner}:{kind:'ROW',rowId}});
 const entries=source.selectableSuccessorR2.independentExpectedResources.map(e=>({...entry(e.rowId,e.formulaId,e.unitId??'',e.category,e.operations,e.included),unitId:e.unitId,status:e.status}));
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:source.regionalProfileDecision.source.sha256,
  entries,wholeSubworksReused:true,physicalResourceCoverageComplete:false,fullTechnicalAcceptance:false,openSourceObligations:p.gaps.map(g=>g.reasonRu)};
}

type LegacyFloor=Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>;
export type Cm11Ce40KzLegacyIdentityR2=Readonly<{catalogId:string;definitionVersionId:string;definitionSha256:string;version:number}>;
function legacySemanticValue(parent:LegacyFloor){
 const fields=source.selectableSuccessorR2.legacySemanticFields;
 return Object.fromEntries((['parameters','formulas','resources'] as const).map(key=>{
  const id=key==='parameters'?'parameter_id':key==='formulas'?'formula_id':'row_id';
  return[key,[...parent[key]].sort((a,b)=>{const x=String((a as unknown as Json)[id]),y=String((b as unknown as Json)[id]);return x<y?-1:x>y?1:0;}).map(value=>Object.fromEntries(fields[key].filter(field=>Object.hasOwn(value,field)).map(field=>[field,(value as unknown as Json)[field]])))];
 }));
}
/** Explicit same-catalog successor. The captured legacy definition remains an
 * executable branch. Its row/formula IDs, arithmetic, units and owners survive;
 * selecting the exact regional technology never edits saved legacy revisions. */
export function cm11Ce40KzSelectableFloorDefinitionR2(parent:LegacyFloor,identity:Cm11Ce40KzLegacyIdentityR2):AutomaticOwnerDefinition{
 const c=source.selectableSuccessorR2,s=c.selector,old=c.legacyParent;
 if(identity.catalogId!==source.catalogId||identity.definitionVersionId!==old.definitionVersionId||identity.definitionSha256!==old.definitionSha256||identity.version!==old.version
  ||parent.parameters.length!==1||parent.resources.length!==59||parent.formulas.length!==59||hash(legacySemanticValue(parent))!==c.legacySemanticHash)throw Error('CM11_R2_EXACT_RETAINED_LEGACY59_PARENT_REQUIRED');
 const exact=cm11Ce40KzWholeFloorDefinitionR1(),legacyWhen={kind:'equals',parameterId:s.parameterId,value:s.legacyValue},exactWhen={kind:'equals',parameterId:s.parameterId,value:s.exactValue};
 const selector=buildAutomaticConstructionOwnerR1({contract:c.contract,semanticOwner:p.namespace,sourceId:p.publicationSourceId,normId:'CM11_CT17_CE40_RU_KZ_SELECTED_WHOLE_FLOOR_R2',
  sourceMetadata:{source_title:p.titleRu,source_document_version:'retained generic legacy + explicit regional preliminary profile',definition_hash:source.regionalProfileDecision.source.sha256,artifact_sha256:source.regionalProfileDecision.source.sha256,exact_locator:'Exact regional source recipe; legacy numerical provenance is retained separately'},applicabilityRu:p.scopeRu,
  ordinary:[],conditional:[],profile:[{id:s.parameterId,title:'Какой расчёт плиточного пола нужен?',valueType:'enum',unitId:null,kind:'profile',values:[s.legacyValue,s.exactValue],defaultValue:s.legacyValue}],rows:[],excludedUnownedAssumptions:[]});
 const parameters=[...parent.parameters.map(par=>({...par,required:false,constraints_json:{...par.constraints_json,requiredWhen:legacyWhen},truth_metadata:{...par.truth_metadata,visible_when:legacyWhen,retainedLegacyParameterR2:true}})),
  ...selector.parameters.map(par=>({...par,required:false,truth_metadata:{...par.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(par.truth_metadata.guide as Json),guide_kind:'ENUM_DECISION_RULE',source_role:'ENGINEERING_DESIGN'}}})),
  ...exact.parameters.map(par=>({...par,required:false,constraints_json:{...par.constraints_json,...(p.geometry.includes(par.parameter_id)?{requiredWhen:exactWhen}:{})},truth_metadata:{...par.truth_metadata,visible_when:exactWhen,exactProfileOnlyR2:true,
   ...(par.parameter_id==='floor_area_m2'?{preliminary_value_formula_v1:{version:'canonical-preliminary-parameter-formula:v1',expression:p.areaExpression,explicitValuePolicy:'REQUIRE_MATCH',when:exactWhen}}:{})}}))].map((par,ordinal)=>({...par,ordinal}));
 const rehash=(row:AutomaticOwnerDefinition['resources'][number],condition:Json,ordinal:number,legacy=false)=>{const{row_sha256:_old,...body}=row;const content={...body,ordinal,inclusion_ast:{kind:'and',operands:[condition,row.inclusion_ast]},source_metadata:legacy?row.source_metadata:{...row.source_metadata,selectableFloorProfileR2:{selectorId:s.parameterId,legacyQuantityTransferToExactAllowed:false,fullTechnicalAcceptance:false}}};return{...content,row_sha256:hash(content)};};
 const resources=[...parent.resources.map((row,i)=>rehash(row,legacyWhen,i,true)),...exact.resources.map((row,i)=>rehash(row,exactWhen,parent.resources.length+i))];
 const ids=[...parent.formulas,...exact.formulas].map(f=>f.formula_id);if(new Set(ids).size!==ids.length)throw Error('CM11_R2_FORMULA_ID_COLLISION');
 return{parameters,formulas:[...parent.formulas,...exact.formulas],resources,runtimeInput:selector.runtimeInput,runtimeClassification:selector.runtimeClassification,runtimeSourceIds:selector.runtimeSourceIds,ordinaryParameterIds:['q',...p.geometry]};
}
export function cm11Ce40KzSelectableFloorCompletenessR2(){return{...cm11Ce40KzWholeFloorCompletenessR1(),coverage:'NEW_EXACT_SELECTED_PROFILE_ONLY_LEGACY59_RETAINED_WITH_ITS_OWN_PROVENANCE',selector:source.selectableSuccessorR2.selector,legacyParent:source.selectableSuccessorR2.legacyParent,fullTechnicalAcceptance:false};}
export const cm11Ce40KzSelectableFloorPublicationContractR2={catalogId:source.catalogId,contract:p.contract,sourceId:p.publicationSourceId,normId:'CM11_CT17_CE40_RU_KZ_SELECTED_WHOLE_FLOOR_R2',primaryMeasureParameterId:'q',primaryMeasureSelectionV1:cm11Ce40KzPrimaryMeasureSelectionR2,sourcePackPath:'data/estimate-benchmarks/source-packs/cm11-ce40-whole-floor-source-blocker-r1.json',fullTechnicalAcceptance:false,quantityScope:'PARTIAL',expectedParentShape:[1,59,59],retainedParentBindingsRequired:true} as const;
export function cm11Ce40KzBindingApplicabilityByRowIdR2(){const s=source.selectableSuccessorR2.selector;return Object.fromEntries(source.selectableSuccessorR2.independentExpectedResources.map(e=>[e.rowId,{selectedOnly:{kind:'equals',parameterId:s.parameterId,value:s.exactValue},exactRegionalProfile:'CM11_CT17_CE40_RU_KZ_100X100_2MM',approximateMaterialConsumption:true,wholePhysicalCoverageComplete:false,requiredOperationIds:e.operations.map(op=>r('operation:'+op))}]));}
export function compileCm11Ce40KzSelectableFloorR2(parent:LegacyFloor,identity:Cm11Ce40KzLegacyIdentityR2,submittedParameters:Record<string,unknown>){
 const s=source.selectableSuccessorR2.selector,choice=submittedParameters[s.parameterId]??s.legacyValue;
 return compileAutomaticConstructionOwnerR1({catalogId:source.catalogId,compilerVersion:p.contract,primaryMeasureParameterId:choice===s.exactValue?'floor_area_m2':'q',definition:cm11Ce40KzSelectableFloorDefinitionR2(parent,identity),submittedParameters});
}


// R3 is an exact current-body continuation. R1/R2 historical factories above
// remain unchanged; this path never appends the historical59 branch twice.
import currentCm11ParentR951 from '../../../../data/estimate-benchmarks/fixtures/cm11-ct17-ce40-current-parent-r951.json';
import currentCm11ConsumersR3 from '../../../../data/estimate-benchmarks/source-packs/cm11-ct17-ce40-current-consumer-cycle-r3.json';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import type {CanonicalEstimateFormulaDefinition,CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import type {FormulaAst} from '../backendPlatform/formulaGraph';

export const cm11Ce40KzCurrentConsumerPackR3=currentCm11ConsumersR3;
const currentCm11Record=(value:unknown):Json=>{
 const record=(candidate:unknown):candidate is Json=>candidate!==null&&typeof candidate==='object'&&!Array.isArray(candidate);
 if(!record(value))throw Error('CM11_R3_RECORD_REQUIRED');return value;
};
const currentCm11Text=(value:unknown):string=>{if(typeof value!=='string')throw Error('CM11_R3_TEXT_REQUIRED');return value;};
const currentCm11Array=(value:unknown):unknown[]=>{if(!Array.isArray(value))throw Error('CM11_R3_ARRAY_REQUIRED');return value;};
const currentCm11Boolean=(value:unknown):boolean=>{if(typeof value!=='boolean')throw Error('CM11_R3_BOOLEAN_REQUIRED');return value;};
const currentCm11Integer=(value:unknown):number=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('CM11_R3_ORDINAL_REQUIRED');return value;};
function currentCm11Ast(value:unknown):FormulaAst{
 const v=currentCm11Record(value);
 if(v.kind==='literal')return{...v,kind:'literal',value:currentCm11Text(v.value)};
 if(v.kind==='parameter')return{...v,kind:'parameter',id:currentCm11Text(v.id)};
 if(v.kind==='unary'&&(v.operator==='+'||v.operator==='-'))return{...v,kind:'unary',operator:v.operator,operand:currentCm11Ast(v.operand)};
 if(v.kind==='binary'&&(v.operator==='+'||v.operator==='-'||v.operator==='*'||v.operator==='/'))return{...v,kind:'binary',operator:v.operator,left:currentCm11Ast(v.left),right:currentCm11Ast(v.right)};
 if(v.kind==='conditional')return{...v,kind:'conditional',condition:currentCm11Ast(v.condition),whenTrue:currentCm11Ast(v.whenTrue),whenFalse:currentCm11Ast(v.whenFalse)};
 if(v.kind==='call'&&(v.function==='ceil'||v.function==='floor'||v.function==='max'||v.function==='min'||v.function==='pow'||v.function==='round_to'||v.function==='sqrt'||v.function==='unit_convert'))return{...v,kind:'call',function:v.function,arguments:currentCm11Array(v.arguments).map(currentCm11Ast)};
 throw Error('CM11_R3_FORMULA_AST_REQUIRED');
}
/** Personal R951 raw/parsed parity anchors all ten current sets. The runtime
 * view validates complete header and body against the separately SHA-pinned
 * immutable snapshot, before any mapping. A changed actual row, formula, source
 * registry tuple, baseline or header is refused, even if array counts match. */
export function cm11Ce40KzCurrentConsumerDefinitionR3(actual:unknown=currentCm11ParentR951):AutomaticOwnerDefinition{
 const snapshot=currentCm11Record(actual),body=currentCm11Record(snapshot.currentBody);
 if(canonicalEstimateStableJson(snapshot.header)!==canonicalEstimateStableJson(currentCm11ParentR951.header)
  ||canonicalEstimateStableJson(snapshot.target)!==canonicalEstimateStableJson(currentCm11ParentR951.target)
  ||canonicalEstimateStableJson(body)!==canonicalEstimateStableJson(currentCm11ParentR951.currentBody))throw Error('CM11_R3_EXACT_ACTUAL_R951_BODY_REQUIRED');
 const parameters:AutomaticOwnerDefinition['parameters']=currentCm11Array(body.parameters).map(value=>{const v=currentCm11Record(value);return{
  ...v,parameter_id:currentCm11Text(v.parameter_id),ordinal:currentCm11Integer(v.ordinal),unit_id:v.unit_id===null?null:currentCm11Text(v.unit_id),title_ru:currentCm11Text(v.title_ru),
  value_type:currentCm11Text(v.value_type),required:currentCm11Boolean(v.required),default_value:v.default_value,
  constraints_json:v.constraints_json===null?null:currentCm11Record(v.constraints_json),truth_metadata:currentCm11Record(v.truth_metadata)};});
 const formulas:CanonicalEstimateFormulaDefinition[]=currentCm11Array(body.formulas).map(value=>{const v=currentCm11Record(value);return{
  ...v,formula_id:currentCm11Text(v.formula_id),output_unit_id:currentCm11Text(v.output_unit_id),expression_source:currentCm11Text(v.expression_source),
  ast:currentCm11Ast(v.ast),input_parameter_ids:currentCm11Array(v.input_parameter_ids).map(currentCm11Text),ast_sha256:currentCm11Text(v.ast_sha256)};});
 const changes=new Map(currentCm11ConsumersR3.consumerRows.map(item=>[item.rowId,item] as const));
 const resources:CanonicalEstimateResourceDefinition[]=currentCm11Array(body.resources).map(value=>{
  const v=currentCm11Record(value),rowId=currentCm11Text(v.row_id),graph=currentCm11Record(v.resource_graph),change=changes.get(rowId),
   oldComposition=currentCm11Record(graph.operationCompositionV1??{});
  let nextGraph=graph;
  if(change){
   const actualBefore=[oldComposition.operationId,...currentCm11Array(oldComposition.additionalOperations).map(x=>currentCm11Record(x).operationId)];
   if(canonicalEstimateStableJson(actualBefore)!==canonicalEstimateStableJson(change.beforeOperationIds)
    ||v.formula_id!==change.formulaId||v.unit_id!==change.unitId||v.cost_owner_id!==change.costOwnerId||v.procurement_eligible!==change.procurementEligible)throw Error('CM11_R3_CONSUMER_PREIMAGE_CHANGED:'+rowId);
   nextGraph={...graph,operationCompositionV1:operations(change.operationKeys)};
  }
  const content={...v,resource_graph:nextGraph};
  return{...content,id:currentCm11Text(v.id),row_id:rowId,ordinal:currentCm11Integer(v.ordinal),section:currentCm11Text(v.section),category:currentCm11Text(v.category),
   title_ru:currentCm11Text(v.title_ru),unit_id:currentCm11Text(v.unit_id),formula_id:currentCm11Text(v.formula_id),inclusion_ast:currentCm11Record(v.inclusion_ast),resource_graph:nextGraph,
   procurement_eligible:currentCm11Boolean(v.procurement_eligible),cost_owner_id:v.cost_owner_id===null?null:currentCm11Text(v.cost_owner_id),
   source_metadata:v.source_metadata===null?null:currentCm11Record(v.source_metadata),row_sha256:change?hash({...content,row_sha256:undefined}):currentCm11Text(v.row_sha256)};
 });
 if(parameters.length!==34||formulas.length!==117||resources.length!==117||[...changes.keys()].some(id=>!resources.some(row=>row.row_id===id)))throw Error('CM11_R3_CURRENT_SHAPE_REQUIRED');
 // Current source/derived authority stays in the original parameters. Baseline
 // input_values, source confirmation and accepted site facts are never hydrated.
 const protection=currentCm11ConsumersR3.adjacentProtection,extra=buildAutomaticConstructionOwnerR1({contract:currentCm11ConsumersR3.contract,
  semanticOwner:n,sourceId:protection.sourceId,normId:'CT17_ADJACENT_PROTECTION_FUNCTION_NO_QUANTITY_NORM',
  sourceMetadata:{source_title:protection.titleRu,source_document_version:'CT17ru_KZ exact existing PDF1',definition_hash:protection.primaryArtifactSha256,
   artifact_sha256:protection.primaryArtifactSha256,exact_locator:protection.sourceLocator},applicabilityRu:p.scopeRu,ordinary:[],profile:[],
  conditional:[{id:protection.scopeParameterId,title:protection.scopeTitleRu,valueType:'enum',unitId:null,kind:'internal',values:[protection.maskRequiredValue,protection.noneConfirmedValue]},
   {id:protection.quantityParameterId,title:protection.titleRu,valueType:'decimal',unitId:protection.unitId,kind:'internal',min:0}],
  rows:[{rowId:protection.rowId,formulaId:protection.formulaId,section:p.titleRu,title:protection.titleRu,category:protection.category,unitId:protection.unitId,
   expression:protection.quantityParameterId,inclusion:{kind:'equals',parameterId:protection.scopeParameterId,value:protection.maskRequiredValue},
   inputParameterIds:[protection.scopeParameterId],procurement:false,costTreatment:'INFORMATIONAL_SCOPE',
   formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:protection.unitId,exclusiveMinimum:0,reasonRu:'При подтверждённой необходимости маскирования требуется положительное количество материала по принятому плану; нулевое количество не подтверждает защиту.'}}],
  deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[protection.quantityReasonRu]});
 const exactWhen={kind:'equals',parameterId:source.selectableSuccessorR2.selector.parameterId,value:source.selectableSuccessorR2.selector.exactValue};
 const newParameters=extra.parameters.map((par,index)=>({...par,ordinal:parameters.length+index,truth_metadata:par.parameter_id===protection.scopeParameterId?
  {...par.truth_metadata,visibility_role:'INTERNAL_ONLY',source_readback_only:true,value_source_role:'SITE_SURVEY',source_confirmation_required:true,
   preliminary_compilation_allowed:true,visible_when:exactWhen,resource_branch_consumers:[protection.rowId],provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'},
   actual_readback_required:protection.sourceConfirmation}:
  unresolvedApplicationNormTruthR1({...par.truth_metadata,visible_when:exactWhen},protection.quantityReasonRu)}));
 const newResources=extra.resources.map((row,index)=>{const content={...row,ordinal:resources.length+index,inclusion_ast:{kind:'and',operands:[exactWhen,row.inclusion_ast]},
  resource_graph:{...row.resource_graph,operationCompositionV1:operations(protection.operations)},
  source_metadata:{...row.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],normative_source_ids:[],physicalFunctionSourceId:protection.sourceId,
   physicalFunctionPrimarySha256:protection.primaryArtifactSha256,physicalFunctionSourceLocator:protection.sourceLocator,physicalNeedNotPriceGap:true,
   missingPhysicalQuantityReasonRu:protection.quantityReasonRu,full_technical_acceptance:false}};return{...content,row_sha256:hash({...content,row_sha256:undefined})};});
 return{parameters:[...parameters,...newParameters],formulas:[...formulas,...extra.formulas],resources:[...resources,...newResources],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q','floor_length_m','floor_width_m']};
}
export function compileCm11Ce40KzCurrentConsumerR3(submittedParameters:Record<string,unknown>,actual:unknown=currentCm11ParentR951,confirmedParameters:Record<string,unknown>={}){
 const s=source.selectableSuccessorR2.selector,
  // The established omitted-selector compatibility default selects only the
  // retained method. It is not a baseline, quantity or accepted object fact.
  effective=Object.hasOwn(submittedParameters,s.parameterId)?submittedParameters:{...submittedParameters,[s.parameterId]:s.legacyValue},choice=effective[s.parameterId];
 return compileAutomaticConstructionOwnerR1({catalogId:source.catalogId,compilerVersion:currentCm11ConsumersR3.contract,
  primaryMeasureParameterId:choice===s.exactValue?'floor_area_m2':'q',definition:cm11Ce40KzCurrentConsumerDefinitionR3(actual),submittedParameters:effective,confirmedParameters});
}
/** The new authored operation map is independent of the generated current
 * resources. Retained source/locator tuples are not replaced by this map. */
export function cm11Ce40KzCurrentConsumerExpectationsR3(){const updates=new Map(currentCm11ConsumersR3.consumerRows.map(item=>[item.rowId,item] as const));return{
 contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
 operationResourceBindingRequired:true,evidenceSha256:currentCm11ConsumersR3.evidence[0]!.sha256,
 entries:[...cm11Ce40KzSelectableFloorCompletenessR2().entries.map(entry=>{const item=updates.get(entry.resolution.rowId);return item?{
  ...entry,sourceId:currentCm11ConsumersR3.sourceId,requiredOperationIds:item.operationKeys.map(op=>r('operation:'+op)),
  quantityRule:'EXACT_RETAINED_FORMULA_NO_NEW_NORM',resolution:item.includedInWholeOwner?{kind:'INCLUDED_COMPONENT_ROW',rowId:item.rowId,parentRowId:owner}:{kind:'ROW',rowId:item.rowId}}:entry;}),{expectedResourceId:'ct17-adjacent-protection',sourceId:currentCm11ConsumersR3.adjacentProtection.sourceId,
  operationId:'priming',requiredOperationIds:currentCm11ConsumersR3.adjacentProtection.operations.map(op=>r('operation:'+op)),condition:p.scopeRu,
  specification:currentCm11ConsumersR3.adjacentProtection.titleRu,unitId:'linear_m',category:'material',formulaId:currentCm11ConsumersR3.adjacentProtection.formulaId,
  quantityRule:'FUNCTION_FROM_CT17_QUANTITY_SOURCE_HELD',resolution:{kind:'ROW',rowId:currentCm11ConsumersR3.adjacentProtection.rowId}}],
 fullTechnicalAcceptance:false,openSourceObligations:[...p.gaps.map(g=>g.reasonRu),currentCm11ConsumersR3.adjacentProtection.quantityReasonRu]};}
