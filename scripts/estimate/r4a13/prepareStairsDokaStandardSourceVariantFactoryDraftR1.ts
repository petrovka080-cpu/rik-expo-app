// WORK factory draft only. No PG/client, CLI, process or write on import.
// Existing governed publisher retention opt-in and exact ROOT approval are pending.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {stairsDokaStandardVariantMapR1 as disposition,stairsDokaStandardVariantParentR1 as parent,
 buildStairsDokaStandardSourceVariantR1,compileStairsDokaStandardSourceVariantForTestR1} from '../../../src/lib/estimate/v4/stairsDokaStandardSourceVariantR1';
import {monolithicStair111PackR1 as source,monolithicStair111PrefixR1 as prefix,monolithicStair111CompletenessMapR1} from '../../../src/lib/estimate/v4/monolithicStairDokaKrer06Column11101R1';
import retentionJson from '../../../data/estimate-benchmarks/fixtures/stairs-doka-standard-retention-declaration-r1.json';

type Json=Record<string,any>;
const sha=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const d=buildStairsDokaStandardSourceVariantR1();
const selected={kind:'selected',parameterId:'stairs_quantity_source_variant',value:'KRER06_111_01_DOKA'};

/** Data for the ROOT-owned optional existing publisher retention contract.
 * No locator applicability, source header or baseline map is reconstructed. */
export function stairsDokaStandardRetainedSourceDeclarationR1(){
 assert.equal(retentionJson.parentDefinitionVersionId,parent.definitionVersionId);
 assert.equal(retentionJson.parentDefinitionSha256,parent.definitionSha256);
 assert.equal(retentionJson.retainedBindings.length,8);assert.equal(retentionJson.retainedLocatorAndSourceHeaders.length,2);
 const oldIds=d.parameters.slice(0,188).map(p=>p.parameter_id).sort();
 assert.deepEqual(Object.keys(retentionJson.retainedNormativeSourceIdsByParameterId).sort(),oldIds);
 const normativeSourceIdsByParameterId:Record<string,readonly string[]>={...retentionJson.retainedNormativeSourceIdsByParameterId};
 for(const p of d.parameters.slice(188))normativeSourceIdsByParameterId[p.parameter_id]=p.truth_metadata?.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[source.sourceId];
 assert.equal(Object.keys(normativeSourceIdsByParameterId).length,301);
 return {captured:retentionJson,normativeSourceIdsByParameterId,newSourceKey:source.sourceId,newSourcePreimage:{sourceKey:source.sourceId,expected:null},
  expectedRetainedBindings:8,expectedNewBindings:20,expectedFinalBindings:28,
  typedPublisherRetainParentBindingsContractPending:true as const};
}

export function stairsDokaStandardSourceVariantControlR1(volume=12.5):Record<string,unknown>{
 const input:Record<string,unknown>={stairs_concrete_volume_m3:volume,[source.primaryMeasureParameterId]:volume,
  stairs_quantity_source_variant:'KRER06_111_01_DOKA',[source.workElevationParameterId]:15};
 for(const f of source.scopeFacts)input[f.id]=f.value;
 for(const id of source.requiredProjectReferences)input[id]='CONTROL_ONLY approved flight/PPR scope; not actual project data';
 for(const m of source.materials){input[m.specificationId]='CONTROL_ONLY exact source-compatible supply; not supplier price';
  input[m.parameterPrefix+'_stock']=0;input[m.parameterPrefix+'_reserve']=0;input[m.parameterPrefix+'_quantum']=0.000001;}
 return input;
}

export function stairsDokaStandardSourceVariantCompletenessR1(){
 // Actual accepted95 rows are the independent predecessor inventory. No new
 // source111 rate is attributed to them merely because the work is composite.
 const old=disposition.rows.map(r=>({expectedResourceId:'captured-standard:'+r.rowId,operationId:'existing-project-composition',
  category:JSON.parse(parent.resourceRawRows[r.ordinal]!).category,specification:r.reasonRu,
  condition:r.disposition,sourceId:'captured-definition:'+parent.definitionVersionId,
  unitId:r.unitId,quantityRule:r.formulaExpression,formulaId:r.formulaId,resolution:{kind:'ROW',rowId:r.rowId}}));
 const independentSource=monolithicStair111CompletenessMapR1();
 const next=independentSource.entries.filter(e=>!source.machines.some(m=>e.resolution.rowId===prefix+':'+m.id+'-own'||e.resolution.rowId===prefix+':'+m.id+'-hired'));
 assert.equal(old.length,95);assert.equal(next.length,45);
 return {...independentSource,generatedFromCurrentRows:false,evidenceReferences:[...independentSource.evidenceReferences,
  'Historical captured parent '+parent.definitionSha256,'Addressed exact95 map '+disposition.contract],entries:[...old,...next]};
}

