import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemType,
} from "../../../../consumerRequests/consumerRequestTypes";
import {
  compileProfessionalEstimateDomainV1,
  constructionNormativeRegistryV1,
  type NormativeApplicabilityRequestV1,
  type ProfessionalDomainCompileResultV1,
} from "../../domainFactory";
import type {
  ProfessionalEstimateScopeModeV4,
  ProfessionalParameterValueV4,
} from "../../professionalProjectAssemblyV4";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../../backendPlatform/canonicalEstimateHistoricalIngress";
import {
  INTERIOR_FINISHES_WAVE_1_INVENTORY,
  type InteriorFinishesWave1InventoryRow,
} from "./inventory";
import { interiorFinishesWave1DomainFactory } from "./domainPackage";

export const INTERIOR_FINISHES_WAVE_1_PRODUCTION_BINDING_VERSION =
  "interior-finishes-wave1-production-binding:v1" as const;

export type InteriorFinishesWave1ProductionDraftInput = {
  catalog_id: string;
  work_key: string;
  scope_mode: ProfessionalEstimateScopeModeV4;
  parent_revision_id: string | null;
  parameter_values: Readonly<Record<string, ProfessionalParameterValueV4>>;
  normative_request: Omit<NormativeApplicabilityRequestV1, "requested_source_ids" | "requested_source_types">;
  raw_input: string;
  currency: string;
};

export type InteriorFinishesWave1ProductionDraftResult = {
  inventory: InteriorFinishesWave1InventoryRow;
  compile_result: ProfessionalDomainCompileResultV1;
  draft: ConsumerRepairAiDraft | null;
};

export type InteriorFinishesWave1InlineProductionResult = {
  exact_match: boolean;
  inventory: InteriorFinishesWave1InventoryRow | null;
  missing_parameter_ids: readonly string[];
  production: InteriorFinishesWave1ProductionDraftResult | null;
};

function itemType(category: string): ConsumerRepairItemType {
  if (category === "material") return "material";
  if (category === "labor") return "work";
  if (category === "documentation") return "document";
  return "service";
}

function primitiveParameterSnapshot(
  values: Readonly<Record<string, ProfessionalParameterValueV4>>,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(Object.entries(values).map(([key, parameter]) => [key, parameter.value]));
}

