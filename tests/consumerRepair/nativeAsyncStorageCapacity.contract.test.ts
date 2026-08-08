import fs from "node:fs";
import path from "node:path";

import { ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES } from "../../src/lib/platform/estimateRevisionDurableStore";

describe("native consumer estimate AsyncStorage capacity", () => {
  it("keeps aggregate Android storage above the immutable-envelope contract", () => {
    const gradleProperties = fs.readFileSync(
      path.resolve(process.cwd(), "android/gradle.properties"),
      "utf8",
    );
    const configured = gradleProperties.match(
      /^AsyncStorage_db_size_in_MB=(\d+)$/m,
    );
    expect(configured).not.toBeNull();

    const databaseCapacityBytes = Number(configured?.[1]) * 1024 * 1024;
    const maximumEnvelopeBytes =
      ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage;

    expect(databaseCapacityBytes).toBeGreaterThanOrEqual(
      maximumEnvelopeBytes * 4,
    );
    expect(databaseCapacityBytes).toBeGreaterThan(6 * 1024 * 1024);
  });
});
