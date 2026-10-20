// C-owned WORK proposal. No top-level I/O, DB connection, admission or writer.
// Exact existing publisher and retained guard are the only publication route.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve,isAbsolute} from 'node:path';
import fixture from '../../data/estimate-benchmarks/fixtures/basin-mixer-grohe33265002-kit-r1.json';
import {basinMixerGrohe33265002PackR1 as pack,basinMixerGrohe33265002KitDefinitionR1} from '../../src/lib/estimate/v4/basinMixerGrohe33265002KitR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {effectiveResourceQuantityParameterId} from '../../src/lib/estimate/v4/effectivePurchaseBalanceR1';
import {masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
 type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from '../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1,type MasterCapturedScopedNormativeRegistryR1} from '../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as hash,validateIndependentCompletenessMapReferences,
 type MasterSingleDefinitionSuccessorConfig} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from '../../scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared';
import {grohe33265002RetainedContractWorkR1 as contract,grohe33265002RegistryDescriptorWorkR1,
 grohe33265002SourceBoundRowKeysWorkR1 as sourceBoundKeys} from './grohe33265002RegistryDescriptorWorkR1';
import {basinMixerGroheProjectResourcesR2,basinMixerGroheProjectPositionsR2 as provision} from '../../src/lib/estimate/v4/basinMixerGroheProjectResourcesR2';
import {projectResourceParameterPrefixR1} from '../../src/lib/estimate/v4/projectSubworkResourceScheduleR1';

type Json=Record<string,any>;
type Pin=Readonly<{path:string;sha256:string}>;
const id=(key:string)=>pack.prefix+':'+key;
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const HASH=/^[a-f0-9]{64}$/u,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
export const grohe33265002BranchWorkR1={parameterId:'mixer_composition_method',
 legacy:'Прежний состав монтажа смесителя по объёму в точках',
 product:'Полный комплект GROHE Eurosmart 33265002 на готовом совместимом узле'} as const;
const choice=grohe33265002BranchWorkR1.parameterId,legacy={kind:'equals',parameterId:choice,value:grohe33265002BranchWorkR1.legacy},
 selected={kind:'equals',parameterId:choice,value:grohe33265002BranchWorkR1.product};
const target={definitionId:'b7dbf8ab-fea1-52f5-a995-eeeb112c149e',baselineId:'63e182f9-5f5d-596a-a8a0-1d79f283b476',
 definitionSha256:'63626bc17ed4bc917179174d7093a3e470d0be17e54d68498d57450262ac291b',version:3};
const scopeRu='Две взаимоисключающие ветви одной существующей карточки: прежний состав в точках либо комплект GROHE33265002 на готовом совместимом узле. Старый q в точках не превращается в число изделий. Подводка, FastFixation и донный клапан входят в один комплект, а пять шагов монтажа не начисляют второй труд. Переделки, сифон, доставка, общие испытания и особые инструменты остаются открытыми потребностями.';
const rehash=(r:Json)=>{const{row_sha256:_previous,...body}=r;return{...body,row_sha256:estimateDeterministicHash(body)};};
const and=(a:Json,b:Json)=>({kind:'and',operands:[a,b]});

export type Grohe33265002CapturedDraftWorkR1=Readonly<{capturedParent:MasterRetainedParentCaptureR1;capturedParentSha256:string;
 parentPassport:Json;parentSearch:Json;parentPriceBindings:readonly Json[]}>;

/** Requires the complete ACTUAL captured closure. Partial old bodies are not a
 * source of fake bindings/locators/prices. Unknown arrays are never filled in. */
