// Pure WORK source-bound factory for ROOT's existing governed publisher. No SQL/PG/CLI or on-import run.
// ROOT must implement the scoped binding.applicabilityByRowId opt-in in the shared publisher before actual checks.
import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateIndependentCompletenessMapReferences,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
  type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {castironRadiatorDefinitionR1,castironRadiatorPackR1 as pack,castironRadiatorCompletenessMapR1} from '../../../src/lib/estimate/v4/castironRadiatorKrer18R1';
type Json=Record<string,any>;
export type CastironRadiatorSourceAwareConfigR1=MasterSingleDefinitionSuccessorConfig&Readonly<{
  binding:MasterSingleDefinitionSuccessorConfig['binding']&Readonly<{applicabilityByRowId:Readonly<Record<string,Json>>}>;
}>;
type Evidence=Readonly<{currentReadPath?:string;targetedReadPath?:string;collisionReadPath?:string;decisionPath?:string;
  proposalPath?:string;sourcePackPath?:string;byteExactReceiptPath?:string}>;
const SHA={
  "current": "fb29e272d6b08e3f05daa8090ee7914c274e15c4bca6eaa5eb636849a3945995",
  "targeted": "309f83c168b6fd6be96232c7a46dcec182e4378dc174ebd25194aced64c424e1",
  "collision": "889565b422adace389c38dc5b7d82ce2a7ac02ad05daa66e32d45c17a09f1043",
  "decision": "b72ad1080d2fa4dc5ede69f3851184850eb66564a8b121a90b2cdadf198bd70c",
  "proposal": "e80c9e0e99ce3e44817dbd0904ca7b9e2f28cbb5cf1555c3e121056b43e3e9e7",
  "receipt": "420db561b719ec1661fda3dce2c8a8fd54a790c9220888bf9070245a6f24189d",
  "sourcePack": "26d9e990e62b503774c9e82e2b7266d0e5290d15b9b0c44f91028da002d9a241"
};
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const exact=(p:string,h:string):Json=>{const b=readFileSync(resolve(p));assert.equal(sha(b),h,'CASTIRON_EXACT_EVIDENCE:'+p);return JSON.parse(b.toString('utf8'));};
const packPath='data/estimate-benchmarks/source-packs/castiron-radiator-krer18-install-prep-r1.json';
const defaults={currentReadPath:'data/estimate-benchmarks/fixtures/castiron-radiator-current18-9-r1.json',
  targetedReadPath:'data/estimate-benchmarks/fixtures/castiron-radiator-targeted-source-groups-r1.json',
  collisionReadPath:'data/estimate-benchmarks/fixtures/castiron-radiator-exact-collision-r1.json',
  decisionPath:'data/estimate-benchmarks/fixtures/castiron-radiator-root-partial-append-decision-r1.json',
  proposalPath:'data/estimate-benchmarks/fixtures/castiron-radiator-source-specific-proposal-r1.json',sourcePackPath:packPath,
  byteExactReceiptPath:'data/estimate-benchmarks/fixtures/castiron-radiator-source-bound-byte-exact-adoption-r1.json'};