/** Meaningful core checks can run prospectively before ROOT adds the exact
 * retention opt-in. They never imply that a saved child may switch methods. */
export async function verifyStairsDokaStandardSourceVariantCoreR1(){
 assert.equal(sha(readFileSync(resolve(process.cwd(),source.source.path))),source.source.sha256);
 assert.equal(d.resources.length,140);assert.equal(d.formulas.length,137);assert.equal(d.parameters.length,301);
 const completeness=stairsDokaStandardSourceVariantCompletenessR1();
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
 assert.deepEqual(completeness.entries.map(e=>e.resolution.rowId).sort(),d.resources.map(r=>r.row_id).sort());
 const result=await compileStairsDokaStandardSourceVariantForTestR1(stairsDokaStandardSourceVariantControlR1());
 const row=(id:string)=>result.rows.find(r=>r.row_id===prefix+':'+id);
 assert.equal(row('whole-labor')?.quantity,'301.575');assert.equal(row('concrete-consumed')?.quantity,'12.6875');
 assert.equal(row('operator-information')?.included_in_estimate,false);
 assert(result.rows.filter(r=>r.category==='labor'&&r.included_in_estimate).every(r=>r.row_id===prefix+':whole-labor'));
 assert(!result.rows.some(r=>disposition.rows.some(m=>m.rowId===r.row_id&&['MUTUALLY_EXCLUSIVE_WITH_SOURCE111','UNRESOLVED_SEPARATE_SCOPE_VISIBLE_NEED'].includes(m.disposition))));
 for(const id of d.unresolvedResourceRowIds)assert(result.preliminaryNeeds.some(n=>n.row_id===id));
 assert(source.machines.every(m=>row(m.id+'-consumed')?.included_in_estimate===false));
 return {status:'PURE_EXISTING_STANDARD_SOURCE_VARIANT_CORE_ONLY',catalogId:d.catalogId,newCatalogIds:0,
  definitionShape:[d.parameters.length,d.formulas.length,d.resources.length],source111Quantities:20,
  source111WholeLabor:'2412.60/100m3',source111Concrete:'101.5/100m3',machinePriceAdmission:false,
  sourceOpenNeeds:9,unresolvedOldScopeOwners:58,unresolvedResourceRows:67,sourceVariantSavedSwitchAccepted:false};
}

/** Concrete fields of the future existing-ID successor. This is deliberately
 * not a callable publication config: exact8 binding/baseline retention and the
 * ROOT existing-command admission guard have not been integrated/proven here. */
