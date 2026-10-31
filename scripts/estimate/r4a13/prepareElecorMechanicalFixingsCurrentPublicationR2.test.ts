import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import fixture from '../../../data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
import {prepareElecorMechanicalFixingsCurrentPublicationR2} from './prepareElecorMechanicalFixingsCurrentPublicationR2';

it('compiles the actual captured ELECOR parent with exact retained sources and a separate project fixing owner',async()=>{
 const path='data/estimate-benchmarks/fixtures/elecor-root-completion-decision-r1.json';
 const candidate=prepareElecorMechanicalFixingsCurrentPublicationR2(fixture.parent as unknown as PurchaseGroupRepresentative,fixture.context,{
  releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'b63eba214eb0ad0ea43ac43b0ddc4ebfbe88c90a',
  sourceTree:'f00b8573f65552ab43f236ce9022bef657e21ead',
  masterSha256:'dfbb757a1562962636259c1c4cffd9127d15882b00cdd49baa8fcd4831bcacf2',
  evidenceSha256:'0'.repeat(64),rootDecisionPin:{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')},
 });
 expect(await candidate.verifyCore()).toMatchObject({
  status:'PURE_ACTUAL_PARENT_FACTORY_AND_SHARED_COMPILER_CHECKS_COMPLETED_NOT_DB_ACCEPTANCE',
  shape:[39,32,32],bindings:20,oldBindingsPreserved:18,newBindings:2,staticNeeds:8,activeMechanicalNeeds:7,
  priceBindings:0,noOldUnknownNormPriceOrQuantityCarry:true,legacyManualNeedCases:3,forbiddenActiveLegacyProcurementCases:3,unresolvedNormInputRejections:3,fullTechnicalAcceptance:false,
 });
 expect(candidate.publicationReady).toBe(false);
 expect(candidate.runtimeAccepted).toBe(false);
});
