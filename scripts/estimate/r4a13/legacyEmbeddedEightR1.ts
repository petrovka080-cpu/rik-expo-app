import {strict as assert} from 'node:assert';
import observed from '../../../data/estimate-benchmarks/fixtures/legacy-embedded-eight-current-parents-r1.json';
import {buildConcreteFoundationAtomicConstructionR1 as buildAtomic,
 CONCRETE_FOUNDATION_ATOMIC_CONSTRUCTION_PROFILES_R1 as profiles} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import {buildAutomaticConstructionOwnerR1} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {CanonicalEstimateParameterDefinition as Parameter,CanonicalEstimateResourceDefinition as Resource} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';

type Json=Record<string,any>;
export const legacyEmbeddedEightContractR1='rik-expo-app.legacy-embedded-eight-project-composition.r1';
export const LEGACY_EMBEDDED_EIGHT_TARGETS_R1=observed.targets;
export const LEGACY_EMBEDDED_EIGHT_PRESERVED12_R1=observed.preserved12CatalogIds;
const repairMethod='Закладные устанавливаются до бетонирования локально заменяемого участка по утверждённому проекту';
const stairGeometry='Рабочие чертежи лестничных маршей и площадок: номера элементов, верхние и нижние поверхности, кромки, опорные узлы, отметки и координаты закладных. Количество и масса закладных определяются ведомостью изделий, а не объёмом бетона.';

/** Reuse the accepted cast-in operation, its direct project takeoff and payment
 * predicates. No quantities, labor rates or defaults are borrowed from a slab.
 * The old59-row whole-structure estimate remains an immutable historical model. */
