import {createHash} from 'node:crypto';
import pack from '../../../data/estimate-benchmarks/source-packs/knauf-manual-scope-correction-seven-s27-74.json';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

const hash=(value:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
const base='plaster:krer15-manual-base:';
const preparation='plaster:knauf-materials:open-preparation';
const primer='plaster:knauf-materials:open-primer-labour';
const oldPreparation='Обеспыливание входит в базовую операцию только при подтверждённой применимости КРЕР. Остальная подготовка и неподтверждённые условия сохраняют открытый труд; повторная оплата обеспыливания не допускается.';
const oldSummary='При подтверждённых условиях КРЕР добавлены базовый труд и три механизма ручной штукатурки. Подготовка вне обеспыливания, дополнительная отделка, грунтование, фактический инструмент и завершение сохраняют открытые потребности.';

function description(text:unknown):unknown {
  if(typeof text!=='string')return text;
  if(text===oldPreparation)return pack.preparationDetailsRu;
  if(text===oldSummary)return pack.summaryRu;
  return text.replace(pack.oldScopeRu,pack.scopeRu);
}

function publicPresentation(row:Json,nameRu:string,detailsRu:string[]) {
  const old=row.resource_graph?.publicResourcePresentationV1;
  return {contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,nameRu,
    brandAndModelRu:old?.brandAndModelRu??null,specificationRu:old?.specificationRu??null,
    detailsRu:[...new Set(detailsRu.filter(Boolean))]};
}

/** Text and authored display only. This never resolves a need or adds a norm. */
export function knaufManualScopeResourceS2774(resource:Json,surface:'WALL'|'CEILING'):Json {
  const kind=String(resource.row_id).startsWith(base)?String(resource.row_id).slice(base.length):null;
  const names:Record<string,string>={workers:surface==='CEILING'?pack.baseNamesRu.workersCeiling:pack.baseNamesRu.workersWall,
    loader:pack.baseNamesRu.loader,lift:pack.baseNamesRu.lift,mixer:pack.baseNamesRu.mixer,operators:pack.baseNamesRu.operators};
  const need=[...pack.openNeedNames,...pack.materialNames].find(item=>item.rowId===resource.row_id&&item.sourceTitleRu===resource.title_ru);
  if(!kind&&!need)return resource;
  if(kind&&(!names[kind]||resource.source_metadata?.sourceRole!=='PINNED_CONDITIONAL_KRER_MANUAL_BASE_NORM'
    ||resource.resource_graph?.operationCompositionV1?.operationId!==base+'base'))throw Error('KNAUF_SCOPE_ORIGINAL_BASE_OWNER_REQUIRED');
  const result=structuredClone(resource),oldTitle=String(resource.title_ru);
  const oldDetails: string[]=Array.isArray(resource.resource_graph?.publicResourcePresentationV1?.detailsRu)
    ?resource.resource_graph.publicResourcePresentationV1.detailsRu.map(description):[];
  if(kind){
    result.title_ru=names[kind]!;
    result.resource_graph={...result.resource_graph,operationCompositionV1:{...result.resource_graph.operationCompositionV1,
      operationTitleRu:surface==='CEILING'?'Ручное оштукатуривание потолка':'Ручное оштукатуривание стены',
      completionCriterionRu:pack.completionCriterionRu}};
    const details=oldDetails.filter(text=>!text.includes('Дополнительная отделка и грунтование этой строкой не закрыты.'));
    if(kind==='workers')details.push('Труд машинистов входит в эксплуатацию машин и не оплачивается второй раз.',pack.primerBoundaryRu);
    result.resource_graph.publicResourcePresentationV1=publicPresentation(result,result.title_ru,details);
  }else if(need){
    let details=oldDetails;
    if(result.row_id===preparation){
      result.title_ru=need.nameRu;details=[pack.preparationDetailsRu];
      if(Object.hasOwn(result.source_metadata??{},'fullUnresolvedScopeTitleRu'))result.source_metadata={...result.source_metadata,
        fullUnresolvedScopeTitleRu:pack.preparationDetailsRu};
      if(result.source_metadata?.conditionalBaseNormOverlap)result.source_metadata={...result.source_metadata,
        conditionalBaseNormOverlap:{...result.source_metadata.conditionalBaseNormOverlap,residualRu:pack.preparationDetailsRu}};
    }else if(result.row_id===primer){
      result.title_ru=need.nameRu;details=[oldTitle,pack.primerBoundaryRu];
    }else details=[...details,oldTitle];
    result.resource_graph={...result.resource_graph,publicResourcePresentationV1:publicPresentation(result,need.nameRu,details)};
  }
  const {row_sha256:_sha,...body}=result;
  result.row_sha256=hash(body);
  return result;
}

export function overlayS2774KnaufManualScopeCorrection(parent:PurchaseGroupRepresentative) {
  const target=pack.targets.find(item=>item.catalogId===parent.definition.catalog_id);
  if(!pack.scopeCorrectionAdmitted||!target||parent.definition.id!==target.predecessorDefinitionId
    ||Number(parent.definition.definition_version)!==target.predecessorVersion
    ||parent.definition.definition_sha256!==target.predecessorDefinitionSha256||hash(parent)!==target.parentInputSha256)
    throw Error('KNAUF_SCOPE_EXACT_FROZEN_MANUAL_PARENT_REQUIRED');
  if(parent.resources.length!==113||parent.resources.filter(row=>String(row.row_id).startsWith(base)).length!==5
    ||!parent.resources.some(row=>row.row_id===preparation)||!parent.resources.some(row=>row.row_id===primer))
    throw Error('KNAUF_SCOPE_ORIGINAL_OWNER_SET_REQUIRED');
  const result=structuredClone(parent),surface=target.catalogId.includes('_ceiling_')?'CEILING':'WALL';
  result.resources=result.resources.map(row=>knaufManualScopeResourceS2774(row,surface));
  for(const parameter of result.parameters){
    const guide=parameter.truth_metadata?.guide;
    if(guide)parameter.truth_metadata={...parameter.truth_metadata,guide:{...guide,
      ...(typeof guide.applicability==='string'?{applicability:description(guide.applicability)}:{}),
      ...(typeof guide.guide_short_ru==='string'?{guide_short_ru:description(guide.guide_short_ru)}:{})}};
    if(parameter.parameter_id==='knauf_open_preparation'||parameter.parameter_id==='knauf_open_primer_labour'){
      const prep=parameter.parameter_id==='knauf_open_preparation';
      parameter.title_ru=prep?'Подготовка бетонного основания':'Нанесение грунтовки Бетогрунд';
      parameter.truth_metadata={...parameter.truth_metadata,guide:{...parameter.truth_metadata.guide,
        guide_short_ru:prep?pack.preparationDetailsRu:pack.primerBoundaryRu}};
    }
    if(result.baseline.guide_provenance_ru[parameter.parameter_id]!=null)
      result.baseline.guide_provenance_ru[parameter.parameter_id]=description(result.baseline.guide_provenance_ru[parameter.parameter_id]);
  }
  result.baseline.guide_provenance_ru.knauf_open_preparation=pack.preparationDetailsRu;
  result.baseline.guide_provenance_ru.knauf_open_primer_labour=pack.primerBoundaryRu;
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(parameter=>({parameterId:parameter.parameter_id,unitId:parameter.unit_id,
    valueType:parameter.value_type,constraints:parameter.constraints_json,truth:parameter.truth_metadata})));
  result.definition.passport={...result.definition.passport,manualScopeCorrectionContract:pack.contract,
    workDescription:{...result.definition.passport.workDescription,scopeSummary:pack.summaryRu}};
  result.definition.applicability={...result.definition.applicability,
    includedScopeRu:(result.definition.applicability.includedScopeRu as Json[]).map(description)};
  result.passport.included_scope_ru=(result.passport.included_scope_ru as Json[]).map(description);
  result.passport.decision={...result.passport.decision,manualScopeCorrectionContract:pack.contract,
    completeTechnicalEstimateAccepted:false,
    baseNormOverlapDisposition:result.passport.decision.baseNormOverlapDisposition.map((item:Json)=>item.existingNeedRowId===preparation
      ?{...item,residualRu:pack.preparationDetailsRu}:item)};
  return {representative:result,originalDefinitionId:target.predecessorDefinitionId,newQuantityNorms:0,newCostOwners:0,
    newIncludedRelationships:0,newCompleteTechnicalTypes:0,openPreparationAndPrimerLabourRetained:true};
}
