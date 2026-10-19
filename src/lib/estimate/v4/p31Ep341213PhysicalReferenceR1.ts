// WORK-only safe physical BOM reference. No sales-unit, price, stock or purchase admission.
import pack from '../../../../data/estimate-benchmarks/source-packs/p31-ep341213-physical-side-plate-reference-r1.json';
import {legrandP31BlindEpJointFastenerDefinitionR1,legrandP31BlindEpJointPackR1 as parentPack} from './legrandP31BlindEpJointFastenersR1';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
export const p31Ep341213PhysicalReferencePackR1=pack;
const joint='p31_joint_count',selected={kind:'equals' as const,parameterId:pack.method.parameterId,value:pack.method.selected};
export function p31Ep341213PhysicalReferenceDefinitionR1():AutomaticOwnerDefinition{
 const parent=legrandP31BlindEpJointFastenerDefinitionR1(),oldNeed=parent.resources.find(r=>r.row_id===pack.targetNeedRowId);
 if(parent.parameters.length!==24||parent.formulas.length!==13||parent.resources.length!==13
  ||parentPack.knownEpAssemblyFacts.couplerSku!=='341213'||parentPack.knownEpAssemblyFacts.sidePiecesPerJoint!==2
  ||pack.sidePiecesPerAcceptedJoint!==2||pack.commercialAdmission!==false||pack.payment.newPaidOwners!==0
  ||!oldNeed||oldNeed.unit_id!=='pcs'||oldNeed.source_metadata.sourceRole!=='UNRESOLVED_APPLICATION_NORM')
  throw Error('P31_EP_REFERENCE_EXACT_PARENT_AND_NO_COMMERCIAL_ADMISSION_REQUIRED');
 const oldIds=new Set(parent.parameters.map(p=>p.parameter_id));
 const parentFacts:AutomaticParameterSpec[]=pack.parentRequiredFacts.map(id=>{
  const p=parent.parameters.find(p=>p.parameter_id===id);
  if(!p||!['text','enum'].includes(p.value_type))throw Error('P31_EP_REFERENCE_PARENT_FACT_REQUIRED:'+id);
  return {id,title:p.title_ru,kind:'conditional',valueType:p.value_type as 'text'|'enum',unitId:null,requiredWhen:selected,
   ...(p.value_type==='enum'?{values:p.constraints_json?.values as readonly string[]}:{}),};
 });
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:pack.normId,
  sourceMetadata:{source_title:pack.public.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,
   artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu},
  ordinary:[{id:joint,title:'Количество принятых прямых стыков P31 по прежней ведомости, шт.',kind:'ordinary',valueType:'integer',unitId:'pcs',min:1}],profile:[],
  conditional:[...parentFacts,
   {id:pack.method.parameterId,title:'Показать физические боковые пластины без допуска товарной единицы и оплаты',kind:'conditional',valueType:'enum',unitId:null,values:[pack.method.selected,pack.method.unconfirmed]},
   {id:pack.projectReferenceId,title:'Ведомость именно этих прямых стыков и боковых пластин EP341213',kind:'conditional',valueType:'text',unitId:null,requiredWhen:selected}],
  rows:[{rowId:pack.rowId,formulaId:pack.prefix+':formula:side-plates-required',title:pack.public.titleRu,category:'material',unitId:'pcs',
   expression:joint+'*2',section:'Физический состав прямых стыков P31 без нового заказа',
   inputParameterIds:[...pack.parentRequiredFacts,pack.projectReferenceId],inclusion:{kind:'and',operands:[
    {kind:'equals',parameterId:pack.method.parameterId,value:pack.method.selected},
    {kind:'equals',parameterId:'p31_scope_confirmation',value:parentPack.scopeFactRu}]},
   procurement:false,costTreatment:'INFORMATIONAL_SCOPE'}],
  deferMissingProjectFactsToRows:true,applicabilityRu:pack.public.specificationRu,excludedUnownedAssumptions:pack.futureUnitTask.doNotAssume});
 const params=d.parameters.filter(p=>!oldIds.has(p.parameter_id)).map((p,i)=>({...p,ordinal:parent.parameters.length+i,required:false,
  truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(p.truth_metadata.guide as Record<string,unknown>),guide_short_ru:p.title_ru}}}));
 const rows=d.resources.map((r,i)=>{
  const{row_sha256:_old,...body}=r;const value={...body,ordinal:parent.resources.length+i,
   inclusion_ast:{kind:'and',operands:[{kind:'selected',parameterId:pack.method.parameterId,value:pack.method.selected},
    {kind:'equals',parameterId:'p31_scope_confirmation',value:parentPack.scopeFactRu}]},
   resource_graph:{...r.resource_graph,derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:[joint],
    reasonRu:'Физические боковые пластины определяются принятой ведомостью стыков. Ручное число не доказывает товарную единицу или заказ.'},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:'Legrand P31 EP341213',specificationRu:pack.public.specificationRu,detailsRu:pack.public.detailsRu}},
   source_metadata:{...r.source_metadata,automaticGenericPriceInheritanceAllowed:false,
    sourceRole:'MANUFACTURER_PHYSICAL_SIDE_PIECES_NOT_SALES_UNITS',normativeTrace:[{sourceId:pack.sourceId,normId:pack.normId,
     source_document_version:pack.source.edition,exact_locator:pack.source.locatorRu,artifact_sha256:pack.source.sha256}],
    physicalSidePiecesPerJoint:2,salesUnitOrKitAdmitted:false,commercialProcurementAdmitted:false,purchaseBalanceAdmitted:false,
    manufacturerCartonQuantumNotApplied:true,originalCouplersNeedRetained:true,labourNormAccepted:false,
    fullTechnicalAcceptance:false,publicationAllowed:false}};
  return {...value,row_sha256:estimateDeterministicHash(value)};
 });
 // All old parameters, formulas, resources (including the couplers need), sources and payment owners remain byte-semantic exact.
 return {...parent,parameters:[...parent.parameters,...params],formulas:[...parent.formulas,...d.formulas],resources:[...parent.resources,...rows]};
}
export function p31Ep341213PhysicalReferenceCompletenessMapR1(){
 const prior=parentPack.independentCompletenessMap;
 return {...prior,evidenceReferences:[...prior.evidenceReferences,pack.source.officialUrl,pack.source.locatorRu],entries:[...prior.entries,
  {expectedResourceId:pack.normId+':physical-side-plates',operationId:'ep-physical-assembly-reference',category:'material',unitId:'pcs',
   specification:pack.public.specificationRu,condition:'EXACT_PARENT_BLIND_EP341213_PHYSICAL_REFERENCE_ONLY',sourceId:pack.sourceId,
   quantityRule:'TWO_PHYSICAL_SIDE_PLATES_PER_ACCEPTED_JOINT_NOT_SKU_OR_CARTON',formulaId:pack.prefix+':formula:side-plates-required',resolution:{kind:'ROW',rowId:pack.rowId}}]};
}
