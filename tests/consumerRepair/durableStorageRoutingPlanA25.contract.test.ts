import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import {
  CONSUMER_REPAIR_TRANSACTIONAL_CANONICAL_LENGTH_METRIC,
  CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
  CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD,
  buildConsumerRepairDurableStorageRoutingPlan,
  isLargeConsumerRepairRevisionBundle,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";

function bundleWithProblemText(problemText: string): ConsumerRepairDraftBundle {
  return {
    draft: {
      id: "a25-routing-contract",
      consumerUserId: "a25-owner",
      status: "draft",
      title: "A25 routing contract",
      problemText,
      repairType: "flooring",
      createdAt: "2026-08-24T00:00:00.000Z",
      updatedAt: "2026-08-24T00:00:00.000Z",
    },
    items: [{
      id: "a25-row-1",
      requestDraftId: "a25-routing-contract",
      itemType: "work",
      titleRu: "Работа",
      quantity: 1,
      unit: "шт",
      unitPrice: 1,
      totalPrice: 1,
      currency: "KGS",
      source: "ai",
      createdAt: "2026-08-24T00:00:00.000Z",
    }],
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      requestDraftId: "a25-routing-contract",
      publishedRequestId: null,
      linkedAt: null,
    },
    events: [],
  } as unknown as ConsumerRepairDraftBundle;
}

function bundleAtCanonicalLength(target: number): ConsumerRepairDraftBundle {
  const base = bundleWithProblemText("");
  const baseLength = buildConsumerRepairDurableStorageRoutingPlan(base).canonicalLength;
  if (baseLength == null || baseLength > target) {
    throw new Error("A25_ROUTING_FIXTURE_TARGET_TOO_SMALL");
  }
  const bundle = bundleWithProblemText("x".repeat(target - baseLength));
  const actual = buildConsumerRepairDurableStorageRoutingPlan(bundle).canonicalLength;
  if (actual !== target) {
    throw new Error(`A25_ROUTING_FIXTURE_LENGTH_MISMATCH:${actual}:${target}`);
  }
  return bundle;
}

describe("A25 durable Web storage routing plan", () => {
  test.each([
    [CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD - 1, "LOCAL_STORAGE_V3", false],
    [CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD, "TRANSACTIONAL_DURABLE_STORE", true],
    [CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD + 1, "TRANSACTIONAL_DURABLE_STORE", true],
  ] as const)("seals exact canonical boundary %i", (length, route, large) => {
    const bundle = bundleAtCanonicalLength(length);
    const plan = buildConsumerRepairDurableStorageRoutingPlan(bundle);

    expect(plan).toMatchObject({
      route,
      canonicalLengthMetric: CONSUMER_REPAIR_TRANSACTIONAL_CANONICAL_LENGTH_METRIC,
      canonicalLength: length,
      serializedThreshold: CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD,
      serializedThresholdOperator: "GTE",
    });
    expect(isLargeConsumerRepairRevisionBundle(bundle)).toBe(large);
  });

  test("routes the sealed row preflight without waiting for a quota exception", () => {
    const base = bundleWithProblemText("row preflight");
    const bundle = {
      ...base,
      items: Array.from(
        { length: CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD },
        (_, index) => ({ ...base.items[0]!, id: `a25-row-${index + 1}` }),
      ),
    };
    expect(buildConsumerRepairDurableStorageRoutingPlan(bundle)).toMatchObject({
      route: "TRANSACTIONAL_DURABLE_STORE",
      reason: "ROW_THRESHOLD_GTE",
      rowCount: CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
      rowThresholdOperator: "GTE",
    });
  });

  test("documents UTF-16 code units and reports UTF-8 bytes separately", () => {
    const ascii = buildConsumerRepairDurableStorageRoutingPlan(bundleWithProblemText("a".repeat(32)));
    const unicode = buildConsumerRepairDurableStorageRoutingPlan(bundleWithProblemText("🙂".repeat(16)));

    expect(unicode.canonicalLengthMetric).toBe("JSON_UTF16_CODE_UNITS");
    expect(unicode.canonicalLength).toBe(ascii.canonicalLength);
    expect(unicode.canonicalUtf8Bytes).toBeGreaterThan(ascii.canonicalUtf8Bytes ?? 0);
    expect(unicode.route).toBe(ascii.route);
  });

  test("fails closed when the canonical record cannot be serialized", () => {
    const malformed = bundleWithProblemText("serialization must fail closed") as
      ConsumerRepairDraftBundle & { unsupportedBigInt?: bigint };
    malformed.unsupportedBigInt = 1n;

    expect(buildConsumerRepairDurableStorageRoutingPlan(malformed)).toMatchObject({
      route: "TRANSACTIONAL_DURABLE_STORE",
      reason: "CANONICAL_SERIALIZATION_FAILED_CLOSED",
      canonicalLength: null,
      canonicalUtf8Bytes: null,
    });
    expect(isLargeConsumerRepairRevisionBundle(malformed)).toBe(true);
  });
});