export function buildInteriorFinishesWave1ProductionDraftV1(
  input: InteriorFinishesWave1ProductionDraftInput,
): InteriorFinishesWave1ProductionDraftResult {
  const inventory = INTERIOR_FINISHES_WAVE_1_INVENTORY.find((candidate) =>
    candidate.catalog_id === input.catalog_id && candidate.work_key === input.work_key);
  if (!inventory) {
    throw new Error(`INTERIOR_WAVE1_EXACT_BINDING_NOT_FOUND:${input.catalog_id}:${input.work_key}`);
  }
  const compileResult = compileProfessionalEstimateDomainV1(
    interiorFinishesWave1DomainFactory,
    constructionNormativeRegistryV1,
    {
      catalog_id: input.catalog_id,
      work_key: input.work_key,
      scope_mode: input.scope_mode,
      parent_revision_id: input.parent_revision_id,
      parameter_values: input.parameter_values,
      normative_request: input.normative_request,
    },
  );
  if (compileResult.status !== "COMPILED" || !compileResult.compilation) {
    return { inventory, compile_result: compileResult, draft: null };
  }
  const compilation = compileResult.compilation;
  if (compilation.compiled_rows.length === 0) {
    throw new Error(`INTERIOR_WAVE1_EMPTY_PRODUCTION_BOQ:${input.catalog_id}`);
  }
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(
    interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id)?.parameter_schema_id ?? "",
  );
  if (!schema) throw new Error(`INTERIOR_WAVE1_PRODUCTION_SCHEMA_NOT_FOUND:${input.catalog_id}`);
  const passportId = `domain-passport:${input.catalog_id}:v1`;
  const parameterSnapshot = primitiveParameterSnapshot(input.parameter_values);
  const applicableSourceIds = compileResult.normative_resolution.applicable_sources.map((source) => source.source_id);
  const items: ConsumerRepairAiDraft["items"] = compilation.compiled_rows.map((row) => ({
    itemType: itemType(row.category),
    titleRu: row.title_ru,
    quantity: row.quantity,
    unit: row.unit_id,
    unitLabel: row.unit_id,
    unitPrice: null,
    currency: input.currency,
    source: "reference_price_book",
    category: row.section,
    sourceId: applicableSourceIds[0] ?? null,
    sourceLabel: applicableSourceIds.join(", "),
    formulaId: row.formula_id,
    quantityFormula: row.formula_expression,
    calculationTrace: row.calculation_trace,
    sourceParameters: {
      professionalDomainFactoryV1: true,
      productionBindingVersion: INTERIOR_FINISHES_WAVE_1_PRODUCTION_BINDING_VERSION,
      domainId: interiorFinishesWave1DomainFactory.package.manifest.domain_id,
      domainVersion: interiorFinishesWave1DomainFactory.package.manifest.domain_version,
      domainPackageHash: interiorFinishesWave1DomainFactory.package_hash,
      catalogId: input.catalog_id,
      workKey: input.work_key,
      canonicalTechnologyId: inventory.canonical_technology_id,
      scopeCapability: inventory.scope_capability,
      scopeMode: input.scope_mode,
      parameterSchemaId: `canonical:${schema.schema_id}:${input.catalog_id}`,
      parameterSchemaVersion: schema.schema_version,
      parameterKeys: schema.parameters.map((parameter) => parameter.parameter_id),
      parameterSnapshot,
      projectAssemblyId: compilation.project_assembly_id,
      childRevisionId: row.child_revision_id,
      semanticOwner: row.semantic_owner,
      rowCode: row.row_id,
      normativeSourceIds: row.normative_source_ids,
      parameterSourceIds: row.parameter_source_ids,
      costOwnership: row.cost_ownership,
      costOwnerId: row.cost_owner_id,
      includedInProcurement: row.procurement_eligible,
      professionalBoqCategory: row.category,
    },
    templateId: passportId,
    templateVersion: interiorFinishesWave1DomainFactory.package.manifest.domain_version,
    normSourceId: applicableSourceIds[0] ?? null,
    normSourceTitle: applicableSourceIds.join(", "),
    normVersion: compileResult.normative_resolution.normative_profile_version,
    normReviewStatus: "applicable",
    priceStatus: "PRICE_MISSING",
    priceSource: "missing",
    priceSourceId: null,
    priceSourceLabel: "Источник цены не выбран",
    costConfidence: "missing",
    confidence: "high",
    addedBy: "system",
    materialKey: row.category === "material" ? row.semantic_owner : null,
    rateKey: row.cost_owner_id,
  }));
  return {
    inventory,
    compile_result: compileResult,
    draft: {
      titleRu: inventory.localized_name_ru,
      summaryRu: `${inventory.localized_name_ru}: профессиональная ресурсная ведомость ${input.scope_mode}; строк BOQ ${items.length}.`,
      repairType: input.work_key,
      selectedWork: {
        selectedCatalogWorkId: input.catalog_id,
        selectedWorkKey: input.work_key,
        selectedWorkTitleRu: inventory.localized_name_ru,
        selectedWorkCategoryKey: "plaster_paint",
        selectedWorkCategoryTitleRu: "Внутренние отделочные работы",
        selectedWorkRawInput: input.raw_input,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      },
      items,
      missingData: [],
      dangerousDiyBlocked: false,
    },
  };
}

export function isInteriorFinishesWave1ProductionDraftV1(
  draft: ConsumerRepairAiDraft | null,
): boolean {
  return Boolean(draft?.items.length && draft.items.every((item) =>
    item.sourceParameters?.professionalDomainFactoryV1 === true &&
    item.sourceParameters?.domainId === "interior_finishes_wave_1"));
}

function inlineInventory(input: BuildEstimateFromInlineWorkPromptInput): InteriorFinishesWave1InventoryRow | null {
  const identities = [input.selectedWorkKey, input.selectedTemplateId]
    .filter((identity): identity is string => typeof identity === "string" && identity.trim().length > 0)
    .map((identity) => identity.trim());
  return INTERIOR_FINISHES_WAVE_1_INVENTORY.find((inventory) =>
    identities.includes(inventory.catalog_id) ||
    identities.includes(inventory.work_key) ||
    identities.includes(inventory.template_id) ||
    identities.includes(`domain-passport:${inventory.catalog_id}:v1`)) ?? null;
}

