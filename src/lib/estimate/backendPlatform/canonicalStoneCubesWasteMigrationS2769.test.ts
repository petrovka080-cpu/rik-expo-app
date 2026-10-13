import parents from '../../../../data/estimate-benchmarks/fixtures/stone-cubes-four-v5-parents-s27-69.json';
import {buildStoneCubesWasteSuccessorS2769} from '../v4/stoneCubesWasteScopeS2769';
import {buildStoneCubesWasteMigrationProofS2769 as build,admitStoneCubesWasteMigrationProofS2769 as admit} from './canonicalStoneCubesWasteMigrationS2769';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const reps=parents.reps as unknown as PurchaseGroupRepresentative[];
const input=(index:number)=>{const from=reps[index]!,to=buildStoneCubesWasteSuccessorS2769(from);return{from,to,
 fromDefinition:{id:String(from.definition.id),catalogId:String(from.definition.catalog_id),sha256:String(from.definition.definition_sha256)},
 toDefinition:{id:'11bdb743-50c7-571b-85e2-20bb4cc22779',catalogId:String(from.definition.catalog_id),sha256:'a'.repeat(64)}};};
test.each([0,1,2,3])('only the exact finite predecessor and full executable successor qualify: %s',index=>{
 const i=input(index),proof=build(i);expect(admit({...i,proof})?.normalizedTo).toBe(i.from);
 expect(admit({...i,proof:{...proof,fromDefinitionId:'00000000-0000-5000-8000-000000000000'}})).toBeNull();
});
test('rehashed forged quantities, metadata, conditions, owner and default are rejected',()=>{
 for(const corrupt of [
  (i:ReturnType<typeof input>)=>{i.to.formulas[0]!.expression_source='floor_covering_area_m2*2';},
  (i:ReturnType<typeof input>)=>{i.to.resources[1]!.cost_owner_id='forged-owner';},
  (i:ReturnType<typeof input>)=>{i.to.resources[2]!.inclusion_ast={kind:'literal',value:false};},
  (i:ReturnType<typeof input>)=>{i.to.parameters.at(-1)!.default_value='automatic-secret-fact';},
  (i:ReturnType<typeof input>)=>{i.to.parameters[0]!.truth_metadata.derived_exact_lookup_v1={inputs:['area'],rows:[{quantity:1}]};},
 ]){const i=input(0);corrupt(i);expect(admit({...i,proof:build(i)})).toBeNull();}
});
test('source pack and frozen parent metadata are immutable admission evidence',()=>{
 const i=input(0),proof=build(i);expect(admit({...i,proof:{...proof,sourcePackSha256:'0'.repeat(64)}})).toBeNull();
 const corrupted={...i,from:structuredClone(i.from)};corrupted.from.parameters[0]!.truth_metadata.derived_exact_lookup_v1={malicious:true};
 expect(admit({...corrupted,proof:build(corrupted)})).toBeNull();
});
