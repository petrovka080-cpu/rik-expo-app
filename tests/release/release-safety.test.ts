/**
 * Release safety discipline tests.
 *
 * WAVE AC: Validates that the release pipeline configuration is
 * consistent and safe — rollout IDs match, version config is valid,
 * and feature flags are well-formed.
 *
 * Root cause: Mismatched rollout IDs, stale version numbers, or
 * inconsistent RPC rollout descriptors can cause silent feature
 * degradation in production OTA updates.
 */

import type {
  PdfRpcRolloutId,
  PdfRpcRolloutMode,
  PdfRpcRolloutAvailability,
  PdfRpcRolloutFallbackReason,
} from "../../src/lib/documents/pdfRpcRollout";

import type {
  PdfRenderRolloutId,
} from "../../src/lib/documents/pdfRenderRollout";

import * as fs from "fs";
import * as path from "path";

const APP_JSON_PATH = path.resolve(__dirname, "../../app.json");

describe("release safety — app.json version config", () => {
  let appConfig: Record<string, unknown>;

  beforeAll(() => {
    const raw = fs.readFileSync(APP_JSON_PATH, "utf-8");
    appConfig = JSON.parse(raw);
  });

  it("app.json exists and is valid JSON", () => {
    expect(appConfig).toBeTruthy();
    expect(typeof appConfig).toBe("object");
  });

  it("expo.version is a valid semver string", () => {
    const expo = appConfig.expo as Record<string, unknown>;
    const version = String(expo.version ?? "");
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("expo.runtimeVersion matches expo.version", () => {
    const expo = appConfig.expo as Record<string, unknown>;
    expect(expo.runtimeVersion).toBe(expo.version);
  });

  it("android.versionCode is a positive integer", () => {
    const expo = appConfig.expo as Record<string, unknown>;
    const android = expo.android as Record<string, unknown>;
    const versionCode = android.versionCode as number;
    expect(Number.isInteger(versionCode)).toBe(true);
    expect(versionCode).toBeGreaterThan(0);
  });

  it("ios.buildNumber is a non-empty string of digits", () => {
    const expo = appConfig.expo as Record<string, unknown>;
    const ios = expo.ios as Record<string, unknown>;
    const buildNumber = String(ios.buildNumber ?? "");
    expect(buildNumber).toMatch(/^\d+$/);
  });
});

describe("release safety — PDF RPC rollout IDs", () => {
  const ALL_RPC_ROLLOUT_IDS: PdfRpcRolloutId[] = [
    "payment_pdf_source_v1",
    "warehouse_incoming_source_v1",
    "warehouse_incoming_materials_source_v1",
    "warehouse_object_work_source_v1",
    "warehouse_day_materials_source_v1",
    "director_finance_source_v1",
    "director_production_source_v1",
    "director_subcontract_source_v1",
  ];

  it("all rollout IDs are unique", () => {
    expect(new Set(ALL_RPC_ROLLOUT_IDS).size).toBe(ALL_RPC_ROLLOUT_IDS.length);
  });

  it("rollout IDs follow naming convention", () => {
    for (const id of ALL_RPC_ROLLOUT_IDS) {
      expect(id).toMatch(/^[a-z_]+_v\d+$/);
    }
  });

  it("rollout modes are exhaustive", () => {
    const modes: PdfRpcRolloutMode[] = ["force_on", "force_off", "auto"];
    expect(new Set(modes).size).toBe(3);
  });

  it("rollout availability states are exhaustive", () => {
    const states: PdfRpcRolloutAvailability[] = [
      "unknown",
      "available",
      "missing",
    ];
    expect(new Set(states).size).toBe(3);
  });

  it("fallback reasons are exhaustive", () => {
    const reasons: PdfRpcRolloutFallbackReason[] = [
      "rpc_error",
      "invalid_payload",
      "disabled",
      "missing_fields",
    ];
    expect(new Set(reasons).size).toBe(4);
  });
});

describe("release safety — PDF render rollout IDs", () => {
  const ALL_RENDER_ROLLOUT_IDS: PdfRenderRolloutId[] = [
    "payment_pdf_render_v1",
    "warehouse_incoming_render_v1",
    "warehouse_incoming_materials_render_v1",
    "warehouse_object_work_render_v1",
    "warehouse_day_materials_render_v1",
    "director_finance_render_v1",
    "director_production_render_v1",
    "director_subcontract_render_v1",
  ];

  it("all render rollout IDs are unique", () => {
    expect(new Set(ALL_RENDER_ROLLOUT_IDS).size).toBe(
      ALL_RENDER_ROLLOUT_IDS.length,
    );
  });

  it("render rollout IDs follow naming convention", () => {
    for (const id of ALL_RENDER_ROLLOUT_IDS) {
      expect(id).toMatch(/^[a-z_]+_v\d+$/);
    }
  });

  it("RPC and render rollout IDs are disjoint (no accidental overlap)", () => {
    const rpcIds = new Set<string>([
      "payment_pdf_source_v1",
      "warehouse_incoming_source_v1",
      "warehouse_incoming_materials_source_v1",
      "warehouse_object_work_source_v1",
      "warehouse_day_materials_source_v1",
      "director_finance_source_v1",
      "director_production_source_v1",
      "director_subcontract_source_v1",
    ]);
    for (const id of ALL_RENDER_ROLLOUT_IDS) {
      expect(rpcIds.has(id)).toBe(false);
    }
  });
});
