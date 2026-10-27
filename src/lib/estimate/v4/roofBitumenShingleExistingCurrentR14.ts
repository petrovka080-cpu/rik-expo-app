import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput as CoreInput,
 type CanonicalEstimateParameterDefinition as CoreParameter} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalApprovedBaselineRuntimeParameters,type CanonicalApprovedBaselineRecord} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {bitumenTileSoftRoofDefinitionS2763} from './bitumenTileSoftRoofS2763';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';

type Json=Record<string,unknown>;
type Parameter=CoreParameter&{ordinal:number;title_ru:string;truth_metadata:Json};
export type RoofBitumenShingleCurrentCaptureR14={
 definition:Json&{id:string;catalog_id:string;definition_sha256:string;definition_version:number;applicability:Json};
 baseline:Json&CanonicalApprovedBaselineRecord;parameters:Parameter[];
 formulas:CoreInput['formulaDefinitions'];resources:CoreInput['resourceDefinitions'];
 bindings:Json[];normativeSources:Json[];normativeLocators:Json[];contentPassport:Json;
};
type Pack={contract:string;catalogId:string;definitionId:string;definitionSha256:string;technicalGateIds:string[];
 truthChanges:Record<string,Json>;wholePrefix:string;wholeRoleIds:string[];primaryMeasureId:'q';ordinaryGeometryIds:string[]};
const pack=require('../../../../data/estimate-benchmarks/source-packs/roof-bitumen-shingle-existing-current-r14.json') as Pack;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/roof-bitumen-shingle-existing-current-r14.json') as {capture:RoofBitumenShingleCurrentCaptureR14};
const clone=<T,>(value:T):T=>structuredClone(value);
const check=(value:unknown,reason:string):void=>{if(!value)throw Error('ROOF_BITUMEN_SHINGLE_R14_'+reason);};
const record=(v:unknown):Json=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
export const roofBitumenShingleCurrentCaptureR14=():RoofBitumenShingleCurrentCaptureR14=>clone(fixture.capture);

/** Reuse the current whole11-row norm and its original ordinary family builder.
 * Only three source/project questions leave the user form. Neither geometry
 * nor this adapter confirms sheathing, exact product, norm conditions or the
 * source's unestablished mortar rate. Existing129-row composition stays intact. */
export function buildRoofBitumenShingleExistingR14(current:RoofBitumenShingleCurrentCaptureR14):RoofBitumenShingleCurrentCaptureR14{
 check(current.definition.id===pack.definitionId&&current.definition.catalog_id===pack.catalogId
  &&current.definition.definition_sha256===pack.definitionSha256&&JSON.stringify(current)===JSON.stringify(fixture.capture),'EXACT_CURRENT_PARENT_DRIFT');
 const original=bitumenTileSoftRoofDefinitionS2763();check(original.resources.length===11,'EXISTING_WHOLE_BUILDER_REQUIRED');
 for(const role of pack.wholeRoleIds){
  const id=pack.wholePrefix+':'+role,oldRow=current.resources.find(r=>r.row_id===id),sourceRow=original.resources.find(r=>r.row_id===id);
  const idFormula=pack.wholePrefix+':formula:'+role,oldFormula=current.formulas.find(f=>f.formula_id===idFormula),sourceFormula=original.formulas.find(f=>f.formula_id===idFormula);
  check(oldRow&&sourceRow&&oldFormula&&sourceFormula&&oldRow.unit_id===sourceRow.unit_id
   &&oldFormula.expression_source===sourceFormula.expression_source,'EXISTING_WHOLE_SOURCE_OR_ID_DRIFT_'+role);
  check(oldRow!.cost_owner_id===pack.catalogId+':'+id,'SOLE_EXISTING_COST_OWNER_DRIFT_'+role);
 }
 const next=clone(current);check(pack.technicalGateIds.length===3&&new Set(pack.technicalGateIds).size===3,'EXACT_THREE_PROJECT_GATES_REQUIRED');
 for(const id of pack.technicalGateIds){const p=next.parameters.find(p=>p.parameter_id===id);check(p,'EXISTING_GATE_REQUIRED');
  const old=p!.truth_metadata;check(p!.value_type==='enum'&&p!.default_value===null&&JSON.stringify(old)===JSON.stringify(pack.truthChanges[id])
   &&old.visibility_role==='USER_INPUT'&&old.value_source_role==='PROJECT_SPECIFIC_INPUT'
   &&record(old.provenance).consumer_input_role_v1==='OBJECT_FACT','CAPTURED_GATE_TRUTH_DRIFT');
  p!.truth_metadata={...old,visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',source_confirmation_required:true,
   provenance:{...record(old.provenance),consumer_input_role_v1:'APPLICATION_TECHNICAL'}};
 }
 for(const p of next.parameters)if(!pack.technicalGateIds.includes(p.parameter_id))
  check(JSON.stringify(p)===JSON.stringify(current.parameters.find(old=>old.parameter_id===p.parameter_id)),'UNDECLARED_PARAMETER_DELTA');
 for(const field of ['definition','baseline','formulas','resources','bindings','normativeSources','normativeLocators','contentPassport'] as const)
  check(JSON.stringify(next[field])===JSON.stringify(current[field]),'PHYSICAL_SOURCE_OWNER_OR_HISTORY_DELTA_'+field);
 check(Object.keys(canonicalApprovedBaselineRuntimeParameters(next.baseline)).length===0,'FIXTURE_PROMOTION_FORBIDDEN');return next;
}

/** Same existing core and full actual user geometry snapshot. No project-data
 * importer is fabricated: absent trusted source facts remain needs. */
export function compileRoofBitumenShingleExistingR14(model:RoofBitumenShingleCurrentCaptureR14,
 geometry:Readonly<Record<string,unknown>>,options:{rowOverrides?:CoreInput['rowOverrides']}={}){
 check(model.definition.catalog_id===pack.catalogId&&Object.keys(geometry).every(id=>id==='q'),'ONLY_EXISTING_MEASURED_ROOF_AREA_CAN_BE_SUBMITTED');
 return compileCanonicalEstimateCore({operation:options.rowOverrides?'recalculate':'compile',compilerVersion:pack.contract,catalogId:pack.catalogId,
  primaryMeasureParameterId:'q',parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  submittedParameters:{...geometry},confirmedParameters:canonicalApprovedBaselineRuntimeParameters(model.baseline),rowOverrides:options.rowOverrides??{},
  currencyCode:'KGS',priceItems:[],maximumResourceRows:512,hashJson:async value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
}
