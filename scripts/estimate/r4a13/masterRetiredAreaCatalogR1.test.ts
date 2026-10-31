/** @jest-environment node */
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
describe('retired catalogue area variants',()=>{
 test.each(['small','medium','large'])('rejects %s area publication before database or source access',async size=>{
  const minimal={catalogId:`canonical-work:base:wall_plaster_${size}_area`} as MasterSingleDefinitionSuccessorConfig;
  await expect(runMasterSingleDefinitionSuccessorR1(minimal)).rejects.toThrow('CANONICAL_AREA_CATALOG_VARIANT_RETIRED');
 });
});
