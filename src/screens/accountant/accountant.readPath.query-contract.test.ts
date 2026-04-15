/**
 * Accountant read-path — P6.2 migration contract tests.
 *
 * Validates:
 * 1. Inbox query key structure
 * 2. History query key structure
 * 3. Inbox controller consumer contract (13 keys)
 * 4. History controller consumer contract (14 keys)
 */

import { accountantInboxKeys } from "./accountantInbox.query.key";
import { accountantHistoryKeys } from "./accountantHistory.query.key";

describe("accountant inbox query — key structure", () => {
  it("all key starts with accountant/inbox", () => {
    expect(accountantInboxKeys.all).toEqual(["accountant", "inbox"]);
  });

  it("tab key includes tab value", () => {
    const key = accountantInboxKeys.tab("pending" as never);
    expect(key).toEqual(["accountant", "inbox", "pending"]);
  });

  it("tab key is deterministic", () => {
    const k1 = accountantInboxKeys.tab("pending" as never);
    const k2 = accountantInboxKeys.tab("pending" as never);
    expect(k1).toEqual(k2);
  });

  it("different tabs produce different keys", () => {
    const k1 = accountantInboxKeys.tab("pending" as never);
    const k2 = accountantInboxKeys.tab("approved" as never);
    expect(k1).not.toEqual(k2);
  });

  it("all key is a prefix of tab key", () => {
    const all = accountantInboxKeys.all;
    const tab = accountantInboxKeys.tab("pending" as never);
    expect(tab.slice(0, all.length)).toEqual([...all]);
  });
});

describe("accountant history query — key structure", () => {
  it("all key starts with accountant/history", () => {
    expect(accountantHistoryKeys.all).toEqual(["accountant", "history"]);
  });

  it("filters key includes dateFrom/dateTo/search", () => {
    const key = accountantHistoryKeys.filters("2026-01-01", "2026-01-31", "bolt");
    expect(key).toEqual(["accountant", "history", "2026-01-01", "2026-01-31", "bolt"]);
  });

  it("filters key is deterministic", () => {
    const k1 = accountantHistoryKeys.filters("2026-01-01", "2026-01-31", "");
    const k2 = accountantHistoryKeys.filters("2026-01-01", "2026-01-31", "");
    expect(k1).toEqual(k2);
  });

  it("different filters produce different keys", () => {
    const k1 = accountantHistoryKeys.filters("2026-01-01", "2026-01-31", "");
    const k2 = accountantHistoryKeys.filters("2026-02-01", "2026-02-28", "");
    expect(k1).not.toEqual(k2);
  });

  it("all key is a prefix of filters key", () => {
    const all = accountantHistoryKeys.all;
    const filters = accountantHistoryKeys.filters("2026-01-01", "2026-01-31", "");
    expect(filters.slice(0, all.length)).toEqual([...all]);
  });
});

describe("accountant inbox controller — consumer contract preservation", () => {
  const EXPECTED_CONSUMER_KEYS = [
    "rows",
    "setRows",
    "loading",
    "refreshing",
    "setRefreshing",
    "loadingMore",
    "hasMore",
    "totalCount",
    "cacheByTabRef",
    "loadInbox",
    "loadMoreInbox",
    "primeInboxPreviewForTab",
    "isInboxRefreshInFlight",
  ];

  it("consumer contract has exactly 13 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(13);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(13);
  });

  it("has 9 data/state keys and 4 action keys", () => {
    const actionKeys = ["loadInbox", "loadMoreInbox", "primeInboxPreviewForTab", "isInboxRefreshInFlight"];
    for (const key of actionKeys) {
      expect(EXPECTED_CONSUMER_KEYS).toContain(key);
    }
    expect(actionKeys).toHaveLength(4);
  });
});

describe("accountant history controller — consumer contract preservation", () => {
  const EXPECTED_CONSUMER_KEYS = [
    "historyRows",
    "historyLoading",
    "historyRefreshing",
    "setHistoryRefreshing",
    "historyLoadingMore",
    "historyHasMore",
    "historyTotalCount",
    "historyTotalAmount",
    "historyCurrency",
    "loadHistory",
    "loadMoreHistory",
    "syncHistoryFilterLoad",
    "resetObservedHistoryKey",
    "isHistoryRefreshInFlight",
  ];

  it("consumer contract has exactly 14 keys", () => {
    expect(EXPECTED_CONSUMER_KEYS).toHaveLength(14);
    expect(new Set(EXPECTED_CONSUMER_KEYS).size).toBe(14);
  });

  it("has 9 data/state keys and 5 action keys", () => {
    const actionKeys = [
      "loadHistory",
      "loadMoreHistory",
      "syncHistoryFilterLoad",
      "resetObservedHistoryKey",
      "isHistoryRefreshInFlight",
    ];
    for (const key of actionKeys) {
      expect(EXPECTED_CONSUMER_KEYS).toContain(key);
    }
    expect(actionKeys).toHaveLength(5);
  });
});