export function prepareBasinMixerGrohe33265002RetainedDraftWorkR1(input:Grohe33265002CapturedDraftWorkR1){
 const c=clone(input.capturedParent),passport=clone(input.parentPassport),search=clone(input.parentSearch);
 assert(HASH.test(input.capturedParentSha256));assert.equal(masterRetainedParentCaptureSha256R1(c),input.capturedParentSha256);
 assert.equal(c.definition.id,target.definitionId);assert.equal(c.definition.catalog_id,pack.catalogId);
 assert.equal(c.definition.definition_sha256,target.definitionSha256);assert.equal(c.definition.definition_version,target.version);
 assert.equal(c.baseline.id,target.baselineId);assert.equal(c.baseline.definition_version_id,c.definition.id);
 assert.equal(passport.definition_version_id,c.definition.id);assert.equal(passport.catalog_id,pack.catalogId);
 assert.equal(search.catalog_id,pack.catalogId);assert.deepEqual([c.parameters.length,c.formulas.length,c.resources.length],[1,63,63]);
 assert.deepEqual([passport.parameter_count,passport.formula_count,passport.resource_count],[1,63,63]);
 assert(Array.isArray(c.bindings)&&Array.isArray(c.normativeSources)&&Array.isArray(c.normativeLocators)&&Array.isArray(input.parentPriceBindings));
 assert.equal(c.parameters[0]!.parameter_id,'q');assert.equal(c.parameters[0]!.unit_id,'point');assert.equal(c.parameters[0]!.value_type,'decimal');
 assert.deepEqual(Object.keys(c.baseline.normative_source_ids),['q']);assert(c.normativeSources.every(s=>s.source_key!==pack.sourceId));
 assert(!c.definition.source_metadata?.retainedParentBindingSuccessorV1,'GROHE_FIRST_RETAINED_SUCCESSOR_REQUIRED');
 const subject=basinMixerGroheProjectResourcesR2();
 assert.deepEqual([subject.formulas.length,subject.resources.length],[40,40]);
 const oldParams=[...c.parameters].sort((a,b)=>a.ordinal-b.ordinal),oldRows=[...c.resources].sort((a,b)=>a.ordinal-b.ordinal);
 assert.deepEqual(oldRows.map(r=>r.ordinal),Array.from({length:63},(_,i)=>i));
 const oldIds=new Set(oldRows.map(r=>r.row_id));assert(subject.resources.every(r=>!oldIds.has(r.row_id)));
 const selector:Json={parameter_id:choice,ordinal:1,value_type:'enum',unit_id:null,title_ru:'Какой состав монтажа смесителя нужен?',required:true,default_value:null,
  constraints_json:{values:[grohe33265002BranchWorkR1.legacy,grohe33265002BranchWorkR1.product]},
  truth_metadata:{contract,semantic_parameter_key:pack.catalogId+':'+choice,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',
   source_confirmation_required:false,preliminary_compilation_allowed:true,hidden_default_forbidden:true,
   provenance:{consumer_input_role_v1:'OBJECT_FACT'},resource_branch_consumers:[...oldRows,...subject.resources].map(r=>r.row_id),
   guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:'Выберите один состав. Прежние точки не пересчитываются в комплектные смесители; для GROHE отдельно укажите целое число монтажей.',
    full_condition_ru:scopeRu,source_role:'PROJECT_DOCUMENTATION',source_document:pack.sourceId,source_locator:pack.source.locatorRu,
    guide_version:contract,source_snapshot_hash:pack.source.sha256,verified_at:pack.source.reviewedAt}}};
 const parameters:Json[]=[...oldParams.map(q=>({...q,required:false,constraints_json:{...q.constraints_json,requiredWhen:legacy},
  truth_metadata:{...q.truth_metadata,legacyMixerBranchGuideV1:{previousGuide:clone(q.truth_metadata.guide),previousDefault:clone(q.default_value),
   oldUnitAndMeaningUnchanged:true,noPointToItemConversion:true},guide:{...q.truth_metadata.guide,
    guide_short_ru:'Объём только прежней ветви в точках. Он не определяет число комплектов GROHE и не переносится в новую меру.',full_condition_ru:scopeRu}}})),selector,
  ...subject.parameters.map(q=>{const constraints=q.constraints_json??{};
   return{...q,required:false,constraints_json:{...constraints,
    ...(q.parameter_id===pack.primaryParameterId?{requiredWhen:selected}:constraints.requiredWhen?{requiredWhen:and(selected,constraints.requiredWhen as Json)}:{})}};})]
  .map((q,ordinal)=>({...q,ordinal}));
 const formulas=[...c.formulas,...subject.formulas];
 const resources:Json[]=[...oldRows.map(r=>rehash({...r,inclusion_ast:and(legacy,r.inclusion_ast)})),
  ...subject.resources.map(r=>rehash({...r,inclusion_ast:and(selected,r.inclusion_ast)}))].map((r,ordinal)=>({...r,ordinal}));
 const expectedNewIds=[choice,pack.primaryParameterId,'grohe33265002_product_scope','grohe33265002_site_scope','grohe33265002_supply_reference',
  'grohe33265002_usable_stock_item','grohe33265002_stock_reference','grohe33265002_required_reserve_item',
  'grohe33265002_work_scope','grohe33265002_work_reference',...pack.needs.map(n=>'grohe33265002_application_need_'+n.id.replaceAll('-','_')),
  effectiveResourceQuantityParameterId(id('kit-order')),
  ...provision.flatMap(position=>{const p=projectResourceParameterPrefixR1('grohe_r2',position.key);
   return [...(position.optional?[p+'_required']:[]),p+'_payment',p+'_specification',p+'_quantity',p+'_reference'];})];
 assert.equal(expectedNewIds.length,64);assert.equal(new Set(expectedNewIds).size,64);
 assert.deepEqual(parameters.filter(q=>q.parameter_id!=='q').map(q=>q.parameter_id).sort(),expectedNewIds.slice().sort());
 assert.deepEqual([parameters.length,formulas.length,resources.length],[65,103,103]);
 const newParameterSources:MasterRetainParentBindingsR1['newParameterSources']=Object.fromEntries(parameters.filter(q=>q.parameter_id!=='q').map(q=>{
  const role=String(q.truth_metadata.value_source_role);
  return[q.parameter_id,role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}
   :role.includes('DERIVED')?{kind:'DERIVED' as const,sourceIds:[]}:{kind:'KNOWN' as const,sourceIds:[pack.sourceId]}];
 }));
 const retained:MasterRetainParentBindingsR1={capturedParent:c,capturedParentSha256:input.capturedParentSha256,newParameterSources,
  legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,
   parameterSources:{q:clone(c.baseline.normative_source_ids.q)}},
  capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null}};
 const registry=grohe33265002RegistryDescriptorWorkR1();
 const binding={...registry.binding,applicabilityByRowId:Object.fromEntries(sourceBoundKeys.map(key=>[id(key),{
  selectedOnly:selected,sourceArtifactSha256:pack.source.sha256,exactSku:pack.sku,exactEan:pack.ean,
  quantityMeaning:key==='kit-consumed'?'ONE_COMPLETE_PRODUCT_PER_EXPLICIT_INSTALL_COUNT':'REFERENCE_TO_INSTALLED_COMPLETE_PRODUCTS_NOT_SEPARATE_COMPONENT_ORDER',
  laborMachineHoursOrCurrentPriceClaimed:false,fullTechnicalAcceptance:false}])),retainParentBindings:retained};
 const openRows=pack.needs.map(n=>id('open-'+n.id));
 const included=[...passport.included_scope_ru,'Прежний состав применяется только при его явном выборе; объём задаётся в прежних точках.',
  'Для GROHE33265002 комплект оплачивается целиком; штатные подводка, крепление и донный клапан включены. Пять подработ входят в один полный монтаж.',
  'Стоимость полного монтажа за изделие возможна только по явной договорной границе; изготовитель не задаёт человеко-часы или расценку.'];
 const excluded=[...passport.excluded_scope_ru,...pack.exclusionsRu,
  'Нет автоматического переноса прежних цен/количеств, пересчёта точки в изделие или переписывания сохранённой истории.',
  'Для комплектного смесителя отдельно укажите целое число установок. Прежний объём в точках не определяет число изделий.'];
 // Independent NEW-branch inventory from the reviewed source package. Legacy
 // capture is preserved as predecessor evidence, not relabelled a new TDS norm.
 const independentKeys=['kit-consumed','kit-order','kit-remaining','kit-free','kit-shortage','kit-reserve-deficit',
  ...pack.components.map(c=>c.id),'complete-installation-work',...pack.operations.map(o=>'process-'+o.id),...pack.needs.map(n=>'open-'+n.id)].map(id);
 independentKeys.push(...provision.flatMap(position=>[...(position.includedOnly?[]:['separate']),'included',
  ...(position.includedInExistingOwners??[]).map((_,index)=>'included-in-existing-'+index)].map(branch=>'subwork-resource:grohe_r2:'+position.key+':'+branch)),
  'subwork-resource:grohe_r2:ownership-check:0','subwork-resource:grohe_r2:ownership-check:1');
 assert.equal(independentKeys.length,40);
 const completenessMap={contract:CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,
  evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.tpiUrl,pack.source.officialUrl,pack.source.htmlSha256,input.capturedParentSha256],
  coverage:'NEW_CONCRETE_PRODUCT_BRANCH_ONLY_LEGACY_CAPTURE_RETAINED_SEPARATELY',predecessorPassportRetainedAsEvidence:passport,
  fullTechnicalAcceptance:false,entries:independentKeys.map(key=>({expectedResourceId:contract+':'+key,operationId:'grohe33265002:'+key,
   sourceId:key.startsWith('subwork-resource:')?'EXPLICIT_PROJECT_PROVISION_NOT_MANUFACTURER_CONSUMPTION_NORM':key.includes(':open-')?'UNRESOLVED_APPLICATION_NORM':key.endsWith(':complete-installation-work')?'PROJECT_CONTRACT_SCOPE_REQUIRED':pack.sourceId,
   condition:'EXPLICIT_GROHE33265002_BRANCH_AND_READY_COMPATIBLE_SITE_ONLY',quantityRule:key.startsWith('subwork-resource:')?'EXPLICIT_ADDITIONAL_QUANTITY_AND_SINGLE_CONFIRMED_PAYMENT_OWNER':key.includes(':open-')?'UNKNOWN_UNIT_AND_QUANTITY_NO_FAKE_ZERO'
    :key.endsWith(':complete-installation-work')?'EXPLICIT_INSTALL_COUNT_NOT_LABOR_HOURS_NORM':'COMPLETE_PRODUCT_COUNT_OR_DERIVED_STOCK_BALANCE_OR_INFORMATIONAL_STEP',
   formulaId:key.startsWith('subwork-resource:')?key+(key.includes(':ownership-check:')?':formula':':quantity'):id('formula:'+key.slice(pack.prefix.length+1)),
   resolution:{kind:'ROW',rowId:key}}))};
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap,formulaDefinitions:formulas,resourceDefinitions:resources}),[]);
 const next={parameters,formulas,resources};
 const compile=(facts:Json,defs:typeof next|MasterRetainedParentCaptureR1,primary:string,edits:Json={},prices:CanonicalEstimateCompileCoreInput['priceItems']=[])=>compileCanonicalEstimateCore({
  operation:'recalculate',catalogId:pack.catalogId,compilerVersion:contract,primaryMeasureParameterId:primary,
  parameterDefinitions:defs.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'],formulaDefinitions:defs.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
  resourceDefinitions:defs.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'],submittedParameters:facts,confirmedParameters:{},rowOverrides:edits,priceItems:prices,
  currencyCode:'KGS',maximumResourceRows:defs.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
 const verifyCore=async()=>{
  const representative=prepareMasterRetainedBindingRepresentativeR1({config:{stopCode:'BASIN_MIXER_GROHE33265002_RETAINED_R1',catalogId:pack.catalogId,
   parentReleaseId:c.definition.release_id,binding},newSource:registry.managedSource,newLocators:registry.managedLocators},
   {...next,newBindings:Object.entries(binding.applicabilityByRowId).map(([row_id,applicability])=>({row_id,locator_id:registry.managedLocators[0]!.id,applicability})),
    successorProvenance:{contract,sourceId:pack.sourceId,normId:pack.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,capturedParentSha256:input.capturedParentSha256}});
  assert.equal(representative.expectedNormativeBindingCount,c.bindings.length+4);
  assert.deepEqual(representative.normativeSourceIds.q,c.baseline.normative_source_ids.q);
  const view=(r:Awaited<ReturnType<typeof compile>>)=>r.rows.map(x=>[x.row_id,x.quantity,x.unit_price,x.amount,x.title_ru,x.included_in_estimate,x.included_in_procurement]);
  const manualOwner=oldRows.find(r=>r.procurement_eligible===true)??oldRows[0]!;
  const edits={[manualOwner.row_id]:{quantity:'77',unitPrice:'2',titleRu:'TEST_ONLY preserved legacy mixer row',provenance:{kind:'manual',reason:'TEST_ONLY retained-branch check'}}};
  const before=await compile({q:'100'},c,'q',edits),after=await compile({q:'100',[choice]:grohe33265002BranchWorkR1.legacy},next,'q',edits);
  assert.deepEqual(view(after),view(before));
  const excluded={[manualOwner.row_id]:{...edits[manualOwner.row_id],includedInEstimate:false,includedInProcurement:false}};
  assert.deepEqual(view(await compile({q:'100',[choice]:grohe33265002BranchWorkR1.legacy},next,'q',excluded)),view(await compile({q:'100'},c,'q',excluded)));
  const selectedFacts={...fixture.facts,[choice]:grohe33265002BranchWorkR1.product};
  const oldPrices=oldRows.map(r=>({price_key:r.row_id,unit_id:r.unit_id,currency_code:'KGS',unit_price:'77',snapshot_id:'TEST_ONLY_OLD_63_PRICE_KEYS'}));
  const chosen=await compile(selectedFacts,next,pack.primaryParameterId,{},oldPrices);
  assert(!chosen.rows.some(r=>oldIds.has(r.row_id)));assert.equal(chosen.rows.find(r=>r.row_id===id('kit-order'))?.quantity,'3');
  assert.equal(chosen.rows.find(r=>r.row_id===id('kit-order'))?.unit_price,null);assert.equal(chosen.totals.amount,'0');
  for(const component of pack.components){const r=chosen.rows.find(r=>r.row_id===id(component.id));assert(r);assert.equal(r.included_in_estimate,false);assert.equal(r.included_in_procurement,false);}
  assert(openRows.every(row=>chosen.preliminaryNeeds.some(n=>n.row_id===row)));
  const withoutN:Json={...selectedFacts,q:'100'};delete withoutN[pack.primaryParameterId];
  const unknownN=await compile(withoutN,next,pack.primaryParameterId);assert(!unknownN.rows.some(r=>r.row_id===id('kit-order')));
  assert(unknownN.preliminaryNeeds.some(n=>n.missing_parameter_ids.includes(pack.primaryParameterId)));
  return{status:'PASS_GROHE33265002_RETAINED_DRAFT_PURE_ONLY',retainedShape:[1,63,63],nextShape:[65,103,103],
   oldBindings:c.bindings.length,newBindings:4,oldPriceBindingRows:input.parentPriceBindings.length,legacyManualTitleQuantityPriceExclusionPreserved:true,
   oneProductPurchaseOwner:true,includedComponentDoublePayment:false,newLaborHoursNormClaimed:false,openNeeds:5,
   explicitApiPrimaryMeasuresChecked:['q(point)',pack.primaryParameterId+'(item)'],ordinaryClientBranchPrimaryMeasureProofStillRequired:true,
   fullTechnicalAcceptance:false,publicationPerformed:false};
 };
 return{capture:c,passport,search,next,binding,included,excluded,completenessMap,openRows,compile,verifyCore,
  applicability:{...c.definition.applicability,grohe33265002CompletionContract:contract,legacyApplicability:clone(c.definition.applicability),
   primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:choice,selections:[
    {selectorValue:grohe33265002BranchWorkR1.legacy,primaryMeasureParameterId:'q',unitId:'point'},
    {selectorValue:grohe33265002BranchWorkR1.product,primaryMeasureParameterId:pack.primaryParameterId,unitId:'item'}]},
   preliminaryCompositionOnly:true,fullTechnicalAcceptance:false,noPointToItemConversion:true}};
}

