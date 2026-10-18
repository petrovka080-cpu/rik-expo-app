import {prepareStairsDokaStandardFullRetainedMasterR3 as prepare} from './prepareStairsDokaStandardFullRetainedMasterR3';

it('binds the existing stair definition to actual accepted ELECOR parent while retaining legacy defaults and requiring common locked checks',async()=>{
 const c=prepare({sourceHead:'c124a69eba49cfaf7319f07be6569d77e5d95faa',sourceTree:'b7644af001e4c0752e7a9b9e6d7193ac22fdad44',evidenceSha256:'0'.repeat(64)});
 expect(c.parentReleaseId).toBe('d3bc6c1a-e16d-5fcc-b36c-cc584a31c529');
 expect(c.parentSearchReleaseId).toBe('c97fa9c9-338e-5c6a-8ce5-216deaa73176');
 expect(c.catalogAppend).toBeUndefined();expect(c.runtimeProfileInput).not.toHaveProperty('stairs_quantity_source_variant');
 expect(c.binding.retainParentBindings?.capturedParent.bindings).toHaveLength(8);
 expect(c.binding.additionalRowIds!.length+1).toBe(20);
 await expect(c.verifyCore()).resolves.toMatchObject({definitionShape:[301,137,140],actualNextElecorParentAccepted:true,
  normalAndLockedFullRetentionStillRequired:true,expectedFinalBindings:28,publicationPerformed:false});
});