function sourceTypeForParameter(parameterId: string): ProfessionalParameterValueV4["source_type"] {
  if (parameterId === "normative_rate_code" || parameterId === "funding_source" || parameterId === "project_type") {
    return "PROJECT_DOCUMENT";
  }
  if (parameterId.includes("productivity")) return "VERIFIED_RATEBOOK";
  if (
    parameterId === "product_profile_id" ||
    parameterId.includes("material_consumption") ||
    parameterId.includes("material_mass") ||
    parameterId.includes("auxiliary_material_rate")
  ) return "MATERIAL_PASSPORT";
  return "USER_EXPLICIT";
}

export function buildInteriorFinishesWave1FromInlineInputV1(
  input: BuildEstimateFromInlineWorkPromptInput,
): InteriorFinishesWave1InlineProductionResult {
  const inventory = inlineInventory(input);
  if (!inventory) return { exact_match: false, inventory: null, missing_parameter_ids: [], production: null };
  const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  if (!technology) throw new Error(`INTERIOR_WAVE1_INLINE_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
  const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(technology.parameter_schema_id);
  if (!schema) throw new Error(`INTERIOR_WAVE1_INLINE_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
  const supplied = input.paramOverrides ?? {};
  const missing = schema.parameters
    .filter((parameter) => parameter.priority === "P0" || (
      supplied.estimate_scope_mode?.value === "FULL_APPLICABLE_SCOPE" && parameter.priority === "P1"
    ))
    .filter((parameter) => supplied[parameter.parameter_id]?.value == null || String(supplied[parameter.parameter_id]?.value).trim() === "")
    .map((parameter) => parameter.parameter_id);
  if (missing.length > 0) {
    return { exact_match: true, inventory, missing_parameter_ids: missing, production: null };
  }
  const parameterValues = Object.fromEntries(schema.parameters.flatMap((parameter) => {
    const suppliedValue = supplied[parameter.parameter_id]?.value;
    if (suppliedValue == null || String(suppliedValue).trim() === "") return [];
    const sourceType = sourceTypeForParameter(parameter.parameter_id);
    return [[parameter.parameter_id, {
      value: suppliedValue as string | number | boolean,
      unit_id: parameter.unit_id,
      source_type: sourceType,
      source_id: `inline-exact:${inventory.catalog_id}:${parameter.parameter_id}:${String(supplied[parameter.parameter_id]?.source ?? sourceType)}`,
      captured_at: new Date().toISOString(),
      confidence: "high" as const,
      applicability: `Exact user/project value for ${inventory.catalog_id}`,
    } satisfies ProfessionalParameterValueV4]];
  }));
  const scopeMode = parameterValues.estimate_scope_mode?.value;
  if (scopeMode !== "MINIMAL_EXPLICIT_SCOPE" && scopeMode !== "FULL_APPLICABLE_SCOPE") {
    throw new Error(`INTERIOR_WAVE1_INLINE_SCOPE_INVALID:${String(scopeMode)}`);
  }
  const fundingSource = String(parameterValues.funding_source?.value ?? "");
  const projectType = String(parameterValues.project_type?.value ?? "");
  const rateCode = String(parameterValues.normative_rate_code?.value ?? "");
  const isRepair = inventory.scope_capability === "repair";
  const production = buildInteriorFinishesWave1ProductionDraftV1({
    catalog_id: inventory.catalog_id,
    work_key: inventory.work_key,
    scope_mode: scopeMode,
    parent_revision_id: null,
    parameter_values: parameterValues,
    normative_request: {
      country: "KG",
      region: input.city?.trim() || "Bishkek",
      funding_source: fundingSource,
      project_type: projectType,
      construction_state: isRepair ? "REPAIR" : "NEW",
      contract_basis: [],
      effective_date: new Date().toISOString().slice(0, 10),
      material_system: technology.material_system,
      operation_class: technology.operation_class,
      rate_code_by_source_id: {
        [isRepair ? "kg_krerr_2015_application_guidance" : "kg_krer_2015_application_guidance"]: rateCode,
      },
    },
    raw_input: input.rawInput,
    currency: input.currency?.trim() || "KGS",
  });
  return { exact_match: true, inventory, missing_parameter_ids: production.compile_result.blockers, production };
}


import glassFleeceParentR1080 from '../../../../../../data/estimate-benchmarks/fixtures/glass-fleece-current-parent-r1080.json';
import glassFleecePackR1 from '../../../../../../data/estimate-benchmarks/source-packs/glass-fleece-current-oem-physical-cycle-r1.json';
import {buildAutomaticConstructionOwnerR1 as buildGlassFleeceAutomaticR1,
 compileAutomaticConstructionOwnerR1 as compileGlassFleeceAutomaticR1,
 unresolvedApplicationNormTruthR1 as glassFleeceUnresolvedR1,
 type AutomaticOwnerDefinition as GlassFleeceDefinitionR1,
 type AutomaticParameterSpec as GlassFleeceParameterR1,
 type AutomaticRowSpec as GlassFleeceRowR1,
 type AutomaticInclusionCondition as GlassFleeceConditionR1} from '../../automaticConstructionOwnerR1';
import {canonicalEstimateStableJson as glassFleeceStableR1} from '../../../backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText as glassFleeceShaTextR1} from '../../../backendPlatform/canonicalEstimateSha256';
import {compileFormulaGraph as glassFleeceFormulaR1, type FormulaAst as GlassFleeceAstR1} from '../../../backendPlatform/formulaGraph';
import {estimateDeterministicHash as glassFleeceRowHashR1} from '../../../estimateDeterministicHash';

type GlassFleeceRecordR1=Record<string,unknown>;
const gr1=(value:unknown):GlassFleeceRecordR1=>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('GLASS_FLEECE_R1_RECORD_REQUIRED');return Object.fromEntries(Object.entries(value));};
const gt1=(value:unknown):string=>{if(typeof value!=='string')throw Error('GLASS_FLEECE_R1_TEXT_REQUIRED');return value;};
const ga1=(value:unknown):unknown[]=>{if(!Array.isArray(value))throw Error('GLASS_FLEECE_R1_ARRAY_REQUIRED');return value;};
const gb1=(value:unknown):boolean=>{if(typeof value!=='boolean')throw Error('GLASS_FLEECE_R1_BOOLEAN_REQUIRED');return value;};
const gi1=(value:unknown):number=>{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('GLASS_FLEECE_R1_ORDINAL_REQUIRED');return value;};
function glassFleeceAstR1(value:unknown):GlassFleeceAstR1{
 const x=gr1(value);
 if(x.kind==='literal')return{...x,kind:'literal',value:gt1(x.value)};
 if(x.kind==='parameter')return{...x,kind:'parameter',id:gt1(x.id)};
 if(x.kind==='unary'&&(x.operator==='+'||x.operator==='-'))return{...x,kind:'unary',operator:x.operator,operand:glassFleeceAstR1(x.operand)};
 if(x.kind==='binary'&&(x.operator==='+'||x.operator==='-'||x.operator==='*'||x.operator==='/'))return{...x,kind:'binary',operator:x.operator,left:glassFleeceAstR1(x.left),right:glassFleeceAstR1(x.right)};
 if(x.kind==='conditional')return{...x,kind:'conditional',condition:glassFleeceAstR1(x.condition),whenTrue:glassFleeceAstR1(x.whenTrue),whenFalse:glassFleeceAstR1(x.whenFalse)};
 if(x.kind==='call'&&(x.function==='ceil'||x.function==='floor'||x.function==='max'||x.function==='min'||x.function==='pow'||x.function==='round_to'||x.function==='sqrt'||x.function==='unit_convert'))return{...x,kind:'call',function:x.function,arguments:ga1(x.arguments).map(glassFleeceAstR1)};
 throw Error('GLASS_FLEECE_R1_AST_REQUIRED');
}
export const glassFleeceCurrentWholePackR1=glassFleecePackR1;
/** All ten actual sets, full header, raw provenance and arithmetic are guarded
 * before mapping. No reconstruction from the manifest or generic59 fixture. */
