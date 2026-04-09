/* eslint-disable import/first */
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

import { getPlatformObservabilityEvents, resetPlatformObservabilityEvents } from "./observability/platformObservability";
import { loadRecents, pushRecent, toggleFav } from "./localCache";

describe("localCache", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    resetPlatformObservabilityEvents();
  });

  it("returns fallback and records degraded observability on read failure", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("storage read exploded"));

    await expect(loadRecents()).resolves.toEqual([]);
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "local_cache" &&
          event.event === "local_cache_read_failed" &&
          event.result === "error" &&
          event.fallbackUsed === true,
      ),
    ).toBe(true);
  });

  it("keeps toggleFav valid and records degraded observability on write failure", async () => {
    mockGetItem.mockResolvedValueOnce("[]");
    mockSetItem.mockRejectedValueOnce(new Error("storage write exploded"));

    await expect(
      toggleFav({
        ref_table: "rik_materials",
        ref_id: "mat-1",
        name: "Cement",
        unit_id: "kg",
      }),
    ).resolves.toEqual({
      favs: [
        expect.objectContaining({
          ref_table: "rik_materials",
          ref_id: "mat-1",
          name: "Cement",
          unit_id: "kg",
        }),
      ],
      on: true,
    });
    expect(
      getPlatformObservabilityEvents().some(
        (event) =>
          event.surface === "local_cache" &&
          event.event === "local_cache_write_failed" &&
          event.result === "error" &&
          event.fallbackUsed === true,
      ),
    ).toBe(true);
  });

  it("preserves valid read/write semantics when storage succeeds", async () => {
    mockGetItem.mockResolvedValueOnce("[]");
    mockSetItem.mockResolvedValueOnce(undefined);

    await expect(
      pushRecent({
        ref_table: "rik_works",
        ref_id: "work-1",
        name: "Foundation",
        unit_id: null,
      }),
    ).resolves.toBeUndefined();
    expect(mockSetItem).toHaveBeenCalledWith(
      "foreman.recents.v1",
      expect.stringContaining("\"ref_id\":\"work-1\""),
    );
    await expect(loadRecents()).resolves.toEqual([]);
  });
});
