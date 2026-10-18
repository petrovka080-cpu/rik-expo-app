import {prepareHydrotestInternalSteelDn50Column01AppendR1} from './prepareHydrotestInternalSteelDn50Column01AppendR1';

it('constructs from actual pinned classification and checks the common compiler without granting a machine payment owner',async()=>{
 const config=prepareHydrotestInternalSteelDn50Column01AppendR1();
 expect(config.parentReleaseId).toBe('aca4fa71-60c2-57db-83c8-5c8be93175a7');
 expect(config.parentSearchReleaseId).toBe('0c4a0ed7-a579-57ae-9104-4e088dd09963');
 expect(config.resourceDefinitions).toHaveLength(44);
 expect([config.binding.rowId,...config.binding.additionalRowIds!]).toHaveLength(18);
 await expect(config.verifyCore()).resolves.toMatchObject({status:'PASS_PARTIAL_STEEL_HYDROTEST_QUANTITY_CORE_ONLY',
  sourcePhysical:6,materialOrders:4,includedOperations:8,applicationNeeds:6,machinePaidOwners:0,
  sourcePriceBindings:0,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0});
});