export type Grohe33265002RootBindingWorkR1=Readonly<{status:'ROOT_VERIFIED_CURRENT_GROHE33265002_RETAINED_R1';contract:typeof contract;
 executionContext:Readonly<{sourceHead:string;recordedReleaseSourceCommit:string;definitionReleaseId:string;searchReleaseId:string}>;
 parent:Grohe33265002CapturedDraftWorkR1;currentPointerPin:Pin;rootDecisionPin:Pin;freshParentCapturePin:Pin;freshScopedCapturePin:Pin;closedCaptureGuardPin:Pin;
 masterPath:string;masterSha256:string;sharedSourcePins:readonly Pin[];acceptedSubjectProofPins:readonly Pin[];
 ordinaryBranchPrimaryProofPin:Pin;admittedPrimaryMeasureMetadata:Json;capturedScopedNormativeRegistry:MasterCapturedScopedNormativeRegistryR1;
 automaticRebaseAllowed:false;readOnly:true;allTransactionsRolledBack:true;allConnectionsClosed:true;databaseWritesPerformed:false}>;
const exactBytes=(p:Pin)=>{assert(HASH.test(p.sha256));const b=readFileSync(resolve(p.path));assert.equal(createHash('sha256').update(b).digest('hex'),p.sha256);return b;};
const load=(p:Pin):Json=>JSON.parse(exactBytes(p).toString('utf8').replace(/^\uFEFF/u,''));
/** This arm remains fail-closed while the generic conditional-primary contract
 * is unproved. No ROOT decision/ordinary-client proof is manufactured here. */