export function glassFleeceActualCurrentR1(actual:unknown=glassFleeceParentR1080):GlassFleeceDefinitionR1{
 const snapshot=gr1(actual),body=gr1(snapshot.body),header=gr1(snapshot.header);
 if(glassFleeceStableR1(header)!==glassFleeceStableR1(glassFleecePackR1.parent.header)
  ||glassFleeceShaTextR1(glassFleeceStableR1(body))!==glassFleecePackR1.parent.bodySha256)throw Error('GLASS_FLEECE_R1_ACTUAL_R1080_BODY_REQUIRED');
 const definition=gr1(ga1(body.definition)[0]);
 if(definition.catalog_id!==glassFleecePackR1.catalogId||definition.id!==header.definition_version_id
  ||definition.definition_sha256!==header.definition_sha256||definition.definition_version!==3)throw Error('GLASS_FLEECE_R1_ACTUAL_HEADER_REQUIRED');
 const parameters:GlassFleeceDefinitionR1['parameters'][number][]=ga1(body.parameters).map(raw=>{const p=gr1(raw);return{...p,
  parameter_id:gt1(p.parameter_id),ordinal:gi1(p.ordinal),value_type:gt1(p.value_type),unit_id:p.unit_id===null?null:gt1(p.unit_id),title_ru:gt1(p.title_ru),
  required:gb1(p.required),default_value:p.default_value,constraints_json:p.constraints_json===null?null:gr1(p.constraints_json),truth_metadata:gr1(p.truth_metadata)};});
 const formulas:GlassFleeceDefinitionR1['formulas'][number][]=ga1(body.formulas).map(raw=>{const f=gr1(raw),expression=gt1(f.expression_source),compiled=glassFleeceFormulaR1(expression),ast=glassFleeceAstR1(f.ast),inputs=ga1(f.input_parameter_ids).map(gt1);
  if(glassFleeceStableR1(compiled.ast)!==glassFleeceStableR1(ast)||glassFleeceStableR1(compiled.inputParameterIds)!==glassFleeceStableR1(inputs))throw Error('GLASS_FLEECE_R1_RETAINED_FORMULA_PARITY');
  return{...f,formula_id:gt1(f.formula_id),output_unit_id:gt1(f.output_unit_id),expression_source:expression,ast,input_parameter_ids:inputs,ast_sha256:gt1(f.ast_sha256)};});
 const resources:GlassFleeceDefinitionR1['resources'][number][]=ga1(body.resources).map(raw=>{const r=gr1(raw);return{...r,id:gt1(r.id),row_id:gt1(r.row_id),ordinal:gi1(r.ordinal),section:gt1(r.section),category:gt1(r.category),title_ru:gt1(r.title_ru),unit_id:gt1(r.unit_id),formula_id:gt1(r.formula_id),inclusion_ast:gr1(r.inclusion_ast),resource_graph:gr1(r.resource_graph),procurement_eligible:gb1(r.procurement_eligible),cost_owner_id:r.cost_owner_id===null?null:gt1(r.cost_owner_id),source_metadata:r.source_metadata===null?null:gr1(r.source_metadata),row_sha256:gt1(r.row_sha256)};});
 if(parameters.length!==1||formulas.length!==59||resources.length!==59||ga1(body.bindings).length!==0||ga1(body.locators).length!==0||ga1(body.sources).length!==0)throw Error('GLASS_FLEECE_R1_CURRENT_SHAPE_REQUIRED');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']};
}

