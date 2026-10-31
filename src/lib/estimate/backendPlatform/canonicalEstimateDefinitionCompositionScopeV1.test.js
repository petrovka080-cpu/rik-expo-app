// Finite contract fixtures only; values are never product/object authority.
const { test } = require("@jest/globals");
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const pub=require('../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1');
const saved=require('./canonicalEstimateSavedOperationAcceptanceV1');
const {canonicalEstimateStableJson:stable}=require('./canonicalEstimateDeterminism');
const hash=v=>crypto.createHash('sha256').update(stable(v)).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const operation=id=>({contractVersion:'canonical-operation-resource/v1',groupId:'TEST_SCOPE',groupTitleRu:'Проверочный монтаж',operationId:id,operationTitleRu:id==='active'?'Установить крепление':'Выполнить прежнюю операцию',completionCriterionRu:'Крепление установлено по принятому методу.',processRole:'PROCESS'});
const resource=(id,op,ast)=>({row_id:id,title_ru:id==='new'?'Крепление':'Прежний труд',unit_id:'pcs',category:'material',formula_id:'formula:'+id,inclusion_ast:ast,
 resource_graph:{costTreatment:'OWN_COST',operationCompositionV1:operation(op),publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:id==='new'?'Крепление':'Прежний труд',nameRu:id==='new'?'Крепление':'Прежний труд',resourceKind:'MATERIAL',brandAndModelRu:null,specificationRu:null,detailsRu:[]}}});
const rows=[resource('new','active',{kind:'equals',parameterId:'method',value:'NEW'}),resource('old','legacy',{kind:'equals',parameterId:'method',value:'OLD'})];
const classes=['MATERIAL','CONSUMABLE','TOOL','ACCESSORY','EQUIPMENT','MECHANISM','LABOR','SERVICE','TRANSPORT','PPE'];
const entry=(row,op)=>({expectedResourceId:row.row_id,sourceId:'TEST_ONLY',condition:'Finite test method, no actual object authority',operationId:op,publicNameRu:row.title_ru,resourceKind:'MATERIAL',requiredOperationIds:[op],resolution:{kind:'ROW',rowId:row.row_id}});
const review=(op,id)=>({operationId:op,sourceId:'TEST_ONLY',requirements:Object.fromEntries(classes.map(kind=>[kind,kind==='MATERIAL'?{status:'REQUIRED',rowIds:[id]}:op==='legacy'?{status:'UNRESOLVED',rowIds:[],reasonRu:'Источник прежнего класса неизвестен.'}:{status:'NOT_APPLICABLE',reasonRu:'Исключено только в конечной проверочной модели.'}]))});
const map={contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,evidenceSha256:'a'.repeat(64),operationRoster:[operation('active'),operation('legacy')],entries:[entry(rows[0],'active'),entry(rows[1],'legacy')],operationRequirements:[review('active','new'),review('legacy','old')]};
const parameters=[{parameter_id:'method',value_type:'enum',constraints_json:{values:['NEW']},truth_metadata:{visibility_role:'INTERNAL_ONLY'}}];
const scope={contractVersion:'canonical-definition-composition-scope/v1',lockedParameterValues:{method:'NEW'},inactiveRows:[{rowId:'old',inclusionSha256:hash(rows[1].inclusion_ast)}],inactiveOperationIds:['legacy'],sourceEvidence:[{sha256:'a'.repeat(64),locator:'Finite contract fixture, not product source'}]};
const input=()=>({parameterDefinitions:clone(parameters),resourceDefinitions:clone(rows),independentComposition:{...clone(map),definitionCompositionScopeV1:clone(scope)}});

