import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {flatRoofScopePackS2765 as pack} from '../../../src/lib/estimate/v4/flatRoofScopeS2765';
import {sourcePinnedRoofNormGuardsR1,type SourcePinnedRoofNormPackR1} from '../../../src/lib/estimate/v4/sourcePinnedRoofNormOwnerR1';
import type {CanonicalScopeRequirementV1} from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2765_FLAT_ROOF_SCOPE_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(x=>x.rowId)]));
export function overlayS2765FlatRoofScope(parent:PurchaseGroupRepresentative,locators:{roof:string;guidance:string}) {
  const catalogId=String(parent.definition.catalog_id),target=pack.targets.find(t=>t.catalogId===catalogId);
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==target.preservedOwners.length)throw Error('ROOF_SCOPE_EXACT_PARENT_DRIFT');
  for(const old of target.preservedOwners){const r=parent.resources.find(r=>r.row_id===old.rowId);if(!r||r.id!==old.resourceSpecId||r.cost_owner_id!==old.costOwnerId||r.unit_id!==old.unitId||r.formula_id!==old.formulaId)throw Error('ROOF_SCOPE_OWNER_DRIFT:'+old.rowId);}
  const result=structuredClone(parent),guards=sourcePinnedRoofNormGuardsR1(pack as unknown as SourcePinnedRoofNormPackR1),source=pack.sources.find(s=>s.kind==='roof')!;
  const evidence=[{sha256:source.sha256,locator:source.locators}];
  const ownerDisposition:Record<string,unknown>[]=[];
  const assign=(rowId:string,spec:Omit<CanonicalScopeRequirementV1,'contractVersion'|'exactScopeWhen'|'sourceEvidence'>)=>{
    const row=result.resources.find(r=>r.row_id===rowId);
    if(!row||row.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'||row.procurement_eligible!==false||row.source_metadata.sourceNormQuantityAccepted!==false)throw Error('ROOF_SCOPE_INFORMATIONAL_PARENT_REQUIRED:'+rowId);
    const scope:CanonicalScopeRequirementV1={contractVersion:'canonical-scope-requirement/v1',exactScopeWhen:guards.admitted,sourceEvidence:evidence,...spec};
    row.resource_graph={...row.resource_graph,scopeRequirementV1:scope};
    row.source_metadata={...row.source_metadata,scopeClassificationContract:pack.contract,numericNormClosed:false};
    const {row_sha256:_sha,...body}=row;row.row_sha256=hash(body);
    const binding=result.bindings.find(b=>b.row_id===row.row_id);
    if(!binding)throw Error('ROOF_SCOPE_PARENT_BINDING_MISSING:'+row.row_id);
    binding.applicability={...binding.applicability,contract:pack.contract,scopeClassificationOnly:true,numericQuantityAdmitted:false,
      completeTechnicalEstimateAccepted:false,previousLocatorId:binding.locator_id};
    binding.locator_id=locators.roof;
    ownerDisposition.push({rowId:row.row_id,costOwnerId:row.cost_owner_id,formulaId:row.formula_id,scope});
  };
  const fact=(id:string,value:string)=>({kind:'equals',parameterId:id,value});
  for(const d of pack.scopeClassification){
    const originalRowId=target.rowIdPrefix+d.suffix;
    if(!result.resources.some(r=>r.row_id===originalRowId))throw Error('ROOF_SCOPE_ORIGINAL_OBLIGATION_MISSING:'+d.suffix);
    const rowId=pack.prefix+':remaining:'+d.suffix;
    if(!result.resources.some(r=>r.row_id===rowId)){
      if(d.reviewDecision!=='NORM_COVERED')throw Error('ROOF_SCOPE_RESIDUAL_MISSING:'+d.suffix);
      ownerDisposition.push({originalRowId,coveredBy:d.includedNormRoles.map(role=>pack.prefix+':'+role),alreadyMappedWithoutResidual:true});continue;
    }
    assign(rowId,{kind:d.kind,groupId:d.groupId,groupTitleRu:d.groupTitleRu,titleRu:result.resources.find(r=>r.row_id===rowId)!.title_ru,
      reasonRu:d.reasonRu,coveringRowIds:d.includedNormRoles.map(role=>pack.prefix+':'+role),originalRowIds:[originalRowId],
      ...(d.satisfiedBy?{satisfiedWhen:d.satisfiedBy==='conditions'?fact(pack.conditionsParameterId,pack.conditionsYesRu):fact(pack.areaParameterId,pack.areaYesRu)}:{})});
  }
  for(const gap of pack.protectedAdditionalNeeds??[]){
    assign(pack.prefix+':source-gap:'+gap.key,{kind:'PROJECT_SCOPE',groupId:gap.key,groupTitleRu:gap.titleRu,titleRu:gap.titleRu,
      reasonRu:gap.key==='primer'?'Основание принято и огрунтовано: повторное грунтование этого участка не требуется. Марка, расход и цена ранее использованного грунта этим ответом не определяются; прежняя стоимость сохраняется у своего исполнителя.':gap.reasonRu,
      coveringRowIds:[],originalRowIds:[],...(gap.key==='primer'?{satisfiedWhen:fact(pack.conditionsParameterId,pack.conditionsYesRu)}:{})});
  }
  assign(pack.prefix+':remaining:scope_pending',{kind:'OBJECT_SCOPE',groupId:'system_selection',groupTitleRu:'Система кровли',
    titleRu:'Выбор системы кровли',reasonRu:'Укажите систему из проекта. Если она ещё не проверена, приложение сохраняет открытый состав без неподтверждённых количеств. Для прежнего общего состава нормы проверяются отдельно.',
    coveringRowIds:[],originalRowIds:[],objectFactParameterId:pack.systemParameterId,unknownObjectValues:[pack.unknownChoiceRu],legacyObjectValue:pack.legacyChoiceRu});
  const system=result.parameters.find(p=>p.parameter_id===pack.systemParameterId)!;
  const guide=system.truth_metadata.guide as Record<string,unknown>;
  system.truth_metadata={...system.truth_metadata,guide:{...guide,guide_short_ru:'Выберите систему, предусмотренную проектом для наружной кровли по готовому минеральному основанию. Для двух наплавляемых слоёв Изопласт ЭПП-4 снизу и ЭКП-4.5 сверху нормы рассчитываются автоматически. Другие материалы и технологии требуют своего состава.'}};
  result.baseline.guide_provenance_ru[pack.systemParameterId]=(system.truth_metadata.guide as Record<string,unknown>).guide_short_ru;
  result.baseline.normative_source_ids[pack.systemParameterId]=[...result.baseline.normative_source_ids[pack.systemParameterId],pack.contract+':roof'];
  for(const parameter of result.parameters)parameter.truth_metadata={...parameter.truth_metadata,contract:pack.contract,
    semantic_parameter_key:catalogId+':'+parameter.parameter_id};
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision={...result.passport.decision,scopeClassificationContract:pack.contract,scopeClassification:ownerDisposition,
    newPhysicalNormConsumers:0,newNumericNormClosures:0,completeTechnicalEstimateAccepted:false,wholeRoofGroupComplete:false};
  result.definition.passport={...result.definition.passport,scopeClassificationContract:pack.contract,fullTechnicalEstimateAccepted:false};
  return {representative:result,ownerDisposition,legacyRowIds:parent.resources.map(r=>r.row_id),addedRowIds:[],addedParameterIds:[],
    newPhysicalNormClosureCount:0,newWorkerNormClosureCount:0,newMachineNormClosureCount:0,newMaterialNormClosureCount:0};
}