export function prepareStairsDokaStandardSourceVariantFactoryDraftR1(){
 const header=JSON.parse(parent.headerRaw) as Json,passport=JSON.parse(parent.passportRaw).content_passport as Json;
 const bindingIds=['whole-labor','operator-information','tower-crane8t-consumed','truck-crane10t-consumed','forklift5t-consumed','arc-welder-consumed','surface-vibrator-consumed','chain-saw-consumed','flatbed8t-consumed',
  'water-consumed','nails-consumed','release-oil-consumed','electrodes-consumed','facing-consumed','timber-bars-consumed','boards25-consumed','boards44-consumed','matting-consumed','concrete-consumed','wire-consumed'].map(id=>prefix+':'+id);
 assert.equal(bindingIds.length,20);assert(bindingIds.every(id=>d.resources.some(r=>r.row_id===id)));
 const completeness=stairsDokaStandardSourceVariantCompletenessR1();
 const fields:Pick<MasterSingleDefinitionSuccessorConfig,'catalogId'|'sourceId'|'normId'|'sourceMetadata'|'parameterDefinitions'|'formulaDefinitions'|'resourceDefinitions'|'shortInput'|'acceptanceInput'|'expectedParentShape'|'validationScenario'|'passport'|'applicability'|'binding'|'locator'|'search'|'verifyCore'>={
  catalogId:d.catalogId,sourceId:source.sourceId,normId:source.normId,
  sourceMetadata:{source_title:'Прямоугольный монолитный марш Doka — КРЕР 06-01-111-01',source_authority:'КРЕР06-2015, уполномоченный орган строительства Кыргызской Республики',
   exact_locator:source.source.locatorRu,use_restriction:source.scopeRu,source_kind:'OFFICIAL_RESOURCE_NORM_PARTIAL_EXISTING_SOURCE_VARIANT',official_url:source.source.officialUrl,
   artifact_sha256:source.source.sha256,effective_from:'2016-01-01'},
  parameterDefinitions:d.parameters,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,
  shortInput:{stairs_concrete_volume_m3:12.5},acceptanceInput:stairsDokaStandardSourceVariantControlR1(),
  expectedParentShape:[188,92,95],validationScenario:'EXISTING_STANDARD_STAIRS_SOURCE111_NORMAL_RECTANGULAR_12_5M3_PARTIAL',
  passport:{canonicalRuName:header.canonical_name_ru,workKey:header.work_key,physicalResultRu:passport.physical_result_ru,
   includedScopeRu:[...passport.included_scope_ru,'Явно выбранный вариант одного прямоугольного марша Doka: цельный труд и исходные расходные материалы КРЕР; техника пока справочно.'],
   excludedScopeRu:[...passport.excluded_scope_ru,'Неподтверждённые отдельные scope старых строк не получают новую цену/количество.','Смена нормативного метода в сохранённой дочерней смете до отдельного допуска запрещена.'],
   independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:d.unresolvedResourceRowIds},
  applicability:{country:'KG',operationClass:'COMPLETE_MONOLITHIC_REINFORCED_CONCRETE_STAIRS',catalogContext:'STANDARD',primaryMeasureParameterId:'stairs_concrete_volume_m3',
   sourceVariantSelector:'stairs_quantity_source_variant',sourceVariantValue:'KRER06_111_01_DOKA',sourceVariantSelection:selected,
   newEstimateOnlyUntilReviewedMigration:true,fullTechnicalScope:false,newCatalogIdentity:false},
  binding:{rowId:bindingIds[0]!,additionalRowIds:bindingIds.slice(1),applicability:{source_id:source.sourceId,norm_id:source.normId,exact_locator:source.source.locatorRu,
   condition:selected,quantity_basis:'EXPLICIT_NET_RECTANGULAR_FLIGHT_VOLUME_M3_EQUAL_TO_WHOLE_SELECTED_OBJECT',denominator:'100m3',notLegacy95Attribution:true}},
  locator:{key:'krer06-01-111-01-straight-doka-flight-p143-144',payload:{kind:'OFFICIAL_RESOURCE_NORM_COLUMN',normId:source.normId,pdfPages:[143,144],
   printedPages:[143,144],denominatorValue:100,denominatorUnitId:'m3',wholeLaborRate:'2412.60',operatorInformationRate:'56.59',sourceArtifactSha256:source.source.sha256,
   clauses:['1.1','1.2','1.35','1.36','1.43','1.44'],scope:source.scopeRu,existingVariantNotNewCatalog:true}},
  search:{primaryUom:header.primary_uom,canonicalNameRu:header.canonical_name_ru,aliases:[...header.aliases],shortScopeRu:header.short_scope_ru,
   keyDistinguishingParameters:[...header.key_distinguishing_parameters],clarificationFields:['stairs_quantity_source_variant',source.primaryMeasureParameterId,...source.requiredProjectReferences],
   includedBoundaries:[...header.included_boundaries],excludedBoundaries:[...header.excluded_boundaries],extraSearchTermsRu:'КРЕР 06-01-111-01 прямоугольный марш Doka вариант нормы',
   sourceProvenance:{historicalCapturedContext:parent.executionContextAtRead,retainedCurrentProfile:true,exactPreimage:parent.definitionSha256,paidVariantPartial:true}},
  verifyCore:verifyStairsDokaStandardSourceVariantCoreR1,
 };
 return {status:'FACTORY_DRAFT_NOT_PUBLISHABLE_PENDING_EXACT_RETENTION_AND_ROOT_ADMISSION' as const,publicationAllowed:false as const,
  knownConfigFields:fields,sourceBindingIds:bindingIds,
  retainedParentBindingExpectation:{count:8,exactApplicabilityRequired:true,sourceMetadataAndBaselineClosureRequired:true,normalAndLockedRereadRequired:true},
  retainedSourceDeclaration:stairsDokaStandardRetainedSourceDeclarationR1(),
  rootPrerequisites:['actualV5closed8binding2source1baseline result and exact SHA','ROOT reviewed95map/method-boundary decision pin','existing-command saved-child source-variant-switch guard and negative cases','common retainParentBindings descriptor+baseline source closure normal/locked recheck','actual frozen source context/current pointer; controlled explicit rebase only if changed'],
  capturedContextMustRemainHistorical:parent.executionContextAtRead,automaticParentRebase:false as const,catalogAppend:null,newCatalogIds:0};
}
