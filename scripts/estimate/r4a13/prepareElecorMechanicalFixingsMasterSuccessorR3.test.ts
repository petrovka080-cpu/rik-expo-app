import {prepareElecorMechanicalFixingsMasterSuccessorR3 as prepare} from './prepareElecorMechanicalFixingsMasterSuccessorR3';

it('uses the existing Master publisher configuration for the actual22/26/26 ELECOR predecessor and exact18+2 bindings',async()=>{
 const cfg=prepare({sourceHead:'7c8ab0347620ad2174c73df0deb331aa842631f7',sourceTree:'818a0591b062b95c61e4c7cced8f5c3a21124334',evidenceSha256:'0'.repeat(64)});
 expect(cfg.catalogAppend).toBeUndefined();expect(cfg.expectedParentShape).toEqual([22,26,26]);
 expect(cfg.parameterDefinitions).toHaveLength(39);expect(cfg.resourceDefinitions).toHaveLength(32);
 expect(cfg.binding.retainParentBindings?.capturedParent.bindings).toHaveLength(18);
 expect(cfg.binding.retainParentBindings?.capturedParent.formulas).toHaveLength(26);
 expect(cfg.binding.additionalRowIds).toHaveLength(1);
 expect(await cfg.verifyCore()).toMatchObject({status:'PASS_PARTIAL_ELECOR_FIXINGS_MASTER_CONFIG_AND_RETAINED_SOURCE_CORE_ONLY',
  bindings:20,oldBindingsPreserved:18,newBindings:2,activeMechanicalNeeds:7,newCatalogs:0,newCompleteTypes:0,fullTechnicalAcceptance:false});
});
