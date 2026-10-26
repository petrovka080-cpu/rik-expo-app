import assert from 'node:assert/strict';
import path from 'node:path';
import {prepareRoofParapet004TechnicalCaptureInputR294,prepareRoofParapet004TechnicalWholeR294,
  type RoofParapet004TechnicalPreparationR294 as Preparation} from './prepareRoofParapet004TechnicalWholeR294';
import type {MasterCapturedScopedNormativeRegistryR1 as Formal} from './masterScopedNormativeRegistryPreimageR1';
import {verifyRoofParapet004TechnicalProductionCoreR1} from './roofParapet004TechnicalProductionVerifyR1';

/** Ordinary Config only. ROOT supplies the actual five-pin-bound Preparation,
 * genuine formal capture, real target callback and bounded raw recorder.
 * This module does not call the publisher, connect to DB or execute the core.
 */
export function prepareRoofParapet004TechnicalProductionR1(input:Readonly<
  Omit<Preparation,'verifyCore'>&{record:(name:string,value:unknown)=>void}
>,actual:Formal){
 assert.equal(typeof input.verifyTargetPrecondition,'function','REAL_REPEATED_TARGET_PRECONDITION_REQUIRED');
 assert.equal(typeof input.record,'function','ACTUAL_BOUNDED_RAW_RECORDER_REQUIRED');
 const preparation:Preparation={...input,
  sourcePaths:[...new Set([...input.sourcePaths,__filename,path.join(__dirname,'roofParapet004TechnicalProductionVerifyR1.ts')])],
  verifyCore:async()=>verifyRoofParapet004TechnicalProductionCoreR1({prepared,record:input.record})};
 const prepared=prepareRoofParapet004TechnicalCaptureInputR294(preparation);
 const config=prepareRoofParapet004TechnicalWholeR294(preparation,actual);
 assert.equal(config.catalogAppend,undefined,'SAME_EXISTING_OWNER_NO_NEW_CARD');
 assert.equal(config.catalogId,'canonical-work:base:roofing_interior_parapet_seal_technical_room');
 assert.equal(config.verifyTargetPrecondition,input.verifyTargetPrecondition);
 assert.equal(config.resourceDefinitions.length,111);
 return config;
}