const rid=(id:string)=>pack.prefix+':'+id;
// Fully explicit30rowIDs and source scopes. Never infer membership by arbitrary rowprefix or bind all78rows.
const EXPECTED_BINDING_MAP:Readonly<Record<string,Json>>=Object.freeze({
  "krer18-castiron-rad-r1:install-worker": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_WHOLE_LABOUR",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-worker": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:included-operators": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_OPERATOR_AGGREGATE_INFORMATIONAL_NO_PAID_OWNER",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:truck-crane": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MACHINE_TIME_INFORMATIONAL_PRICE_PENDING",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:mast-hoist": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MACHINE_TIME_INFORMATIONAL_PRICE_PENDING",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:electric-drill": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MACHINE_TIME_INFORMATIONAL_PRICE_PENDING",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:flatbed-truck": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MACHINE_TIME_INFORMATIONAL_PRICE_PENDING",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:radiator-capacity-consumed": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_RATED_CAPACITY_INFORMATIONAL_SKU_PENDING",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:calibrated-head-dowels-consumed": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:calibrated-head-dowels": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:cement-mortar-m50-consumed": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:cement-mortar-m50": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:brackets-131-consumed": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:brackets-131": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:brackets-325-consumed": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:brackets-325": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-water-consumed": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-water": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:paronite-gaskets-consumed": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:paronite-gaskets": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:linseed-oil-consumed": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:linseed-oil": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:radiator-plugs-consumed": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "SOURCE_MATERIAL_CONSUMPTION",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:radiator-plugs": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "DERIVED_MATERIAL_ORDER_ONE_PRICE_OWNER",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:install-connect": {
    "exactColumn": "18-03-001-01",
    "sourceVolumeParameterId": "installed_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": false,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-unscrew-plugs": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-remove-sections": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-add-sections": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-screw-plugs": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  },
  "krer18-castiron-rad-r1:prep-pressure-test": {
    "exactColumn": "18-03-001-04",
    "sourceVolumeParameterId": "preparation_nominal_output_kw",
    "sourceQuantityDenominatorKW": 100,
    "sourceResourceRole": "INCLUDED_OPERATION_UNDER_WHOLE_LABOUR",
    "preparationSubsetRequired": true,
    "resourceInclusionOwnsApplicability": true,
    "sourceArtifactSha256": "e03a5b71d06410d6e3cb5ac8035abee343ab0a778d98150cb772704e001ad5dc",
    "machinePriceAdmission": false,
    "deviceSkuPriceAdmission": false
  }
});
export function castironRadiatorExpectedBindingApplicabilityR1():Record<string,Json>{
  return Object.fromEntries(Object.entries(EXPECTED_BINDING_MAP).map(([id,value])=>[id,{...value}]));
}
export function assertCastironRadiatorSourceAwareBindingMapR1(value:unknown):asserts value is Readonly<Record<string,Json>>{
  assert(value!==null&&typeof value==='object'&&!Array.isArray(value),'CASTIRON_BINDING_MAP_OBJECT_REQUIRED');
  assert.deepEqual(Object.keys(value).sort(),Object.keys(EXPECTED_BINDING_MAP).sort(),'CASTIRON_BINDING_MAP_EXACT30_KEYS');
  for(const id of Object.keys(EXPECTED_BINDING_MAP)){
    const item:unknown=(value as Record<string,unknown>)[id];assert(item!==null&&typeof item==='object'&&!Array.isArray(item),'CASTIRON_BINDING_ROW_OBJECT_REQUIRED:'+id);
    assert.deepEqual(item,EXPECTED_BINDING_MAP[id],'CASTIRON_BINDING_ROW_EXACT_SOURCE_SCOPE:'+id);
  }
}
/** Synthetic validation inputs only; never project defaults or site acceptance. */
export function castironRadiatorAppendAcceptanceInputR1(kw=100,prepKW=40):Record<string,unknown>{
  const p:Record<string,unknown>={[pack.primaryMeasureParameterId]:kw,[pack.preparationModeParameterId]:'REQUIRES_PREPARATION',
    [pack.preparationParameterId]:prepKW,preparation_method_reference:'VALIDATION_FIXTURE_ONLY required preparation method and local testing'};
  for(const f of pack.scopeFacts)p[f.id]=f.value;
  for(const f of pack.projectReferenceFacts)p[f.id]='VALIDATION_FIXTURE_ONLY project nominaloutput/fixing/access proof';
  for(const material of pack.materials){p[material.parameterPrefix+'_specification']='VALIDATION_FIXTURE_ONLY '+material.nameRu;
    p[material.parameterPrefix+'_stock']=0;p[material.parameterPrefix+'_reserve']=0;
    p[material.parameterPrefix+'_quantum']=material.orderUnitId==='pcs'?1:material.orderUnitId==='m3'?(material.id==='prep-water'?0.01:0.001):0.1;}
  return p;
}
export function prepareCastironRadiatorInstallPrepKrer18AppendR1(evidence:Evidence={}):CastironRadiatorSourceAwareConfigR1{
  const paths={...defaults,...evidence};
  const current=exact(paths.currentReadPath,SHA.current),targeted=exact(paths.targetedReadPath,SHA.targeted),collision=exact(paths.collisionReadPath,SHA.collision),
    decision=exact(paths.decisionPath,SHA.decision),proposal=exact(paths.proposalPath,SHA.proposal),receipt=exact(paths.byteExactReceiptPath,SHA.receipt);
  assert.deepEqual(exact(paths.sourcePackPath,SHA.sourcePack),pack);assert(receipt.allThreeByteExact);
  assert.equal(receipt.formulaOrRowsOrNormConstantsChanged,false);assert.equal(receipt.sourceIdChanged,false);
  assert.equal(decision.status,'ROOT_REVIEWED_PARTIAL_CASTIRON_RADIATOR_APPEND_R1');
  assert.equal(decision.decision,'ADMIT_SOURCE_SPECIFIC_PARTIAL_QUANTITY_APPEND_DESIGN_FOR_CANONICAL_CHECKS');
  assert.equal(decision.proposal.sha256,SHA.proposal);assert.equal(decision.published,false);assert.equal(decision.fullTechnicalAcceptance,false);
  assert.equal(decision.bindingRowsExpected,30);assert.equal(decision.unboundControlRowsExpected,40);assert.equal(decision.unresolvedNeedsExpected,8);
  assert(decision.sourceAwareBindingPer01Or04Required&&decision.prepOnlyConfirmedSubsetKW&&decision.ordinaryManual0or1CannotCloseApplicationNeed);
  assert(decision.machinePricesAndRatedKWDeviceOwnerNotAdmitted);assert.equal(decision.paidMachineOwners,0);assert.equal(decision.priceBindings,0);
  assert.deepEqual(decision.twoSourceColumnsRequired,['18-03-001-01','18-03-001-04']);
  assert.equal(decision.master.sha256,'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2');
  const context=current.executionContext;
  for(const read of [current,targeted,collision]){assert(read.completeReadSet&&read.transactionRolledBack&&read.connectionClosed&&read.error===null);
    assert.deepEqual(read.executionContext,context);}
  assert.deepEqual(context,decision.executionContext);assert.deepEqual(context,proposal.executionContext);
  assert.equal(current.metrics.matchedHeaders,18);assert.equal(current.metrics.currentPassports,9);
  const currentPassports=current.sets.currentMatchedPassportParameterOwnerHeaders.rawRows.map((s:string)=>JSON.parse(s));
  const panel=currentPassports.find((x:Json)=>x.catalog_id==='canonical-work:base:heating_hvac_interior_radiator_install_standard');
  assert.equal(panel.definition_version_id,'d8b54bec-f7f8-52e6-ae91-b83938890315');assert.equal(panel.definition_version,4);
  assert.equal(panel.definition_sha256,'fc6437b13643349e13d24c9ab567f9e60d4f529e8d276f139b46b719d9b5b555');
  assert.equal(panel.applicability.materialSystem,'STEEL_PANEL_RADIATOR_TYPE22_500X1000_BOTTOM_CONNECTION');
  assert.equal(currentPassports.filter((x:Json)=>x.parameter_headers.length===1&&x.parameter_headers[0].parameter_id==='q'&&x.parameter_headers[0].unit_id==='piece'&&x.parameter_headers[0].default_value===100).length,8);
  const source=JSON.parse(targeted.sets.exactSourceStrongPhysicalDedup.rawRows[0]);
  for(const key of ['exact_emitted_source_count','casefold_emitted_source_count','matching_source_count','source_locator_count','current_source_consumer_count','additional_physical_identity_count'])assert.equal(source[key],0,'CASTIRON_CAPTURED_SOURCE_SCOPE:'+key);
  const groups=targeted.sets.exactTwoExistingRadiatorGroupPlacement.rawRows.map((s:string)=>JSON.parse(s));
  assert.equal(groups.length,2);assert.equal(groups.find((g:Json)=>g.group_id.endsWith('_install')).member_set_sha256,'917e2efe2871ab5f73ebbf8ae9106e024841a3880529fb33162c48ec5042a327');
  assert.equal(groups.find((g:Json)=>g.group_id.endsWith('_prepare')).member_set_sha256,'02000938f4a6b767ce7820a04fe21fc2b4843d22b2699124105f854cfe5ff660');
  const absence=JSON.parse(collision.sets.oneProposedIdentityNewGroupCollisionEnvelope.rawRows[0]);
  for(const key of ['identity_hit_count','manifest_hit_count','search_hit_count','membership_hit_count','new_group_hit_count','new_group_membership_count','alias_reference_count'])assert.equal(absence[key],0,'CASTIRON_EXACT_LITERAL_ABSENCE:'+key);
  assert.equal(decision.catalogId,proposal.proposedQueryTargetsNotAdoptedIdentity.catalogId);assert.equal(decision.sourceId,pack.sourceId);
  const placement=proposal.proposedSearchPlacement;assert.deepEqual(decision.searchPlacement,placement);assert.equal(placement.groupMode,'create');
  assert.equal(placement.domainId,'heating_hvac');assert.equal(placement.systemId,'hvac');assert.equal(placement.membershipOrdinal,0);
  assert(!groups.some((g:Json)=>g.group_id===placement.groupId));assert.equal(pack.catalogBinding,null);assert.equal(pack.publicationAllowed,false);
  const definition=castironRadiatorDefinitionR1(),completeness=castironRadiatorCompletenessMapR1();
  const bindingMap=castironRadiatorExpectedBindingApplicabilityR1(),boundIds=Object.keys(bindingMap),needs=pack.gaps.map(g=>rid('open:'+g.id));
  const controls=pack.materials.flatMap(m=>pack.balanceControlsPerMaterial.map(id=>rid(m.id+':'+id)));
  assertCastironRadiatorSourceAwareBindingMapR1(bindingMap);assert.equal(boundIds.length,30);assert.equal(controls.length,40);assert.equal(needs.length,8);
  assert.deepEqual(definition.resources.map(r=>r.row_id).sort(),[...boundIds,...controls,...needs].sort());
  // Eight internal effective-quantity slots are authored by the shared purchase-balance builder.
  assert.equal(definition.parameters.length,74);assert.equal(definition.formulas.length,78);assert.equal(completeness.entries.length,78);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  for(const id of boundIds){const resource=definition.resources.find(r=>r.row_id===id)!;assert.equal(bindingMap[id]!.exactColumn,resource.source_metadata?.exact_column,'SOURCE_COLUMN_MATCH:'+id);}
  const infoIds=[...pack.machines.map(m=>rid(m.id)),rid(pack.operators.id),rid(pack.radiatorSource.id)];
  for(const id of infoIds){const resource=definition.resources.find(r=>r.row_id===id)!;assert.equal(resource.resource_graph.costTreatment,'INFORMATIONAL_SCOPE');assert.equal(resource.procurement_eligible,false);}
  const included=[pack.scopeRu,'Только количественный PARTIAL-состав: два исходных цельных труда,4справочные машины,приборнаямощностьkW бездопускаSKU,8материальныхзаказов и их балансы.',
    'Подготовка04 — только подтверждённой требующей её подгруппыkW; обе131/325ммстроки сохранены,8конкретныхapplicationneeds остаются.'];
  const excluded=[...pack.excludedRu,'Не заменяются существующийстальнойпанельныйstandardv4,8pieceпрофилей, ихцены/сохранённыеревизии идвелегасигруппы.'];
  const catalogId=decision.catalogId;
  const core=(submittedParameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},priceItems:CanonicalEstimateCompileCoreInput['priceItems']=[])=>compileCanonicalEstimateCore({
    operation:'recalculate',catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:pack.primaryMeasureParameterId,
    parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,
    confirmedParameters:{},rowOverrides,priceItems,currencyCode:'KGS',maximumResourceRows:78,hashJson:async v=>estimateDeterministicHash(v)});
  const cfg:CastironRadiatorSourceAwareConfigR1={contract:pack.contract,stopCode:'CASTIRON_RADIATOR_01_04',applicationName:'castiron-radiator-krer18-install-prep',
    expectedBranch:"codex/r4-a5-clean-08b18902",masterPath:decision.master.path,masterSha256:decision.master.sha256,parentReleaseId:context.definitionReleaseId,parentSearchReleaseId:context.searchReleaseId,
    currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),outputRoot:resolve('.release-runtime/next-wave-castiron-radiator/publication'),
    sourcePaths:['scripts/estimate/r4a13/prepareCastironRadiatorInstallPrepKrer18AppendR1.ts','src/lib/estimate/v4/castironRadiatorKrer18R1.ts','src/lib/estimate/v4/castironRadiatorKrer18R1.test.ts',
      paths.sourcePackPath,paths.currentReadPath,paths.targetedReadPath,paths.collisionReadPath,paths.decisionPath,paths.proposalPath,paths.byteExactReceiptPath,
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionAppendGuardsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
      'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts','src/lib/estimate/backendPlatform/canonicalDerivedQuantityEditPolicyV1.ts',pack.source.path],
    catalogId,sourceId:pack.sourceId,normId:pack.normId,sourceMetadata:{source_title:pack.titleRu,source_authority:'Министерство строительства Кыргызской Республики',
      source_kind:'OFFICIAL_NORM_TWO_EXACT_COLUMNS_COMPOSITE',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,
      use_restriction:pack.scopeRu+' PARTIAL QUANTITY, бездопуска машинныхставок/приборногоSKU иполнойтехническойготовности.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    shortInput:{[pack.primaryMeasureParameterId]:100},acceptanceInput:castironRadiatorAppendAcceptanceInputR1(),runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
    expectedParentShape:[0,0,0],benchmarkOrdinal:0,validationScenario:'CASTIRON_RADIATOR_KW_INSTALL_PLUS_CONFIRMED_PREP_SUBSET_16_SOURCE_8_ORDERS_6_OPERATIONS_8_NEEDS',
    passport:{canonicalRuName:placement.groupNameRu,workKey:decision.identity.workKey,physicalResultRu:'Установка чугунных секционных радиаторов по проектной номинальной мощности; исходный расчёт01/условная04 не заменяет проектный выбор,приёмку и8незакрытыхзадач.',
      includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:completeness,unresolvedApplicableResourceRowIds:needs},
    applicability:{primaryMeasureParameterId:pack.primaryMeasureParameterId,preparationMeasureParameterId:pack.preparationParameterId,quantityScope:'PARTIAL',
      exactSourceColumns:['18-03-001-01','18-03-001-04'],sourceDenominatorKW:100,sourceAwareBindingRows:30,sourceControlRowsUnbound:40,applicationNeedsUnbound:8,
      paidMachineOwners:0,sourcePriceBindings:0,radiatorSkuPowerBridgeAdmitted:false,sourceMachinePricePublicationAllowed:false,
      fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,existingConsumersReplaced:false,globalAbsenceProven:false,
      capturedEvidenceContext:context,actualPublicationContextMustBeExplicitlyReconciled:true,capturedExactCollisionSha256:SHA.collision,rootDecisionSha256:SHA.decision},
    binding:{rowId:boundIds[0]!,additionalRowIds:boundIds.slice(1),applicability:{compositeSource:true,sourceAwareOptInRequired:true,
      knownBindings:30,derivedControlsNormativelyBound:false,applicationNeedsBound:false,machinePriceAdmission:false},applicabilityByRowId:bindingMap},
    locator:{key:'krer18-03-001-01-04-castiron-radiator-install-preparation-r1',payload:{sourceArtifactSha256:pack.source.sha256,
      sourceColumns:pack.normIds,sourceResources:{worker:pack.worker,operators:pack.operators,machines:pack.machines,radiator:pack.radiatorSource,materials:pack.materials},
      sourceAwareBindingByRowId:bindingMap,includedOperations:pack.operations,unboundControls:controls,unboundApplicationNeeds:pack.gaps,
      rootDecisionSha256:SHA.decision,fullTechnicalAcceptance:false,machinePriceAndDeviceSkuAdmission:false}},
    search:{primaryUom:'kW',canonicalNameRu:placement.groupNameRu,aliases:proposal.proposedSearch.aliases,shortScopeRu:proposal.proposedSearch.shortScopeRu,
      keyDistinguishingParameters:[pack.primaryMeasureParameterId,pack.preparationModeParameterId,pack.preparationParameterId,...pack.scopeFacts.map(f=>f.id)],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:excluded,
      extraSearchTermsRu:'чугунный секционный радиатор отопление установка номинальнаямощностькВт подготовкапонеобходимости',
      sourceProvenance:{sourcePack:packPath,currentReadSha256:SHA.current,targetedReadSha256:SHA.targeted,exactCollisionSha256:SHA.collision,rootDecisionSha256:SHA.decision,
        quantityScope:'PARTIAL',fullTechnicalAcceptance:false,machineAndDeviceSkuPricePending:true}},
    catalogAppend:{requireUniqueWorkKey:true,capturedSourcePreimage:{sourceKey:pack.sourceId,expected:null},
      identity:{namespace:'global',domain:'heating_hvac',sourceIdentity:decision.identity.sourceIdentity,workKey:decision.identity.workKey,titleRu:placement.groupNameRu,denominatorEligible:true},
      searchPlacement:{...placement,groupMode:'create',elementType:'WORK',operationKind:'NEW_INSTALLATION',
        groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',sourceSpecific:true,sourceColumns:'01_INSTALL_AND_04_CONFIRMED_PREP_SUBSET'},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,rootDecisionSha256:SHA.decision,fullTechnicalAcceptance:false},
        technologyVariant:'KRER18_03_001_01_CASTIRON_PLUS_CONDITIONAL_04_PREPARATION',normativeClassifiers:proposal.proposedSearch.normativeClassifiers,
        applicabilityTags:['INTERNAL_HEATING','CAST_IRON_SECTIONAL','NOMINAL_OUTPUT_KW','CONDITIONAL_PREPARATION_SUBSET','PARTIAL_QUANTITY','MACHINE_PRICE_SCOPE_PENDING','SKU_POWER_BRIDGE_PENDING'],
        publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
    forbiddenAdjacentMatchers:[/rc09:|professional_.*_set|(?:^|:)materials_0[1-9]/iu],owner:'ROOT_SINGLE_INTEGRATOR_PARTIAL_CASTIRON_RADIATOR',receiptFileStem:'castiron_radiator_01_04',
    verifyCore:async()=>{
      assert.equal(sha(readFileSync(resolve(pack.source.path))),pack.source.sha256,'OFFICIAL_KRER18_PDF_EXACT');assert(definition.parameters.every(p=>p.default_value===null));
      assert.deepEqual(definition.runtimeInput,{});assertCastironRadiatorSourceAwareBindingMapR1(cfg.binding.applicabilityByRowId);
      const locatorIds=['00000000-0000-4000-8000-000000000001'];
      const resolved=resolveMasterSingleDefinitionBindingApplicabilityByRowId(cfg,definition.resources,locatorIds);
      assert.deepEqual(resolved,bindingMap,'SHARED_PER_ROW_OPT_IN_DISPATCH_REQUIRED');
      const legacy={...cfg,binding:{rowId:cfg.binding.rowId,additionalRowIds:cfg.binding.additionalRowIds,applicability:{legacyFallback:true}}};
      const legacyResolved=resolveMasterSingleDefinitionBindingApplicabilityByRowId(legacy,definition.resources,locatorIds);
      assert.deepEqual(legacyResolved,Object.fromEntries(boundIds.map(id=>[id,{legacyFallback:true}])),'LEGACY_FALLBACK_UNCHANGED');
      const first=boundIds[0]!,missing=castironRadiatorExpectedBindingApplicabilityR1();delete missing[first];
      const structuralBad:[string,unknown,RegExp][]=[['NULL_MAP',null,/BINDING_APPLICABILITY_MAP_OBJECT_REQUIRED/],['ARRAY_MAP',[],/BINDING_APPLICABILITY_MAP_OBJECT_REQUIRED/],
        ['PRESENT_UNDEFINED',undefined,/BINDING_APPLICABILITY_MAP_OBJECT_REQUIRED/],['MISSING_ROW',missing,/BINDING_APPLICABILITY_MAP_EXACT_DECLARED_ROWS_REQUIRED/],
        ['EXTRA_CONTROL',{...bindingMap,[controls[0]!]:{exactColumn:'18-03-001-01'}},/BINDING_APPLICABILITY_MAP_EXACT_DECLARED_ROWS_REQUIRED/],
        ['NULL_ROW',{...bindingMap,[first]:null},/BINDING_APPLICABILITY_ROW_OBJECT_REQUIRED/],['ARRAY_ROW',{...bindingMap,[first]:[]},/BINDING_APPLICABILITY_ROW_OBJECT_REQUIRED/],
        ['EMPTY_ROW',{...bindingMap,[first]:{}},/BINDING_APPLICABILITY_ROW_OBJECT_REQUIRED/]];
      for(const [label,bad,expected] of structuralBad)assert.throws(()=>resolveMasterSingleDefinitionBindingApplicabilityByRowId(
        {...cfg,binding:{...cfg.binding,applicabilityByRowId:bad}} as unknown as CastironRadiatorSourceAwareConfigR1,definition.resources,locatorIds),expected,label);
      const semanticBad:[string,unknown][]=[['WRONG_COLUMN',{...bindingMap,[first]:{...bindingMap[first],exactColumn:'18-03-001-04'}}],
        ['WRONG_VOLUME',{...bindingMap,[first]:{...bindingMap[first],sourceVolumeParameterId:pack.preparationParameterId}}],
        ['COLLAPSED_COLUMN',{...bindingMap,[first]:{...bindingMap[first],exactColumn:pack.normId}}]];
      for(const [label,bad] of semanticBad)assert.throws(()=>assertCastironRadiatorSourceAwareBindingMapR1(bad),/CASTIRON_BINDING_ROW_EXACT_SOURCE_SCOPE/,label);
      const baseline=await core(castironRadiatorAppendAcceptanceInputR1());
      for(const [id,q] of [['install-worker','75.7'],['prep-worker','15'],['included-operators','2.72'],['truck-crane','0.14'],['mast-hoist','2.58'],
        ['electric-drill','0.21'],['flatbed-truck','3.34'],['radiator-capacity-consumed','100'],['calibrated-head-dowels-consumed','0.00632'],
        ['brackets-131-consumed','253'],['brackets-325-consumed','253'],['cement-mortar-m50-consumed','0.0505'],['paronite-gaskets-consumed','124'],['prep-water-consumed','0.324'],['linseed-oil-consumed','0.00164'],['radiator-plugs-consumed','3.2']])
        assert.equal(baseline.rows.find(r=>r.row_id===rid(id))?.quantity,q,'SOURCE_RATE:'+id);
      assert.equal(baseline.rows.length,54);assert.equal(baseline.preliminaryNeeds.length,8);assert.deepEqual(baseline.preliminaryNeeds.map(n=>n.row_id).sort(),needs.slice().sort());
      assert.equal(baseline.rows.filter(r=>r.included_in_estimate).length,10);assert(baseline.rows.every(r=>r.unit_price===null));
      const ready=castironRadiatorAppendAcceptanceInputR1();ready[pack.preparationModeParameterId]='FACTORY_READY_NO_PREPARATION';delete ready[pack.preparationParameterId];delete ready.preparation_method_reference;
      for(const material of pack.materials.filter(m=>m.branch==='PREPARATION'))for(const k of Object.keys(ready))if(k.startsWith(material.parameterPrefix+'_'))delete ready[k];
      const noPrep=await core(ready);assert(!noPrep.rows.some(r=>r.row_id===rid('prep-worker')));assert.equal(noPrep.rows.length,28);assert.equal(noPrep.preliminaryNeeds.length,8);
      const provenance={kind:'manual',reason:'VALIDATION_FIXTURE_ONLY savedmaterialorder'};
      const edited=await core(castironRadiatorAppendAcceptanceInputR1(25.5,10.2),{[rid('brackets-131')]:{quantity:'77',unitPrice:'77',titleRu:'VALIDATION_FIXTURE_ONLY bracket131',provenance},
        [rid('brackets-325')]:{includedInEstimate:false,includedInProcurement:false,provenance}});
      assert.equal(edited.rows.find(r=>r.row_id===rid('brackets-131'))?.amount,'5929');assert.equal(edited.rows.find(r=>r.row_id===rid('brackets-131-consumed'))?.quantity,'64.515');
      assert.equal(edited.rows.find(r=>r.row_id===rid('brackets-325'))?.included_in_estimate,false);
      for(const id of infoIds){
        const forced=await core(castironRadiatorAppendAcceptanceInputR1(),{[id]:{unitPrice:'77',includedInEstimate:true,includedInProcurement:true,provenance}});
        const row=forced.rows.find(r=>r.row_id===id)!;assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
        const resource=definition.resources.find(r=>r.row_id===id)!;
        const snapshot=await core(castironRadiatorAppendAcceptanceInputR1(),{},[{price_key:resource.cost_owner_id??id,unit_id:resource.unit_id,unit_price:'77',currency_code:'KGS',snapshot_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}]);
        assert.equal(snapshot.rows.find(r=>r.row_id===id)?.included_in_estimate,false);assert.equal(snapshot.preliminaryNeeds.length,8);
      }
      for(const id of needs){try{await core(castironRadiatorAppendAcceptanceInputR1(),{[id]:{quantity:'0',unitPrice:'77',provenance}});throw Error('APPLICATION_NEED_ZERO_WAS_ACCEPTED');}
        catch(e){assert.equal((e as {code?:string}).code,'ROW_AMENDMENT_INVALID');}}
      return {status:'PASS_PARTIAL_CASTIRON_RADIATOR_SOURCE_AWARE_CORE_ONLY',parameters:definition.parameters.length,formulas:definition.formulas.length,resources:78,sourcePhysical:16,materialOrders:8,derivedControlsUnbound:40,
        includedOperations:6,sourceAwareBindings:30,sourceColumns:{installation01:16,preparation04:14},sourcePriceBindings:0,applicationNeeds:8,
        machinePaidOwners:0,radiatorSkuPriceAdmitted:false,sourceAwareContractChecks:{positive:2,structuralNegative:8,semanticNegative:3},
        fullTechnicalAcceptance:false,newCompleteTypesAccepted:0,publicationPerformed:false};
    }};
  return cfg;
}
