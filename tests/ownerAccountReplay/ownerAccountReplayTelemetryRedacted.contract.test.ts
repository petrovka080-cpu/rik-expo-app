import { redactOwnerAccountReplayIdentity } from "../../src/lib/ai/productionCanary";
import { ownerReplayIdentity } from "./ownerAccountReplayTestHelpers";

test("owner account replay telemetry identity is redacted", () => {
  const redacted = redactOwnerAccountReplayIdentity(ownerReplayIdentity());
  const serialized = JSON.stringify(redacted);

  expect(redacted.owner_account_identity_redacted).toBe(true);
  expect(redacted.raw_email_stored).toBe(false);
  expect(redacted.raw_phone_stored).toBe(false);
  expect(serialized).not.toMatch(/@/);
  expect(serialized).not.toMatch(/\+?\d[\d\s().-]{8,}\d/);
});
