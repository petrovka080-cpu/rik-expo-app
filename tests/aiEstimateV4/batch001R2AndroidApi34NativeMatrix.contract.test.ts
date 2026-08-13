import fs from "fs";
import path from "path";

import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";

type NativeEvidence = {
  androidApi: number;
  packageName: string;
  activity: string;
  nativeAppFocused: boolean;
  webViewSubstitute: boolean;
  metroProcessPreserved: boolean;
  routeMarker: string;
  greenCount: number;
  expectedCount: number;
  entries: Array<{ catalogId: string; titleRu: string; missingParameterCount: number; green: boolean }>;
};

describe("BATCH001 R2 native Android API 34 matrix", () => {
  test("binds exact catalog identity and its individual parameter surface for 16/16 in the native app", () => {
    const evidencePath = path.resolve(
      __dirname,
      "../../.release-runtime/master-11610-group-batches-r2/06-batch001-r2-execution/ANDROID_API34_NATIVE_MATRIX.json",
    );
    const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as NativeEvidence;
    expect(evidence).toMatchObject({
      androidApi: 34,
      packageName: "com.azisbek_dzhantaev.rikexpoapp",
      activity: "com.azisbek_dzhantaev.rikexpoapp.MainActivity",
      nativeAppFocused: true,
      webViewSubstitute: false,
      metroProcessPreserved: true,
      routeMarker: "ROUTE_PROOF_REQUEST_ROUTE_READY",
      greenCount: 16,
      expectedCount: 16,
    });
    expect(evidence.entries.map((entry) => entry.catalogId)).toEqual(
      DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
    );
    for (const entry of evidence.entries) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === entry.catalogId);
      expect(inventory).toBeDefined();
      expect(entry.titleRu).toBe(inventory!.localized_name_ru);
      expect(entry.missingParameterCount).toBeGreaterThan(0);
      expect(entry.green).toBe(true);
    }
    expect(new Set(evidence.entries.map((entry) => entry.missingParameterCount)).size).toBeGreaterThan(5);
  });
});