const reject=value=>assert.equal(pub.auditCanonicalPublisherSuccessorOperationResourcesR1(value).definitionAdmissionAllowed,false);
test('old callers keep the mandatory unresolved legacy refusal',()=>reject({parameterDefinitions:parameters,resourceDefinitions:rows,independentComposition:map}));
test('whole new definition admits only proven unreachable history',()=>{const x=input(),before=stable(x);assert.equal(pub.auditCanonicalPublisherSuccessorOperationResourcesR1(x).definitionAdmissionAllowed,true);assert.equal(stable(x),before);});
test('broadened enum cannot archive a reachable legacy method',()=>{const x=input();x.parameterDefinitions[0].constraints_json.values.push('OLD');reject(x);});
test('user-visible method cannot supply the singleton proof',()=>{const x=input();x.parameterDefinitions[0].truth_metadata.visibility_role='USER_INPUT';reject(x);});
test('runtime default cannot replace a declared enum domain',()=>{const x=input();delete x.parameterDefinitions[0].constraints_json;x.parameterDefinitions[0].default_value='NEW';reject(x);});
test('direct caller without parameter definitions fails closed',()=>{const x=input();delete x.parameterDefinitions;reject(x);});
test('modified inactive AST with stale source hash is refused',()=>{const x=input();x.resourceDefinitions[1].inclusion_ast.value='NEW';reject(x);});
test('updated hash cannot make an active row unreachable',()=>{const x=input();x.resourceDefinitions[1].inclusion_ast.value='NEW';x.independentComposition.definitionCompositionScopeV1.inactiveRows[0].inclusionSha256=hash(x.resourceDefinitions[1].inclusion_ast);reject(x);});
test('unknown inclusion is never a false proof',()=>{const x=input();x.resourceDefinitions[1].inclusion_ast={kind:'equals',parameterId:'unknown',value:'OLD'};x.independentComposition.definitionCompositionScopeV1.inactiveRows[0].inclusionSha256=hash(x.resourceDefinitions[1].inclusion_ast);reject(x);});
test('missing active physical resource is still rejected',()=>{const x=input();x.resourceDefinitions=x.resourceDefinitions.filter(row=>row.row_id!=='new');reject(x);});
test('unproved active PPE class is still rejected',()=>{const x=input();x.independentComposition.operationRequirements[0].requirements.PPE={status:'UNRESOLVED',rowIds:[],reasonRu:'Неизвестное обеспечение'};reject(x);});
test('shared consumer cannot be archived while used by an active row',()=>{const x=input();x.resourceDefinitions[0].resource_graph.operationCompositionV1.additionalOperations=[{...operation('legacy')}];reject(x);});
test('inactive source entry cannot be silently deleted',()=>{const x=input();x.independentComposition.entries=x.independentComposition.entries.filter(e=>e.resolution.rowId!=='old');reject(x);});
test('fiscal summary remains rejected whenever it is active',()=>{const x=input();delete x.independentComposition.definitionCompositionScopeV1;x.resourceDefinitions[1].resource_graph.operationCompositionV1.processRole='COST_SUMMARY';reject(x);});
function revision(m=clone(input().independentComposition)){
 const evidence=saved.canonicalOperationCompositionEvidenceFromPassportV1({releaseId:'TEST_RELEASE',definitionVersionId:'TEST_DEFINITION',passport:{definition_version_id:'TEST_DEFINITION',payload_sha256:'b'.repeat(64),decision:{independentCompletenessMap:m}}});
 return {id:'TEST_REVISION',release_id:'TEST_RELEASE',definition_version_id:'TEST_DEFINITION',checksum_sha256:'c'.repeat(64),input_parameters:{method:'NEW'},amendment_contract:{parameterSources:{operationCompositionEvidenceV1:evidence}}};
}
const savedRow=()=>({...clone(rows[0]),quantity:null,ownership_status:'PRELIMINARY_NEED',need_state:'QUANTITY_REQUIRED',calculation_trace:{resourceGraph:clone(rows[0].resource_graph),needState:'QUANTITY_REQUIRED'}});
test('cold saved read retains pinned map and honest unknown quantity',()=>{const r=revision(),before=stable(r),gate=saved.canonicalEstimateSavedOperationAcceptanceV1({revision:r,resources:[savedRow()]});assert.equal(gate.pdfAllowed,true,stable(gate));assert.equal(gate.completeClaimAllowed,false);assert.equal(stable(r),before);});
test('unexpected inactive row on saved read blocks artifacts',()=>{const gate=saved.canonicalEstimateSavedOperationAcceptanceV1({revision:revision(),resources:[savedRow(),{...clone(rows[1]),quantity:1}]});assert.equal(gate.pdfAllowed,false);assert(gate.issues.some(i=>i.code==='SAVED_DEFINITION_COMPOSITION_SCOPE_INVALID'));});
test('saved incompatible method cannot use the new composition proof',()=>{const r=revision();r.input_parameters.method='OLD';assert.equal(saved.canonicalEstimateSavedOperationAcceptanceV1({revision:r,resources:[savedRow()]}).pdfAllowed,false);});
test('tampered saved proof remains rejected by immutable evidence hash',()=>{const r=revision();r.amendment_contract.parameterSources.operationCompositionEvidenceV1.independentComposition.definitionCompositionScopeV1.inactiveRows=[];assert.equal(saved.canonicalEstimateSavedOperationAcceptanceV1({revision:r,resources:[savedRow()]}).pdfAllowed,false);});