export function prepareBasinMixerGrohe33265002RetainedWorkR1(input:Readonly<{rootBindingPin:Pin;outputRoot:string}>):MasterSingleDefinitionSuccessorConfig{
 const b=load(input.rootBindingPin)as Grohe33265002RootBindingWorkR1,x=b.executionContext;
 assert.equal(b.status,'ROOT_VERIFIED_CURRENT_GROHE33265002_RETAINED_R1');assert.equal(b.contract,contract);
 assert.equal(b.automaticRebaseAllowed,false);assert.equal(b.readOnly,true);assert.equal(b.allTransactionsRolledBack,true);assert.equal(b.allConnectionsClosed,true);assert.equal(b.databaseWritesPerformed,false);
 assert(UUID.test(x.definitionReleaseId)&&UUID.test(x.searchReleaseId));assert(/^[a-f0-9]{40}$/u.test(x.sourceHead));
 assert.equal(createHash('sha256').update(readFileSync(b.masterPath)).digest('hex'),b.masterSha256);
 const pointer=load(b.currentPointerPin);assert.equal(pointer.definitionReleaseId,x.definitionReleaseId);assert.equal(pointer.searchReleaseId,x.searchReleaseId);
 const decision=load(b.rootDecisionPin);assert.equal(decision.publicationDesignAdmitted,true);assert.equal(decision.fullTechnicalAcceptance,false);
 assert.equal(decision.catalogId,pack.catalogId);assert.equal(decision.oldDefinitionSha256,target.definitionSha256);
 assert.equal(decision.capturedParentSha256,b.parent.capturedParentSha256);assert.equal(decision.legacy63OwnersAndPointUnitsPreserved,true);
 assert.equal(decision.automaticPointToItemConversionAllowed,false);assert.equal(decision.automaticLegacyPriceInheritanceAllowed,false);
 assert.equal(decision.ordinaryConditionalPrimaryMeasureProved,true,'GROHE_GENERIC_BRANCH_PRIMARY_MEASURE_NOT_YET_PROVED');
 const measure=load(b.ordinaryBranchPrimaryProofPin);assert.equal(measure.rootAccepted,true);assert.equal(measure.contract,'canonical-primary-measure-selection/v1');
 assert.equal(measure.legacyPrimaryParameterId,'q');assert.equal(measure.legacyUnitId,'point');assert.equal(measure.productPrimaryParameterId,pack.primaryParameterId);assert.equal(measure.productUnitId,'item');
 assert.equal(measure.savedParentPrimaryIdentityImmutable,true);assert.equal(measure.differentPrimaryRequiresNewRoot,true);assert.equal(measure.ordinaryClientBothBranchesVerified,true);
 assert.deepEqual(measure.admittedMetadata,b.admittedPrimaryMeasureMetadata);
 const parentRead=load(b.freshParentCapturePin);assert.deepEqual(parentRead,b.parent);
 const scoped=load(b.freshScopedCapturePin);assert.deepEqual(scoped,b.capturedScopedNormativeRegistry);
 const guard=load(b.closedCaptureGuardPin);assert.equal(guard.error,null);assert.deepEqual(guard.cleanupErrors,[]);assert.deepEqual(guard.remainingOwnedProcesses,[]);
 for(const p of b.sharedSourcePins)exactBytes(p);for(const p of b.acceptedSubjectProofPins)load(p);
 assert(b.sharedSourcePins.length>=4&&b.acceptedSubjectProofPins.length>0);
 const draft=prepareBasinMixerGrohe33265002RetainedDraftWorkR1(b.parent),registry=grohe33265002RegistryDescriptorWorkR1();
 assert(resolveMasterScopedNormativeRegistryOptInR1({config:{stopCode:'BASIN_MIXER_GROHE33265002_RETAINED_R1',normId:pack.normId,
  capturedScopedNormativeRegistry:b.capturedScopedNormativeRegistry,binding:draft.binding},newSource:registry.managedSource,newLocators:registry.managedLocators}));
 const sourcePaths=[...new Set(['work/stream-c-plumbing-mixer/prepareBasinMixerGrohe33265002RetainedWorkR1.ts',
  'work/stream-c-plumbing-mixer/grohe33265002RegistryDescriptorWorkR1.ts','src/lib/estimate/v4/basinMixerGrohe33265002KitR1.ts',
  'data/estimate-benchmarks/source-packs/basin-mixer-grohe33265002-kit-r1.json',pack.source.path,pack.source.htmlPath,
  ...b.sharedSourcePins.map(p=>p.path),...b.acceptedSubjectProofPins.map(p=>p.path),input.rootBindingPin.path,b.rootDecisionPin.path,
  b.freshParentCapturePin.path,b.freshScopedCapturePin.path,b.closedCaptureGuardPin.path,b.ordinaryBranchPrimaryProofPin.path])];
 assert(sourcePaths.every(p=>!isAbsolute(p)&&!p.split(/[\\/]/u).includes('..')),'GROHE_A_BYTE_EXACT_RELATIVE_ADOPTION_REQUIRED');
 assert(!sourcePaths.includes(b.currentPointerPin.path),'GROHE_MUTABLE_POINTER_NOT_SOURCE_PIN');
 return{contract,stopCode:'BASIN_MIXER_GROHE33265002_RETAINED_R1',applicationName:'basin-mixer-grohe33265002-retained-r1',expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:b.masterPath,masterSha256:b.masterSha256,parentReleaseId:x.definitionReleaseId,parentSearchReleaseId:x.searchReleaseId,currentReleasePath:b.currentPointerPin.path,
  outputRoot:input.outputRoot,sourcePaths,catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:registry.sourceMetadata,
  capturedScopedNormativeRegistry:b.capturedScopedNormativeRegistry,parameterDefinitions:draft.next.parameters,formulaDefinitions:draft.next.formulas,resourceDefinitions:draft.next.resources,
  shortInput:{q:'100'},acceptanceInput:{q:'100',[choice]:grohe33265002BranchWorkR1.legacy},runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  expectedParentShape:[1,63,63],benchmarkOrdinal:0,validationScenario:'GROHE_RETAIN1_63_63_EXCLUSIVE20_ROWS_LEGACY_MANUAL_PARITY_FIVE_OPEN_NEEDS_NO_POINT_TO_ITEM',
  passport:{canonicalRuName:draft.capture.definition.passport.canonicalRuName??draft.capture.definition.passport.titleRu,
   workKey:draft.capture.definition.passport.workKey??draft.search.work_key,physicalResultRu:scopeRu,includedScopeRu:draft.included,excludedScopeRu:draft.excluded,
   independentCompletenessMap:draft.completenessMap,unresolvedApplicableResourceRowIds:draft.openRows},
  applicability:{...draft.applicability,...b.admittedPrimaryMeasureMetadata},binding:draft.binding,locator:registry.locator,
  search:{primaryUom:draft.search.primary_uom,canonicalNameRu:draft.search.canonical_name_ru,
   aliases:[...draft.search.aliases,pack.titleRu],shortScopeRu:scopeRu,keyDistinguishingParameters:[choice,'q',pack.primaryParameterId,'grohe33265002_product_scope'],
   clarificationFields:draft.next.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:draft.included,excludedBoundaries:draft.excluded,extraSearchTermsRu:'GROHE Eurosmart33265002 комплект FastFixation подводка донный клапан',
   sourceProvenance:{contract,fullTechnicalAcceptance:false,noPointToItemConversion:true,legacy63RowsRetained:true,capturedParentSha256:b.parent.capturedParentSha256}},
  forbiddenAdjacentMatchers:[/new_sink|new_trap|whole_network_test|automatic_point_to_item/iu],owner:'ROOT_SINGLE_INTEGRATOR',receiptFileStem:'basin_mixer_grohe33265002_retained_r1',verifyCore:draft.verifyCore};
}
