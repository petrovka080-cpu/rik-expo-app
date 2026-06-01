import {
  OWNER_LIVE_QUALITY_GATE_NAME,
  ownerGateDeleted,
} from "../../scripts/release/releaseTargetScope";
import { SCOPED_OWNER_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";

it("keeps owner live-quality proof registered in scoped release safety", () => {
  expect(ownerGateDeleted()).toBe(false);
  expect(SCOPED_OWNER_RELEASE_GATES.map((gate) => gate.name)).toContain(OWNER_LIVE_QUALITY_GATE_NAME);
});