export function buildLegacyEmbeddedEightR1(parent:Json){
 const catalogId=String(parent.definition.catalog_id),target=observed.targets.find(t=>t.catalogId===catalogId);
 assert(target,'LEGACY_EMBEDDED_EIGHT_EXACT_TARGET_REQUIRED');
 assert.equal(parent.definition.id,target.definitionId);assert.equal(parent.definition.definition_version,target.version);
 assert.equal(parent.definition.definition_sha256,target.definitionSha256);assert.equal(parent.baseline.id,target.baselineId);
 assert.equal(parent.baseline.parameter_schema_sha256,target.parameterSchemaSha256);
 assert.equal(parent.parameters.length,1);const old=parent.parameters[0];assert.equal(old.parameter_id,'q');assert.equal(old.unit_id,'m3');assert.equal(old.default_value,100);
 assert.deepEqual(parent.resources.map((r:Json)=>({rowId:r.row_id,sha256:r.row_sha256})),target.legacyRows);
 const sourceFamily=target.family==='stairs_concrete'?'slab_foundation':target.family;
 const sourceContext=target.contextKey==='repair'?'standard':target.contextKey;
 const sourceProfile=profiles.find(p=>p.operation==='anchor'&&p.family===sourceFamily&&p.contextKey===sourceContext);
 assert(sourceProfile,'LEGACY_EMBEDDED_EIGHT_REUSABLE_CAST_IN_PROFILE_REQUIRED');
 const source=buildAtomic(sourceProfile.catalogId);
 const adapt=(value:unknown):any=>{
  if(Array.isArray(value))return value.map(adapt);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,adapt(v)]));
  if(typeof value!=='string')return value;
  let result=value.replaceAll(sourceProfile.catalogId,catalogId)
   .replaceAll(sourceProfile.pairedPlacementCatalogId,target.pairedPlacementCatalogId)
   .replaceAll(sourceProfile.titleRu,target.titleRu);
  if(target.family==='stairs_concrete')result=result.replaceAll(sourceProfile.geometryRequirementRu,stairGeometry)
   .replaceAll('плитного фундамента','бетонной лестницы').replaceAll('плитным фундаментом','бетонной лестницей')
   .replaceAll('плитном фундаменте','бетонной лестнице').replaceAll('плитный фундамент','бетонная лестница');
  return result;
 };
 const parameters:(Parameter&{title_ru?:string})[]=adapt(source.parameters),formulas=adapt(source.formulas);
 const resources:Resource[]=adapt(source.resources);
 // These references concern the construction/payment decision, not the user's
 // knowledge of publisher versions or the previous59 implementation rows.
 const decision=parameters.find(p=>p.parameter_id==='foundation_scope_forward_decision_reference');assert(decision);
 decision.title_ru='Подтверждённые границы монтажа закладных и отдельной оплаты смежных работ';
 const boundary=parameters.find(p=>p.parameter_id==='foundation_paid_owner_boundary');assert(boundary);
 boundary.title_ru='Подтверждённая отдельная физическая граница монтажа закладных без уже оплаченного объёма укладки или полной конструкции';
 if(target.contextKey==='repair'){
  const extra=buildAutomaticConstructionOwnerR1({contract:legacyEmbeddedEightContractR1,semanticOwner:catalogId,
   sourceId:'project_approved_foundation_geometry_method_and_scope',normId:'project-facts-no-universal-norm',
   sourceMetadata:{source_title:'Утверждённый проект локальной замены бетона и установки закладных',source_document_version:'project-defined-required-input',
    definition_hash:'42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50',artifact_sha256:'42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50',exact_locator:'Проектный узел закладной в локально заменяемом бетоне и отдельная граница оплаты ремонтных работ'},
   applicabilityRu:target.titleRu,ordinary:[
    {id:'embedded_local_repair_method',title:'Подтверждённая технология закладной в зоне локального ремонта; анкеровка в готовом бетоне сюда не входит',valueType:'enum',unitId:null,kind:'ordinary',values:[repairMethod]},
    {id:'embedded_local_repair_scope_reference',title:'Проектный узел закладной в локально заменяемом бетоне и подтверждение отдельной оплаты ремонта основания',valueType:'text',unitId:null,kind:'ordinary'}],
   profile:[],conditional:[],rows:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Automatic conversion of old q in m3 into embedded item count','Repair or post-installed anchors charged as cast-in installation']});
  parameters.push(...extra.parameters);
  for(const row of resources)row.resource_graph={...row.resource_graph,inputParameterIds:[...new Set([
   ...(Array.isArray(row.resource_graph.inputParameterIds)?row.resource_graph.inputParameterIds as string[]:[]),...extra.parameters.map(p=>p.parameter_id)])]};
 }
 for(const row of resources){
  row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false,
   legacyEmbeddedEightContract:legacyEmbeddedEightContractR1,constructionProfileId:catalogId};
  const {row_sha256:_old,...content}=row;row.row_sha256=estimateDeterministicHash(content);
 }
 assert(parameters.every(p=>p.default_value==null));assert(!parameters.some(p=>p.parameter_id==='q'));
 assert.equal(parameters.find(p=>p.parameter_id===source.primaryMeasureParameterId)?.unit_id,'piece');
 assert.equal(source.primaryMeasureParameterId,'embedded_item_count_piece');assert.equal(resources.length,66);
 const oldIds=new Set(parent.resources.map((r:Json)=>r.row_id));assert(resources.every(r=>!oldIds.has(r.row_id)),'LEGACY_EMBEDDED_EIGHT_UNREVIEWED_OLD_ROW_ALIAS');
 assert(!resources.some(r=>/бетонная смесь|арматура для|опалубочный материал/u.test(r.title_ru)),'WHOLE_STRUCTURE_SCOPE_LEAKED_INTO_EMBEDDED_WORK');
 return {contract:legacyEmbeddedEightContractR1,catalogId,titleRu:target.titleRu,target,
  sourceProfileCatalogId:sourceProfile.catalogId,primaryMeasureParameterId:source.primaryMeasureParameterId,
  parameters,formulas,resources,subworks:adapt(source.subworks),
  scopeRu:'Установка закладных деталей до бетонирования по утверждённой ведомости количества и массы. Бетонирование, арматура и опалубка конструкции, ремонт основания и последующие механические/химические анкеры оплачиваются отдельно, если предусмотрены проектом.',
  historicalParent:{definitionId:target.definitionId,version:target.version,definitionSha256:target.definitionSha256,baselineId:target.baselineId},
  historicalRowsNotAutomaticallyMigrated:target.legacyRows.map(r=>r.rowId),oldPrimaryQuantityAutomaticallyMapped:false,
  newRuntimeDefaults:0,engineeringAccepted:false,completeRealProjectEstimateAccepted:false,confirmedSupplierOrder:false};
}
