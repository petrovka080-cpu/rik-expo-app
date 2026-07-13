import { professionalSnapshots } from "./professionalEstimateTestHelpers";

describe("professional estimate UI PDF request history parity", () => {
  it("uses identical hashes across presentation surfaces", () => {
    for (const snapshot of professionalSnapshots()) {
      expect(snapshot.ui_payload_hash).toBe(snapshot.pdf_payload_hash);
      expect(snapshot.ui_payload_hash).toBe(snapshot.request_payload_hash);
      expect(snapshot.ui_payload_hash).toBe(snapshot.history_payload_hash);
      expect(snapshot.all_hashes_match).toBe(true);
    }
  });
});
