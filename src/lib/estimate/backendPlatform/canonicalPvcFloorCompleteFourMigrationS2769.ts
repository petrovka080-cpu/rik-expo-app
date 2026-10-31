import {buildPvcFloorCompleteFourS2769,pvcFloorCompleteHistoricalBindingSha256S2769} from '../v4/pvcFloorCompleteFourS2769';
import binding from '../../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import historicalBinding from '../../../../data/estimate-benchmarks/fixtures/pvc-floor-complete-binding-historical-four-s27-69.json';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {createExactConditionalSuccessorMigrationV1} from './canonicalExactConditionalSuccessorMigrationV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../../data/estimate-benchmarks/fixtures/pvc-floor-four-parents-s27-69.json') as {models:PurchaseGroupRepresentative[]};
const historicalSha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson(historicalBinding));
if(historicalSha256!==pvcFloorCompleteHistoricalBindingSha256S2769)throw Error('PINNED_HISTORICAL_BINDING_DRIFT');
const active=createExactConditionalSuccessorMigrationV1({contractVersion:'canonical-pvc-floor-complete-four-migration/v1',binding,frozenParents:parents.models,buildExpected:buildPvcFloorCompleteFourS2769});
const historical=createExactConditionalSuccessorMigrationV1({contractVersion:'canonical-pvc-floor-complete-four-migration/v1',binding:historicalBinding,frozenParents:parents.models,buildExpected:parent=>buildPvcFloorCompleteFourS2769(parent,{binding:historicalBinding,sourcePackSha256:historicalSha256})});
const activeSha256=canonicalEstimateSha256HexText(canonicalEstimateStableJson(binding));
export const buildPvcFloorCompleteFourMigrationProofS2769=active.buildProof;
export function admitPvcFloorCompleteFourMigrationProofS2769(input:Parameters<typeof active.admit>[0]){
 const value=(input.proof as {sourcePackSha256?:unknown}|null)?.sourcePackSha256;
 if(value===activeSha256)return active.admit(input);
 if(value===historicalSha256)return historical.admit(input);
 return null;
}
