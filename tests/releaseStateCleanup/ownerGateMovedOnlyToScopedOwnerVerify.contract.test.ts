import {
  OWNER_LIVE_QUALITY_GATE_NAME,
  ownerGateGloballyOptional,
  ownerGateMovedToScopedOwnerVerify,
} from "../../scripts/release/releaseTargetScope";
import { REQUIRED_RELEASE_GATES, SCOPED_OWNER_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

it("moves owner proof only into scoped owner verify without making it globally optional", () => {
  expect(REQUIRED_RELEASE_GATES.map((gate) => gate.name)).not.toContain(OWNER_LIVE_QUALITY_GATE_NAME);
  expect(SCOPED_OWNER_RELEASE_GATES.map((gate) => gate.name)).toContain(OWNER_LIVE_QUALITY_GATE_NAME);
  expect(ownerGateMovedToScopedOwnerVerify()).toBe(true);
  expect(ownerGateGloballyOptional()).toBe(false);
});
