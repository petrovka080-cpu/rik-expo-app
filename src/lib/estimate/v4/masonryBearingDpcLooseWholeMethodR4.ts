import source from '../../../../data/estimate-benchmarks/source-packs/masonry-bearing-dpc-loose-whole-method-r4.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';

const pack=source;
const prefix='masonry:bearing-dpc:loose-polyolefin:r4';
const row=(key:string)=>prefix+':'+key;
const parameter=(key:string)=>'mdpc4_'+key;
export const MASONRY_BEARING_DPC_LOOSE_R4=pack;
export type MasonryDpcWallThicknessR4='0.25'|'0.4'|'0.5';

/** Reusable whole-method component of the current wall family. One straight,
 * unpenetrated bearing run is its exact geometry scope. It is not a second
 * wall card, a roof method, a publisher or a claim of whole-wall acceptance. */
export function buildMasonryBearingDpcLoosePartR4(wallThicknessM:MasonryDpcWallThicknessR4,lengthParameterId:string){
 const selected=pack.physical.selectedWidths.find(width=>width.wallThicknessM===wallThicknessM);
 if(!selected||!lengthParameterId.trim())throw Error('MASONRY_DPC_R4_EXACT_PROFILE_REQUIRED');
 const width=selected.stripWidthM,L=lengthParameterId;
 const rolls='max(1,ceil(('+L+'-0.2)/24.8))';
 const installed='('+L+'+0.2*(('+rolls+')-1))';
 const gross='25*('+rolls+')';
 const positive={kind:'greater_than',parameterId:L,value:0} as const;
 const norms:AutomaticParameterSpec[]=[
  {id:parameter('bed_m3'),title:'Объём совместимой выравнивающей постели под отсечкой влаги',valueType:'decimal',unitId:'m3',kind:'ordinary',min:0},
  {id:parameter('installation_h'),title:'Труд укладки и контроля отсечки влаги',valueType:'decimal',unitId:'man_hour',kind:'ordinary',min:0},
  {id:parameter('measuring_cutting_tools'),title:'Полное обеспечение измерения и резки полотна',valueType:'integer',unitId:'set',kind:'ordinary',min:0},
  {id:parameter('disposed_waste_kg'),title:'Масса передаваемых в отходы остатков полотна',valueType:'decimal',unitId:'kg',kind:'ordinary',min:0}
 ];
 const unresolved=pack.unresolvedDeveloperNorms;
 const resource=(key:string,title:string,category:string,unitId:string,expression:string):AutomaticRowSpec=>({rowId:row(key),formulaId:row('formula:'+key),section:pack.publicTitleRu,title,category,unitId,expression,inclusion:positive,costTreatment:'INFORMATIONAL_SCOPE',procurement:false});
 const rows:AutomaticRowSpec[]=[
  resource('strip-installed','Полотно для отсечки капиллярной влаги, ширина '+Math.round(Number(width)*1000)+' мм','material','m2',installed+'*'+width),
  resource('strip-gross-rolls','Цельный рулон полотна длиной 25 м, ширина '+Math.round(Number(width)*1000)+' мм','material','piece',rolls),
  resource('strip-offcuts','Остатки полотна после раскроя для повторного использования или сбора','material','m',gross+'-'+installed),
  resource('bed-mortar','Совместимый кладочный раствор для выравнивающей постели','material','m3',parameter('bed_m3')),
  resource('installation-labour','Укладка, нахлёсты и контроль отсечки капиллярной влаги','labor','man_hour',parameter('installation_h')),
  resource('measuring-cutting-tools','Инструмент измерения и резки полотна','tool','set',parameter('measuring_cutting_tools')),
  resource('disposed-waste','Передаваемые в отходы остатки полотна','material','kg',parameter('disposed_waste_kg'))
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:'OWN_MAKER_LOOSE_LAP_GEOMETRY_NOT_KRER08_RATE',sourceMetadata:{source_title:pack.publicTitleRu,source_document_version:'Own TDS12.21, DoP2016-06-09 and maker application snapshot2026-10-23',definition_hash:pack.sources[1].sha256,artifact_sha256:pack.sources[1].sha256,exact_locator:'Maker Application: fresh level mortar bed, one layer, loose overlap>=200mm, projection>=50mm; own TDS1 roll25m'},applicabilityRu:'Один прямой непрерывный участок опирания стены '+Math.round(Number(wallThicknessM)*1000)+' мм без отверстий, углов и ступеней. Собственная международная технология для отсечки капиллярной влаги. Грунтовка, клей, нагрев и кровельные нормы в выбранный способ не входят. Объём раствора и труд ещё требуют согласования с первым рядом стены.',ordinary:[{id:L,title:'Длина прямого участка стены',valueType:'decimal',unitId:'m',kind:'ordinary',min:0},...norms],profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No fixed mortar thickness or grade from sheet dimensions','No transferred roof material or labour','No inventory entered by consumer','No offcut automatically disposed as waste','No second paid first-course labour or mortar owner']});
 const reasons=new Map(norms.map((spec,index)=>[spec.id,unresolved[index].reason]));
 const parameters=built.parameters.map(value=>reasons.has(value.parameter_id)?{...value,required:false,default_value:null,truth_metadata:unresolvedApplicationNormTruthR1(value.truth_metadata,reasons.get(value.parameter_id)!)}:value);
 const operations=[['accept-base','Подготовка и приёмка опирания'],['cut-place','Разметка, резка и укладка полотна'],['lap-inspect','Нахлёсты и контроль непрерывности'],['first-course-close','Первый ряд и сбор остатков']] as const;
 const usedBy:Record<string,readonly number[]>={'strip-installed':[1,2,3],'strip-gross-rolls':[1],'strip-offcuts':[1,3],'bed-mortar':[0,3],'installation-labour':[0,1,2,3],'measuring-cutting-tools':[1,2],'disposed-waste':[3]};
 const resources=built.resources.map(value=>{const key=value.row_id.slice(prefix.length+1),uses=usedBy[key];const references=uses.map(index=>({operationId:row('operation:'+operations[index][0]),operationTitleRu:operations[index][1],processOrdinal:index+1,completionCriterionRu:'Связаны полный состав выбранного способа, непрерывность слоя и единственный владелец труда и раствора.'}));return{...value,resource_graph:{...value.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:pack.publicTitleRu,...references[0],additionalOperations:references.slice(1)},publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:value.title_ru,nameRu:value.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},source_metadata:{...value.source_metadata,sourceProfile:'OWN_INTERNATIONAL_LOOSE_DPC_STRAIGHT_RUN',wallThicknessM,stripWidthM:width,sourceDocumentEditions:['12.21','2016-06-09','web2026-10-23'],kgComplianceClaim:false,quantityBasis:['bed-mortar','installation-labour','measuring-cutting-tools','disposed-waste'].includes(key)?'UNRESOLVED_APPLICATION_NORM':'APPLICATION_GEOMETRY_FROM_OWN_MAKER_DIMENSIONS',grossRollsNotSecondConsumedStrip:key==='strip-gross-rolls',offcutsNotAutomaticWaste:key==='strip-offcuts',noAddedPaidOwner:true,noAddedProcurementOwner:true,fullTechnicalAcceptance:false}};});
 return{...built,parameters,resources,sourceId:pack.sourceId,wholeMethodOperations:operations.map(([key,titleRu])=>({operationId:row('operation:'+key),titleRu})),independentRequirements:pack.wholeOperations,closedParentNeedIds:[] as string[],wholeFamilyReady:false,fullTechnicalAcceptance:false};
}
