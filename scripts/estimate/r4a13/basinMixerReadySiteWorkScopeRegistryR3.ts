import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {basinMixerGrohe33265002PackR1 as product} from '../../../src/lib/estimate/v4/basinMixerGrohe33265002KitR1';
import {basinMixerReadySiteMinimumInputR3 as profile} from '../../../src/lib/estimate/v4/basinMixerReadySiteMinimumInputR3';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as hash,resolveMasterSingleDefinitionLocatorExcerptSha256R1} from './prepareMasterSingleDefinitionSuccessorR1';
import type {MasterScopedNormativeRegistryInputR1} from './masterScopedNormativeRegistryPreimageR1';

export const mixerReadySiteRecipePathR3='data/estimate-benchmarks/source-packs/basin-mixer-ready-site-work-scope-r3.json';
export const mixerReadySiteSourceIdR3='project_mixer_ready_site_work_scope_r3';
export const mixerReadySiteNormIdR3='DECLARED-READY-SITE-COMPLETE-MIXER-INSTALLATION-R3';
export const mixerReadySiteContractR3='gox-build.basin-mixer-ready-site-minimum-input/r3';
export const mixerReadySiteStopCodeR3='BASIN_MIXER_READY_SITE_MINIMUM_INPUT_R3';
const uuid=(seed:string)=>{const b=Buffer.from(hash(seed).slice(0,32),'hex');b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;const h=b.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};

/** Existing registry descriptor only. The recipe declares an exact work/order
 * boundary and cites the retained product passport; it is not a new physical norm. */
export function basinMixerReadySiteWorkScopeRegistryR3(){
 const bytes=readFileSync(mixerReadySiteRecipePathR3),recipe=JSON.parse(bytes.toString('utf8'));
 const artifactSha256=createHash('sha256').update(bytes).digest('hex');
 const sourceMetadata={source_title:'Монтаж комплектного смесителя: готовое место и новый заказ по потребности',
  source_authority:recipe.authority,source_kind:recipe.sourceKind,official_url:null,artifact_sha256:artifactSha256,
  exact_locator:'declaredWorkScope + manufacturerReference, complete installation item and included ordinary tools',
  use_restriction:profile.scopeRu+' Граница работы явно выбрана пользователем; нормы времени, цены и инвентаризация склада не заявлены. Комплектность только выбранного изделия по сохранённому паспорту.'};
 const ids=['kit-consumed',...product.components.map(c=>c.id)].map(key=>profile.prefix+':'+key);
 const binding={rowId:ids[0]!,additionalRowIds:ids.slice(1),applicability:{
  selectedWorkScope:true,oneSelectedProductPerInstallation:true,manufacturerLaborNormClaimed:false,
  actualWarehouseInventoryClaimed:false,includedComponentsAreNotSeparateOrders:true}};
 const locator={key:'READY-SITE-COMPLETE-MIXER-NEW-ORDER-R3',payload:{
  kind:recipe.sourceKind,normId:mixerReadySiteNormIdR3,recipePath:mixerReadySiteRecipePathR3,recipeSha256:artifactSha256,
  declaredWorkScope:recipe.declaredWorkScope,manufacturerReference:{...recipe.manufacturerReference,
   sourceId:product.sourceId,artifactPath:product.source.path,artifactSha256:product.source.sha256,
   officialUrl:product.source.officialUrl,exactLocatorRu:product.source.locatorRu},
  sourceNormativeBindingRowIds:ids,universalProductivityClaimed:false,universalConsumptionClaimed:false}};
 const sourceId=uuid(`${mixerReadySiteContractR3}:${mixerReadySiteSourceIdR3}:source`);
 const managedSource={id:sourceId,source_key:mixerReadySiteSourceIdR3,title_ru:sourceMetadata.source_title,
  authority:sourceMetadata.source_authority,official_url:null,artifact_sha256:artifactSha256,effective_from:null,effective_to:null,
  metadata:{contract:mixerReadySiteContractR3,sourceKind:sourceMetadata.source_kind,useRestriction:sourceMetadata.use_restriction,
   universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}};
 const managedLocators=[{id:uuid(`${mixerReadySiteContractR3}:${mixerReadySiteSourceIdR3}:${locator.key}:locator`),
  source_id:sourceId,locator_key:locator.key,locator:locator.payload,
  excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode:mixerReadySiteStopCodeR3,sourceMetadata,locator,binding})}];
 return{sourceMetadata,locator,binding,managedSource,managedLocators};
}

export function basinMixerReadySiteWorkScopeCaptureInputR3():MasterScopedNormativeRegistryInputR1{
 const r=basinMixerReadySiteWorkScopeRegistryR3();
 return{config:{stopCode:mixerReadySiteStopCodeR3,normId:mixerReadySiteNormIdR3,
  binding:{retainParentBindings:{capturedSourcePreimage:{sourceKey:mixerReadySiteSourceIdR3,expected:null}}}},
  newSource:r.managedSource,newLocators:r.managedLocators};
}