const gp1=glassFleecePackR1,gn1=gp1.namespace,gid1=(key:string)=>gn1+key,
 geq1=(id:string,value:string):GlassFleeceConditionR1=>({kind:'equals',parameterId:id,value}),
 gexact1=geq1(gp1.selector.parameterId,gp1.selector.exactValue);
function glassFleeceFactIdsR1(keys:readonly string[]){return keys.map(key=>{const f=gp1.protectedFacts.find(f=>f.key===key);if(!f)throw Error('GLASS_FLEECE_R1_FACT:'+key);return f.id;});}
function glassFleeceOperationsR1(keys:readonly string[]){
 const refs=keys.map(key=>{const o=gp1.operations.find(o=>o.key===key);if(!o)throw Error('GLASS_FLEECE_R1_OPERATION:'+key);return{operationId:gid1('operation:'+key),operationTitleRu:o.titleRu,processOrdinal:gp1.operations.indexOf(o)*10,processRole:'PROCESS' as const,completionCriterionRu:'Состав и результат точной операции проверены; открытые количества и условия не скрываются.'};});
 return{contractVersion:'canonical-operation-resource/v1',groupId:gn1,groupTitleRu:gp1.titleRu,...refs[0]!,additionalOperations:refs.slice(1)};
}
function glassFleeceRehashR1(row:GlassFleeceDefinitionR1['resources'][number]):GlassFleeceDefinitionR1['resources'][number]{const{row_sha256:_old,...content}=row;return{...content,row_sha256:glassFleeceRowHashR1(content)};}
/** Additive exact-method continuation in the existing registered Wave1 owner.
 * Native 59 source/AST/units/cost owners stay historical; none become OEM norms. */
