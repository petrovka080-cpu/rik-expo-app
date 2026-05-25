import fs from "node:fs";
import path from "node:path";
import { runRequestEstimateCatalogBoqLiveReleaseGate } from "../../scripts/release/runRequestEstimateCatalogBoqLiveReleaseGate";

const savePath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_save_payloads.json");
const sendPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_send_payloads.json");
const parityPath = path.resolve(process.cwd(), "artifacts/S_REQUEST_ESTIMATE_CATALOG_BOQ_RELEASE_payload_parity.json");

describe("request estimate release gate requires save/send payload parity", () => {
  beforeAll(async () => {
    if (!fs.existsSync(savePath) || !fs.existsSync(sendPath) || !fs.existsSync(parityPath)) {
      await runRequestEstimateCatalogBoqLiveReleaseGate();
    }
  });

  it("requires edited/catalog rows to survive save and send payloads", () => {
    expect(fs.existsSync(savePath)).toBe(true);
    expect(fs.existsSync(sendPath)).toBe(true);
    expect(fs.existsSync(parityPath)).toBe(true);
    const save = JSON.parse(fs.readFileSync(savePath, "utf8")) as Record<string, unknown>;
    const send = JSON.parse(fs.readFileSync(sendPath, "utf8")) as Record<string, unknown>;
    const parity = JSON.parse(fs.readFileSync(parityPath, "utf8")) as Record<string, unknown>;
    expect(save.parity_passed).toBe(true);
    expect(send.parity_passed).toBe(true);
    expect(send.marketplace_status).toBe("sent");
    expect(parity.save_payload_parity_passed).toBe(true);
    expect(parity.send_payload_parity_passed).toBe(true);
    expect(parity.no_lost_rows).toBe(true);
    expect(parity.fake_green_claimed).toBe(false);
  });
});
