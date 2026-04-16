import {
  allSettledWithConcurrencyLimit,
  mapWithConcurrencyLimit,
} from "./mapWithConcurrencyLimit";

const delay = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("mapWithConcurrencyLimit", () => {
  it("caps active workers while preserving result order", async () => {
    let active = 0;
    let maxActive = 0;
    const input = Array.from({ length: 100 }, (_, index) => index);

    const result = await mapWithConcurrencyLimit(input, 5, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay();
      active -= 1;
      return item * 2;
    });

    expect(maxActive).toBeLessThanOrEqual(5);
    expect(result).toEqual(input.map((item) => item * 2));
  });

  it("handles large batches without increasing active concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const input = Array.from({ length: 500 }, (_, index) => index);

    const result = await mapWithConcurrencyLimit(input, 7, async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (item % 17 === 0) await delay();
      active -= 1;
      return item;
    });

    expect(maxActive).toBeLessThanOrEqual(7);
    expect(result).toHaveLength(500);
    expect(result[499]).toBe(499);
  });

  it("rejects when a worker fails and does not silently succeed", async () => {
    await expect(
      mapWithConcurrencyLimit([1, 2, 3], 2, async (item) => {
        if (item === 2) throw new Error("boom");
        return item;
      }),
    ).rejects.toThrow("boom");
  });

  it("settles every task when partial failures are expected", async () => {
    const result = await allSettledWithConcurrencyLimit([1, 2, 3, 4], 2, async (item) => {
      await delay();
      if (item % 2 === 0) throw new Error(`failed ${item}`);
      return item * 10;
    });

    expect(result.map((entry) => entry.status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
      "rejected",
    ]);
    expect(result[0]).toEqual({ status: "fulfilled", value: 10 });
  });

  it("rejects invalid limits", async () => {
    await expect(mapWithConcurrencyLimit([1], 0, async (item) => item)).rejects.toThrow(
      "positive number",
    );
  });
});