export function buildGlassFleeceCurrentWholeR1(actual:unknown=glassFleeceParentR1080):GlassFleeceDefinitionR1{
 const old=glassFleeceActualCurrentR1(actual),evidence=gp1.primaryPins[0]!,held=new Map(gp1.resources.filter(r=>r.heldQuantity).map(r=>[r.expression,r.quantityBasis]));
 const selectors:GlassFleeceParameterR1[]=[{id:gp1.selector.parameterId,title:'Способ наклеивания существующей карточки',valueType:'enum',unitId:null,kind:'ordinary',values:[gp1.selector.legacyValue,gp1.selector.exactValue]},{id:gp1.jointParameterId,title:'Стыковка по принятой раскладке',valueType:'enum',unitId:null,kind:'ordinary',values:gp1.jointValues,requiredWhen:{parameterId:gp1.selector.parameterId,value:gp1.selector.exactValue}}];
 const ordinary:GlassFleeceParameterR1[]=[...selectors,...gp1.numericDrivers.map(d=>({id:d.id,title:d.titleRu,valueType:d.integer?'integer' as const:'decimal' as const,unitId:d.unitId,kind:'ordinary' as const,min:d.minimum}))];
 const conditional:GlassFleeceParameterR1[]=[...gp1.protectedFacts.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:f.values,requiredWhen:{parameterId:gp1.selector.parameterId,value:gp1.selector.exactValue}})),...gp1.conditionalScopes.map(f=>({id:f.id,title:f.titleRu,valueType:'enum' as const,unitId:null,kind:'conditional' as const,values:f.values,requiredWhen:{parameterId:gp1.selector.parameterId,value:gp1.selector.exactValue}})),...[...held].map(([id,title])=>({id,title,valueType:'decimal' as const,unitId:gp1.resources.find(r=>r.expression===id)!.unitId,kind:'internal' as const,min:0}))];
 const rows:GlassFleeceRowR1[]=gp1.resources.map(r=>{
  const scope='scope' in r?gr1(r.scope):null,scopeId=scope?gt1(scope.parameterId):null;
  const inclusion:GlassFleeceConditionR1=scope?{kind:'and',operands:[gexact1,geq1(gt1(scope.parameterId),gt1(scope.value))]}:gexact1;
  return{rowId:r.rowId,formulaId:r.formulaId,section:r.primaryOperation,category:r.publicKind==='LABOR'?'labor':r.publicKind==='TRANSPORT'?'transport':r.publicKind==='SERVICE'?'service':['MATERIAL','CONSUMABLE'].includes(r.publicKind)?'material':'equipment',title:r.nameRu,unitId:r.unitId,expression:r.expression,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion,
   inputParameterIds:[...glassFleeceFactIdsR1(r.factKeys),...(r.operations.some(op=>['layout','hanging','joints'].includes(op))?[gp1.jointParameterId]:[]),...(scopeId?[scopeId]:[])],
   ...(['fleece','glue','primer','wash-water','waste-haul'].includes(r.functionKey)?{formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId:r.unitId,minimum:0,reasonRu:'Сырой материальный баланс; отрицательное значение не обнуляется и не скрывается.'}}:{})};
 });
 const p=gp1.parameterPrefix,glue=gp1.resources.find(r=>r.functionKey==='glue')!.expression;
 const controls:GlassFleeceRowR1[]=[
  {rowId:gid1('glue-rate-check'),formulaId:gid1('formula:glue-rate-check'),section:'glue',category:'material',title:'Контроль расхода клея по принятой пробе',unitId:'kg_m2',expression:gp1.quantityRules.glueRate,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['product','bond_trial','records']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg_m2',minimum:0.000001,maximum:0.220,reasonRu:'Проба должна иметь положительный расход до220г/м²; нижняя положительная норма не выдумана, нулевой результат не подтверждает приклейку.'}},
  {rowId:gid1('primer-rate-check'),formulaId:gid1('formula:primer-rate-check'),section:'primer',category:'material',title:'Контроль расхода грунта по принятой пробе',unitId:'kg_m2',expression:gp1.quantityRules.primerRate,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['primer','records']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg_m2',minimum:0.100,maximum:0.250,reasonRu:'Только подтверждённая проба точного грунта в пределах100–250г/м² на проход; средний расход не назначается.'}},
  {rowId:gid1('covering-balance-check'),formulaId:gid1('formula:covering-balance-check'),section:'layout',category:'material',title:'Баланс полотен, укладки и пригодного возврата',unitId:'m2',expression:gp1.resources.find(r=>r.functionKey==='fleece')!.expression+'-'+p+'net_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['layout','records']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'m2',minimum:0,reasonRu:'Принятый раскрой покрывает укладку и годный возврат; усреднённый процент отходов не заменяет баланс.'}},
  {rowId:gid1('trial-area-check'),formulaId:gid1('formula:trial-area-check'),section:'glue',category:'material',title:'Проверка клеевой пробы внутри окончательной площади',unitId:'m2',expression:p+'net_area_m2-'+p+'trial_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['bond_trial','records']),formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'m2',minimum:0,reasonRu:'Клеевая проба входит в итоговую оклейку один раз; внешний образец требует собственного принятого материального баланса.'}},
  {rowId:gid1('fleece-order'),formulaId:gid1('formula:fleece-order'),section:'incoming',category:'material',title:'Рулоны стеклохолста по принятой схеме поставки',unitId:'roll',expression:p+'planned_roll_count',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['product','layout','records'])},
  {rowId:gid1('glue-order'),formulaId:gid1('formula:glue-order'),section:'incoming',category:'material',title:'Клей по подтверждённому балансу поставки',unitId:'kg',expression:`ceil(max(0,(${glue})+${p}glue_reserve_kg-${p}glue_stock_kg)/(10*${p}glue_supplier_multiple))*(10*${p}glue_supplier_multiple)`,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:glassFleeceFactIdsR1(['product','bond_trial','records'])},
  {rowId:gid1('joint-method-check'),formulaId:gid1('formula:joint-method-check'),section:'joints',category:'material',title:'Стыковка по принятому способу раскроя',unitId:'m2',expression:p+'net_area_m2',procurement:false,costTreatment:'INFORMATIONAL_SCOPE',inclusion:gexact1,inputParameterIds:[gp1.jointParameterId,...glassFleeceFactIdsR1(['layout','product'])]}
 ];
 const added=buildGlassFleeceAutomaticR1({contract:gp1.contract,semanticOwner:gn1,sourceId:gp1.sourceId,normId:'GLASS_FLEECE_EXACT_OEM_AND_MEASUREMENTS_NOT_LABOUR_NORM',sourceMetadata:{source_title:gp1.titleRu,source_document_version:gp1.contract,definition_hash:evidence.sha256,artifact_sha256:evidence.sha256,exact_locator:'Pinned official Alaxar fleece/ready glue/primer TDS full linked pages; physical map and one-use balances; native59 not OEM authority'},applicabilityRu:gp1.scopeRu,ordinary,profile:[],conditional,rows:[...rows,...controls],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:gp1.sourceHolds.map(h=>h.needId+': '+h.basis)});
 const factIds=new Set([...gp1.protectedFacts,...gp1.conditionalScopes].map(f=>f.id)),numericIds=new Set(gp1.numericDrivers.map(d=>d.id)),selectorIds=new Set(selectors.map(s=>s.id));
 const parameters=[...old.parameters,...added.parameters.map((parameter,index)=>{
  let truth=parameter.truth_metadata;
  if(factIds.has(parameter.parameter_id))truth={...truth,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL',source_readback_only_v1:true,consumer_question_allowed:false}};
  else if(held.has(parameter.parameter_id))truth=glassFleeceUnresolvedR1(truth,held.get(parameter.parameter_id)!);
  else if(numericIds.has(parameter.parameter_id)||selectorIds.has(parameter.parameter_id))truth={...truth,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,visible_when:parameter.parameter_id===gp1.selector.parameterId?{kind:'literal',value:true}:gexact1,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...gr1(truth.guide),source_role:'USER_MEASURED',guide_kind:'MEASUREMENT_RULE',source_document:gp1.quantityEvidence.path,source_locator:'One-use cut/mass/wash/stock/accepted labour records; no defaults, no approximate density',source_snapshot_hash:gp1.quantityEvidence.sha256}};
  return{...parameter,ordinal:old.parameters.length+index,required:false,default_value:null,truth_metadata:truth};
 })];
 const legacy=geq1(gp1.selector.parameterId,gp1.selector.legacyValue),resources=[...old.resources.map(r=>glassFleeceRehashR1({...r,inclusion_ast:{kind:'and',operands:[legacy,r.inclusion_ast]}})),...added.resources.map((r,index)=>{
  const item=gp1.resources.find(item=>item.rowId===r.row_id),ops=item?.operations??(r.row_id.includes('primer-rate')?['primer']:r.row_id.includes('glue-rate')||r.row_id.includes('trial-area')?['glue']:r.row_id.includes('covering-balance')?['layout']:r.row_id.includes('joint-method')?['joints']:['incoming']);
  const facts=item?[...glassFleeceFactIdsR1(item.factKeys),...('scope' in item?[gt1(gr1(item.scope).parameterId)]:[])]:Array.isArray(r.resource_graph.inputParameterIds)?r.resource_graph.inputParameterIds.filter((id):id is string=>typeof id==='string'&&factIds.has(id)):[];
  return glassFleeceRehashR1({...r,ordinal:old.resources.length+index,resource_graph:{...r.resource_graph,operationCompositionV1:glassFleeceOperationsR1(ops),requiredFactConditionIds:facts,scopeContextParameterIds:[p+'net_area_m2'],publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',nameRu:r.title_ru,sourceTitleRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[],...(item?{resourceKind:item.publicKind}:{rowKind:'PROCESS_NOTE'})},sourceOnlyPaymentBoundaryR1:{actualPaidOwnerOrOrderNotAsserted:true,noSecondPaymentOrOrder:true}},source_metadata:{...r.source_metadata,source_kind:'PROJECT_SYSTEM',native59NormAuthorityTransferred:false,actualObjectFactsAsserted:false,fullTechnicalAcceptance:false}});
 })];
 if(new Set([...old.formulas,...added.formulas].map(f=>f.formula_id)).size!==old.formulas.length+added.formulas.length)throw Error('GLASS_FLEECE_R1_FORMULA_ID_COLLISION');
 return{parameters,formulas:[...old.formulas,...added.formulas],resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[...new Set([gp1.selector.parameterId,p+'net_area_m2',gp1.jointParameterId,...gp1.numericDrivers.map(d=>d.id)])]};
}
export function compileGlassFleeceCurrentWholeR1(submitted:Record<string,unknown>,confirmed:Record<string,unknown>={},actual:unknown=glassFleeceParentR1080){
 const effective=Object.hasOwn(submitted,gp1.selector.parameterId)?submitted:{...submitted,[gp1.selector.parameterId]:gp1.selector.legacyValue};
 return compileGlassFleeceAutomaticR1({catalogId:gp1.catalogId,compilerVersion:gp1.contract,primaryMeasureParameterId:effective[gp1.selector.parameterId]===gp1.selector.exactValue?gp1.parameterPrefix+'net_area_m2':'q',definition:buildGlassFleeceCurrentWholeR1(actual),submittedParameters:effective,confirmedParameters:confirmed});
}
export function glassFleeceCurrentWholeExpectationsR1(){return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:gp1.primaryPins[0]!.sha256,entries:gp1.resources.map(r=>({expectedResourceId:r.functionKey,sourceId:gp1.sourceId,operationId:gid1('operation:'+r.primaryOperation),condition:gp1.scopeRu,specification:r.authority,unitId:r.unitId,formulaId:r.formulaId,quantityRule:r.quantityBasis,requiredOperationIds:r.operations.map(o=>gid1('operation:'+o)),resolution:{kind:'ROW',rowId:r.rowId}})),legacy59ReboundToOemAuthority:false,fullTechnicalAcceptance:false};}
export function glassFleeceCurrentWholeOrdinaryRequestR1(){return{catalogId:gp1.catalogId,sourceId:gp1.sourceId,existingOwner:'src/lib/estimate/v4/domains/interiorFinishesWave1/productionBinding.ts',registeredVia:'interiorFinishesComplete inherited Wave1 method',existingPublisher:'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',status:'SOURCE_AWARE_ORDINARY_TARGET_CONFIG_HELD',expectedCurrentHeader:gp1.parent.header,expectedCurrentShape:gp1.parent.shape,nativeRegistryCounts:[0,0,0],candidateSourceObservation:gp1.formalIntake.newCandidateSourceObservation,legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',templateId:'plaster_paint_interior_glass_fiber_apply_standard_professional_expanded_v1',parameterSources:{q:['r555-source:plaster_paint_interior_glass_fiber_apply_standard_professional_expanded_v1']}},nativeRowsMustNotReceiveNewOemBinding:true,newBindingRowIds:buildGlassFleeceCurrentWholeR1().resources.slice(59).map(r=>r.row_id),requiredBeforeRuntime:['ROOT existing exact scoped capture/retained source closure','finite existing typed witness of all new resources and original required facts','normal+locked existing preflight','finite Core/saved/cold/ordinary cases and actual application review','existing source-owned wrapper must materialize only omitted legacy selector; no unapproved new default/baseline and no quantity hydration'],newReader:false,newPublisher:false,defaultSelectorUnchanged:true,admissionGranted:false};}
