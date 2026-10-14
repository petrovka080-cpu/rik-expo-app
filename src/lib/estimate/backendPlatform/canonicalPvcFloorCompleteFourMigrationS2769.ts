import {buildPvcFloorCompleteFourS2769} from '../v4/pvcFloorCompleteFourS2769';
import binding from '../../../../data/estimate-benchmarks/source-packs/pvc-floor-complete-four-s27-69.json';
import {createExactConditionalSuccessorMigrationV1} from './canonicalExactConditionalSuccessorMigrationV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../../data/estimate-benchmarks/fixtures/pvc-floor-four-parents-s27-69.json') as {models:PurchaseGroupRepresentative[]};
const migration=createExactConditionalSuccessorMigrationV1({contractVersion:'canonical-pvc-floor-complete-four-migration/v1',binding,frozenParents:parents.models,buildExpected:buildPvcFloorCompleteFourS2769});
export const buildPvcFloorCompleteFourMigrationProofS2769=migration.buildProof;
export const admitPvcFloorCompleteFourMigrationProofS2769=migration.admit;
