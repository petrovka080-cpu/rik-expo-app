import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {knaufInteriorPlasterBaseLabourPackS2763 as pack,knaufInteriorPlasterBaseLabourDefinitionS2763,knaufPlasterLabourPrefixS2763 as prefix,knaufPlasterBaseAdmittedGuardS2763} from '../../../src/lib/estimate/v4/knaufInteriorPlasterBaseLabourS2763';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
import technicalBinding from '../../../data/estimate-benchmarks/source-packs/knauf-technical-two-bindings-s27-69.json';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
export const S2763_KNAUF_INTERIOR_PLASTER_LABOUR_TARGETS=Object.fromEntries(pack.targets.map(t=>[t.catalogId,t.preservedOwners.map(x=>x.rowId)]));

export function overlayS2763KnaufInteriorPlasterBaseLabour(parent:PurchaseGroupRepresentative,locators:{wall:string;ceiling:string;guidance:string}) {
  const catalogId=String(parent.definition.catalog_id),technical=technicalBinding.targets.find(t=>t.catalogId===catalogId);
  const target=pack.targets.find(t=>t.catalogId===catalogId)??(technical&&parent.definition.source_metadata.technicalMaterialBindingContract===technicalBinding.contract
    ?{...technical,surface:catalogId.includes('ceiling_')?'CEILING':'WALL',normId:catalogId.includes('ceiling_')?'15-02-019-04':'15-02-019-03',parentResourceCount:108}:undefined);
  if(!target||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.resources.length!==target.parentResourceCount)throw Error('KNAUF_LABOUR_EXACT_PARENT_DRIFT');
  for(const old of target.preservedOwners){const row=parent.resources.find(x=>x.row_id===old.rowId);if(!row||row.id!==old.resourceSpecId||row.cost_owner_id!==old.costOwnerId||row.unit_id!==old.unitId||row.formula_id!==old.formulaId)throw Error('KNAUF_LABOUR_PARENT_OWNER_DRIFT:'+old.rowId);}
  const result=structuredClone(parent),addedRowIds:string[]=[],addedParameterIds:string[]=[],ownerDisposition:Record<string,unknown>[]=[];
  const retitle=(rowId:string,title:string,details?:string[])=>{const row=result.resources.find(x=>x.row_id===rowId);if(!row)throw Error('KNAUF_LABOUR_RETITLE_MISSING:'+rowId);
    row.title_ru=title;const presentation=row.resource_graph.publicResourcePresentationV1;
    if(presentation)row.resource_graph={...row.resource_graph,publicResourcePresentationV1:{...presentation,sourceTitleRu:title,nameRu:title,...(details?{detailsRu:details}:{})}};
    const {row_sha256:_sha,...body}=row;row.row_sha256=hash(body);};
  for(const row of parent.resources.filter(r=>r.row_id.startsWith('plaster:knauf-materials:')&&r.title_ru.includes('стоимость за кг этого SKU')))
    retitle(row.row_id,row.title_ru.replace('стоимость за кг этого SKU','цена за 1 кг'));
  if(!target.primerOnly){
    const shared=knaufInteriorPlasterBaseLabourDefinitionS2763(target.surface as 'WALL'|'CEILING',Boolean(technical));
    const admittedGuard=shared.resources[0]!.inclusion_ast;
    let po=Math.max(...result.parameters.map(p=>Number(p.ordinal)))+1,ro=Math.max(...result.resources.map(r=>Number(r.ordinal)))+1;
    for(const p of shared.parameters){if(result.parameters.some(x=>x.parameter_id===p.parameter_id))throw Error('KNAUF_LABOUR_PARAMETER_COLLISION');result.parameters.push({...p,ordinal:po++});addedParameterIds.push(p.parameter_id);}
    result.formulas.push(...shared.formulas.map(f=>({...f,ast_sha256:hash(f.ast)})));
    for(const r of shared.resources){if(result.resources.some(x=>x.row_id===r.row_id))throw Error('KNAUF_LABOUR_RESOURCE_COLLISION');const {row_sha256:_sha,...body}=r;
      const final={...body,ordinal:ro++,row_type:r.category,semantic_owner:catalogId+':'+r.row_id,cost_owner_id:catalogId+':'+r.cost_owner_id};
      result.resources.push({...final,row_sha256:hash(final)});addedRowIds.push(r.row_id);
      result.bindings.push({row_id:r.row_id,locator_id:target.surface==='CEILING'?locators.ceiling:locators.wall,applicability:{contract:pack.contract,selectedBranch:admittedGuard,normId:target.normId,completeTechnicalEstimateAccepted:false}});
    }
    const q=result.parameters.find(p=>p.parameter_id==='q')!;q.title_ru='Площадь штукатурки этого участка, м²';
    if(technical){const rule=target.surface==='CEILING'?pack.measurementRules.ceiling.ruleRu:pack.measurementRules.wall.ruleRu;
      q.truth_metadata={...q.truth_metadata,guide:{...q.truth_metadata.guide,guide_short_ru:rule+' '+pack.measurementRules.reveals.ruleRu,
        source_role:'PROJECT_DOCUMENTATION',source_snapshot_hash:pack.sources[target.surface==='CEILING'?1:0].sha256}};
      result.definition.passport={...result.definition.passport,applicationNormSelectionV1:{contract:technicalBinding.contract,
        normativeBasisRu:'КРЕР Кыргызской Республики, базовая ручная штукатурка',measurementRuleRu:rule,
        objectConditionsConfirmedByDefault:false,parameterId:'krer15_manual_conditions'}};
    }
    const residuals=[
      ['main-labour','Ручное оштукатуривание — труд вне подтверждённой базовой операции, включая требуемое дополнительное заглаживание',
        'При принятой базовой норме её приготовление, нанесение, затирка и плоские углы оплачиваются только отдельным нормативным владельцем. Здесь остаётся требуемая отделка сверх этой границы; при неприменимой норме непокрытый основной труд также остаётся открытым.'],
      ['preparation','Подготовка бетона вне подтверждённого обеспыливания: осмотр, очистка загрязнений, ремонт и разметка',
        'Обеспыливание входит в базовую операцию только при подтверждённой применимости КРЕР. Остальная подготовка и неподтверждённые условия сохраняют открытый труд; повторная оплата обеспыливания не допускается.'],
      ['logistics','Доставка, обратная тара и подача материалов вне подтверждённых нормативных погрузчика и подъёмника',
        'Нормативные погрузчик и подъёмник относятся только к принятой базовой операции. Доставка от поставщика, дополнительная разгрузка и иная логистика остаются открытыми; основная нормативная подача не оплачивается повторно.'],
    ] as const;
    for(const [id,title,detail]of residuals){const rowId='plaster:knauf-materials:open-'+id;retitle(rowId,title,[detail]);const row=result.resources.find(r=>r.row_id===rowId)!;
      const source=pack.sources[target.surface==='CEILING'?1:0],guidance=pack.sources[2];
      const refs=[{sourceId:source.id,sha256:source.sha256,locator:target.normId+'; КРЕР15 PDF137–138'},{sourceId:guidance.id,sha256:guidance.sha256,locator:'Общие указания PDF3 п1.7; PDF9 п4.2'}];
      row.source_metadata={...row.source_metadata,conditionalBaseNormOverlap:{contract:pack.contract,when:admittedGuard,baseOwnerRowIds:addedRowIds,residualRu:detail,automaticResidualQuantityAccepted:false,supportingSourceRefs:refs}};
      const p=result.parameters.find(p=>p.parameter_id==='knauf_open_'+id.replaceAll('-','_'))!;p.title_ru=title;p.truth_metadata={...p.truth_metadata,provenance:{...p.truth_metadata.provenance,supporting_source_refs:refs},guide:{...p.truth_metadata.guide,guide_short_ru:detail,
        source_id:source.id,source_title:source.titleRu,source_document:source.id,source_document_version:source.printedEdition,source_snapshot_hash:source.sha256,source_sha256:source.sha256,source_artifact_sha256:source.sha256,definition_hash:source.sha256,artifact_sha256:source.sha256,source_locator:target.normId+'; PDF137–138',exact_locator:target.normId+'; PDF137–138',verified_at:source.reviewedAt}};
      const {row_sha256:_sha,...body}=row;row.row_sha256=hash(body);ownerDisposition.push({existingNeedRowId:rowId,retainedCostOwnerId:row.cost_owner_id,baseOwnerRowIds:addedRowIds,quantityRemainsUnconfirmed:true,residualRu:detail});
    }
    const mixerNeed=result.resources.find(r=>r.row_id==='plaster:knauf-materials:open-mixing-tool')!;
    mixerNeed.source_metadata={...mixerNeed.source_metadata,physicalToolNotMachineHour:true,avoidDuplicateBaseMixingCharge:true};
    const {row_sha256:_sha,...body}=mixerNeed;mixerNeed.row_sha256=hash(body);
    result.baseline.normative_source_ids.q=[...new Set([...(result.baseline.normative_source_ids.q??[]),pack.contract+':'+(target.surface==='CEILING'?'ceiling':'wall')])];
  }
  const consumers=buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:catalogId+':'+id,formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];result.baseline.uom_by_parameter[id]=p.unit_id;
    result.baseline.normative_source_ids[id]??=[];result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;}
  result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',priceState:'PARTIAL_NEEDS_PRICE',completeTechnicalEstimateAccepted:false,activationAllowed:false,productionEligible:false,
    labourHourNormClosureCount:target.primerOnly?0:1,machineHourNormClosureCount:target.primerOnly?0:3,operatorInformationalNormConsumerCount:target.primerOnly?0:1,baseNormOverlapDisposition:ownerDisposition,wholePlasterGroupComplete:false};
  if(!target.primerOnly)result.passport.capability_matrix=result.passport.capability_matrix.map((c:Record<string,unknown>)=>c.capability==='FORMULAS_AND_PHYSICAL_PARITY'?{...c,scope:'CONDITIONAL_MATERIAL_AND_KRER_BASE_NORM'}:c);
  const summary=target.primerOnly?parent.passport.included_scope_ru[0]:'При подтверждённых условиях КРЕР добавлены базовый труд и три механизма ручной штукатурки. Подготовка вне обеспыливания, дополнительная отделка, грунтование, фактический инструмент и завершение сохраняют открытые потребности.';
  result.definition.passport={...result.definition.passport,rowCount:result.resources.length,baseLabourSeriesContract:pack.contract,workDescription:{...result.definition.passport.workDescription,scopeSummary:summary},
    conditionalBaseNorm:{contract:pack.contract,sourceIds:target.primerOnly?[]:pack.sources.map(s=>s.id),normId:target.primerOnly?null:target.normId,conditions:target.primerOnly?null:knaufPlasterBaseAdmittedGuardS2763,fullTechnicalEstimateAccepted:false}};
  if(!target.primerOnly){result.definition.applicability={...result.definition.applicability,includedScopeRu:[summary,pack.scopeRu],baseNormConditions:knaufPlasterBaseAdmittedGuardS2763};result.passport.included_scope_ru=[summary,pack.scopeRu];}
  return{representative:result,ownerDisposition,legacyRowIds:[],addedRowIds,addedParameterIds,newMaterialNormClosureCount:0,newPhysicalNormClosureCount:target.primerOnly?0:4,newWorkerNormClosureCount:target.primerOnly?0:1,newMachineNormClosureCount:target.primerOnly?0:3};
}
