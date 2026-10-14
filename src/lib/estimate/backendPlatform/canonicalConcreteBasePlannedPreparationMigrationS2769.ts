import {buildConcreteBasePlannedPreparationS2769} from '../v4/concreteBasePlannedPreparationS2769';
import binding from '../../../../data/estimate-benchmarks/source-packs/concrete-base-planned-preparation-two-s27-69.json';
import {createExactConditionalSuccessorMigrationV1} from './canonicalExactConditionalSuccessorMigrationV1';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
const parents=require('../../../../data/estimate-benchmarks/fixtures/concrete-base-two-parents-s27-69.json') as {models:PurchaseGroupRepresentative[]};
const migration=createExactConditionalSuccessorMigrationV1({contractVersion:'canonical-concrete-base-planned-preparation-migration/v1',binding,frozenParents:parents.models,buildExpected:buildConcreteBasePlannedPreparationS2769});
export const buildConcreteBasePlannedPreparationMigrationProofS2769=migration.buildProof;
export const admitConcreteBasePlannedPreparationMigrationProofS2769=migration.admit;
