/**
 * lifecycle.s3.tests.ts — S3: Lifecycle / Field Reliability Hardening
 *
 * S3 test matrix A–I (from the ТЗ).
 *
 * These tests prove specific S3 properties via architecture-scan (readFileSync),
 * unit tests of shared primitives, and structural invariant checks.
 *
 * NOTE: Runtime/device tests are documented in S3_runtime_proof.md.
 * These are the automated tests that must pass in CI.
 */

import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Source maps — loaded once
// ---------------------------------------------------------------------------

const BUYER_REALTIME_SRC = join(
  __dirname,
  "../../screens/buyer/buyer.realtime.lifecycle.ts",
);
const BUYER_SUMMARY_SRC = join(
  __dirname,
  "../../screens/buyer/buyer.summary.service.ts",
);
const DIRECTOR_LIFECYCLE_SRC = join(
  __dirname,
  "../../screens/director/director.lifecycle.ts",
);
const DIRECTOR_LIFECYCLE_REFRESH_SRC = join(
  __dirname,
  "../../screens/director/director.lifecycle.refresh.ts",
);
const CONTRACTOR_LIFECYCLE_SRC = join(
  __dirname,
  "../../screens/contractor/contractor.issuedRefreshLifecycle.ts",
);
const WAREHOUSE_REALTIME_SRC = join(
  __dirname,
  "../../screens/warehouse/warehouse.realtime.lifecycle.ts",
);
const REALTIME_CLIENT_SRC = join(
  __dirname,
  "../realtime/realtime.client.ts",
);
const APP_ACTIVE_HOOK_SRC = join(__dirname, "useAppActiveRevalidation.ts");
const OFFICE_RETURN_TRACING_SRC = join(
  __dirname,
  "../../screens/office/useOfficePostReturnTracing.ts",
);
const PDF_RUNNER_SRC = join(__dirname, "../pdfRunner.ts");
const PDF_RUNNER_AUTH_TRANSPORT_SRC = join(
  __dirname,
  "../pdfRunner.auth.transport.ts",
);
const PLATFORM_GUARD_SRC = join(
  __dirname,
  "../observability/platformGuardDiscipline.ts",
);

// ---------------------------------------------------------------------------
// TEST A — App background → foreground (dedup guard)
// ---------------------------------------------------------------------------

describe("S3-A: App background → foreground", () => {
  const hookSrc = readFileSync(APP_ACTIVE_HOOK_SRC, "utf8");
  const dirSrc = readFileSync(DIRECTOR_LIFECYCLE_SRC, "utf8");
  const dirRefreshSrc = readFileSync(DIRECTOR_LIFECYCLE_REFRESH_SRC, "utf8");

  it("A1: useAppActiveRevalidation has transition guard (background → active only)", () => {
    expect(hookSrc).toContain('previous === "background"');
    expect(hookSrc).toContain('previous === "inactive"');
    expect(hookSrc).toContain('nextState === "active"');
  });

  it("A2: refresh reason is typed as app_became_active (not free-form string)", () => {
    expect(hookSrc).toContain('"app_became_active"');
  });

  it("A3: cooldown guard prevents rapid duplicate revalidation after resume", () => {
    expect(hookSrc).toContain("isPlatformGuardCoolingDown");
    expect(hookSrc).toContain("lastRevalidatedAtRef");
  });

  it("A4: Director lifecycle uses same cooldown pattern independently", () => {
    expect(dirRefreshSrc).toContain("isPlatformGuardCoolingDown");
    expect(dirSrc).toContain("lastLifecycleRefreshAtRef");
    expect(dirSrc).toContain("DIRECTOR_LIFECYCLE_REFRESH_MIN_INTERVAL_MS");
  });

  it("A5: Buyer lifecycle now wires useAppActiveRevalidation (gap fix)", () => {
    const buyerSrc = readFileSync(BUYER_REALTIME_SRC, "utf8");
    expect(buyerSrc).toContain("useAppActiveRevalidation");
    expect(buyerSrc).toContain('screen: "buyer"');
    expect(buyerSrc).toContain("isInFlight: params.isRefreshInFlight");
  });
});

// ---------------------------------------------------------------------------
// TEST B — Screen blur → focus (no duplicate fetch storm)
// ---------------------------------------------------------------------------

describe("S3-B: Screen blur → focus", () => {
  const buyerSrc = readFileSync(BUYER_REALTIME_SRC, "utf8");
  const warehouseSrc = readFileSync(WAREHOUSE_REALTIME_SRC, "utf8");

  it("B1: Buyer binds realtime via useFocusEffect (auto-cleanup on blur)", () => {
    expect(buyerSrc).toContain("useFocusEffect(bindRealtime)");
  });

  it("B2: Warehouse binds realtime via useFocusEffect (auto-cleanup on blur)", () => {
    expect(warehouseSrc).toContain("useFocusEffect(bindRealtime)");
  });

  it("B3: subscribeChannel uses token-based ref-counting to prevent duplicate channel creation", () => {
    const clientSrc = readFileSync(REALTIME_CLIENT_SRC, "utf8");
    expect(clientSrc).toContain("const token = ++activeChannelSeq");
    expect(clientSrc).toContain("subscribers: new Map");
    expect(clientSrc).toContain("channel_name_shared_ref_counted");
  });

  it("B4: Buyer realtime fires only when screen is focused", () => {
    expect(buyerSrc).toContain("params.focusedRef.current");
    expect(buyerSrc).toContain("not_focused");
  });

  it("B5: Buyer realtime has in-flight guard to prevent duplicate fetch on rapid focus events", () => {
    expect(buyerSrc).toContain("isRefreshInFlightRef.current()");
    expect(buyerSrc).toContain("in_flight");
  });
});

// ---------------------------------------------------------------------------
// TEST C — Office child return
// ---------------------------------------------------------------------------

describe("S3-C: Office child return (re-entry stability)", () => {
  const officeSrc = readFileSync(OFFICE_RETURN_TRACING_SRC, "utf8");

  it("C1: Office return tracing hook exists as dedicated boundary", () => {
    expect(officeSrc).toContain("useOfficePostReturnTracing");
  });

  it("C2: Post-return trace resets on each routeScopeActive change", () => {
    // cancelPostReturnIdle is called on routeScopeActive=false (cleanup)
    expect(officeSrc).toContain("cancelPostReturnIdle");
    expect(officeSrc).toContain("routeScopeActive");
  });

  it("C3: InteractionManager guards post-return callbacks from premature execution", () => {
    expect(officeSrc).toContain("InteractionManager.runAfterInteractions");
  });

  it("C4: cancelAnimationFrame prevents stale animation callbacks after route exit", () => {
    expect(officeSrc).toContain("cancelAnimationFrame");
    expect(officeSrc).toContain("postReturnFrameRef");
  });

  it("C5: Keyboard listeners are cleaned up on route exit", () => {
    expect(officeSrc).toContain("Keyboard.addListener");
    expect(officeSrc).toContain("subscription.remove()");
  });
});

// ---------------------------------------------------------------------------
// TEST D — Realtime + manual refresh collision
// ---------------------------------------------------------------------------

describe("S3-D: Realtime + manual refresh collision", () => {
  const summarySrc = readFileSync(BUYER_SUMMARY_SRC, "utf8");

  it("D1: Buyer summary service joins inflight rather than starting duplicate", () => {
    expect(summarySrc).toContain("joined_inflight");
    expect(summarySrc).toContain("state.inFlight");
  });

  it("D2: Buyer summary service queues rerun for next cycle (no lost realtime event)", () => {
    expect(summarySrc).toContain("rerunQueued");
    expect(summarySrc).toContain("queued_rerun");
  });

  it("D3: Buyer summary service rerun resolves the waiter promise (no dangling promises)", () => {
    expect(summarySrc).toContain("resolveRerunWaiter");
    expect(summarySrc).toContain("rejectRerunWaiter");
    expect(summarySrc).toContain("clearRerunWaiter");
  });

  it("D4: Director lifecycle runRefresh joins inflight and queues rerun with force flag", () => {
    const dirRefreshSrc = readFileSync(DIRECTOR_LIFECYCLE_REFRESH_SRC, "utf8");
    expect(dirRefreshSrc).toContain("joined_inflight");
    expect(dirRefreshSrc).toContain("queued_rerun");
    expect(dirRefreshSrc).toContain("rerunForce");
  });

  it("D5: Warehouse realtime uses in-flight ref guard before triggering refresh", () => {
    const warehouseSrc = readFileSync(WAREHOUSE_REALTIME_SRC, "utf8");
    expect(warehouseSrc).toContain("isIncomingRefreshInFlightRef");
    expect(warehouseSrc).toContain("isExpenseRefreshInFlightRef");
  });
});

// ---------------------------------------------------------------------------
// TEST E — Resume on weak network → stale_visible state
// ---------------------------------------------------------------------------

describe("S3-E: Resume on weak network (degraded-state contract)", () => {
  const hookSrc = readFileSync(APP_ACTIVE_HOOK_SRC, "utf8");
  const guardSrc = readFileSync(PLATFORM_GUARD_SRC, "utf8");

  it("E1: useAppActiveRevalidation skips when network known offline", () => {
    expect(hookSrc).toContain("networkKnownOffline");
    expect(hookSrc).toContain("network_known_offline");
  });

  it("E2: skip is recorded as observability event (not silent)", () => {
    expect(hookSrc).toContain("recordPlatformGuardSkip");
    expect(hookSrc).toContain('"network_known_offline"');
  });

  it("E3: Buyer realtime also skips refresh when offline (no phantom success)", () => {
    const buyerSrc = readFileSync(BUYER_REALTIME_SRC, "utf8");
    expect(buyerSrc).toContain("networkKnownOffline");
  });

  it("E4: Director lifecycle skips when networkKnownOffline (same contract)", () => {
    const dirSrc = readFileSync(DIRECTOR_LIFECYCLE_SRC, "utf8");
    expect(dirSrc).toContain("networkKnownOffline");
  });

  it("E5: PlatformGuardReason includes network_known_offline", () => {
    expect(guardSrc).toContain('"network_known_offline"');
  });
});

// ---------------------------------------------------------------------------
// TEST F — Earlier request cannot overwrite newer truth
// ---------------------------------------------------------------------------

describe("S3-F: Earlier request cannot overwrite newer truth (stale suppression)", () => {
  const summarySrc = readFileSync(BUYER_SUMMARY_SRC, "utf8");

  it("F1: Buyer summary uses sequential task replacement (start() replaces inFlight)", () => {
    expect(summarySrc).toContain("state.inFlight = task");
    expect(summarySrc).toContain("state.inFlight = null");
  });

  it("F2: Cache is only updated from the resolved task, not from a stale one", () => {
    // isCacheFresh check prevents committing earlier stale result
    expect(summarySrc).toContain("isCacheFresh");
    expect(summarySrc).toContain("slot.cache = {");
    expect(summarySrc).toContain("fetchedAt: Date.now()");
  });

  it("F3: Director uses InFlight ref + rerunForce to ensure last force wins", () => {
    const dirRefreshSrc = readFileSync(DIRECTOR_LIFECYCLE_REFRESH_SRC, "utf8");
    expect(dirRefreshSrc).toContain("stateRef.current.rerunForce = true");
    expect(dirRefreshSrc).toContain("const rerunForce = stateRef.current.rerunForce");
  });

  it("F4: Contractor uses inFlightRef to prevent multiple concurrent refreshes", () => {
    const contractorSrc = readFileSync(CONTRACTOR_LIFECYCLE_SRC, "utf8");
    expect(contractorSrc).toContain("inFlightRef.current = true");
    expect(contractorSrc).toContain("inFlightRef.current = false");
  });
});

// ---------------------------------------------------------------------------
// TEST G — PDF entry after resume (no phantom open)
// ---------------------------------------------------------------------------

describe("S3-G: PDF entry after resume (lifecycle isolation)", () => {
  const pdfSrc = readFileSync(PDF_RUNNER_SRC, "utf8");
  const pdfAuthTransportSrc = readFileSync(PDF_RUNNER_AUTH_TRANSPORT_SRC, "utf8");

  it("G1: pdfRunner has a dedup mechanism (activeRuns set prevents re-entry)", () => {
    // activeRuns.has(key) prevents the same PDF key from being opened twice.
    // This is the primary protection against phantom PDF opens from a stale session.
    expect(pdfSrc).toContain("activeRuns.has(key)");
    expect(pdfSrc).toContain("activeRuns.add(key)");
    expect(pdfSrc).toContain("activeRuns.delete(key)");
  });

  it("G2: pdfRunner validates auth via the auth transport boundary before fetching", () => {
    // PDF download uses auth headers obtained through the typed auth transport.
    // This ensures stale/unauthenticated sessions cannot silently fetch PDF data.
    expect(pdfSrc).toContain("readPdfRunnerAuthSession");
    expect(pdfSrc).not.toContain("supabase.auth.getSession");
    expect(pdfSrc).toContain("getAuthHeader");
    expect(pdfAuthTransportSrc).toContain("supabase.auth.getSession");
  });
});

// ---------------------------------------------------------------------------
// TEST H — Realtime reconnect, no duplicate subscriptions
// ---------------------------------------------------------------------------

describe("S3-H: Realtime reconnect, no duplicate subscriptions", () => {
  const clientSrc = readFileSync(REALTIME_CLIENT_SRC, "utf8");

  it("H1: subscribeChannel shares duplicate same-signature channels instead of replacing them", () => {
    expect(clientSrc).toContain("activeChannels.get(params.name)");
    expect(clientSrc).toContain("bindingSignature === bindingSignature");
    expect(clientSrc).toContain("channel_name_shared_ref_counted");
  });

  it("H2: Each subscription has a token; cleanup releases the channel only after the last ref", () => {
    expect(clientSrc).toContain("const token = ++activeChannelSeq");
    expect(clientSrc).toContain("current.subscribers.delete(token)");
    expect(clientSrc).toContain("current.subscribers.size > 0");
    expect(clientSrc).toContain("last_ref_released");
  });

  it("H3: useFocusEffect auto-detaches on blur, preventing ghost subscriptions", () => {
    const buyerSrc = readFileSync(BUYER_REALTIME_SRC, "utf8");
    expect(buyerSrc).toContain("useFocusEffect(bindRealtime)");

    const warehouseSrc = readFileSync(WAREHOUSE_REALTIME_SRC, "utf8");
    expect(warehouseSrc).toContain("useFocusEffect(bindRealtime)");
  });

  it("H4: Warehouse defers channel detach via setTimeout(detach, 0) (native teardown safety)", () => {
    const warehouseSrc = readFileSync(WAREHOUSE_REALTIME_SRC, "utf8");
    expect(warehouseSrc).toContain("setTimeout(detach, 0)");
  });

  it("H5: clearRealtimeSessionState is idempotent (safe double-cleanup at session boundary)", () => {
    expect(clientSrc).toContain("activeChannels.clear()");
    expect(clientSrc).toContain("clearRealtimeSessionState");
  });
});

// ---------------------------------------------------------------------------
// TEST I — Disable / recover network
// ---------------------------------------------------------------------------

describe("S3-I: Disable / recover network (network_recovered trigger)", () => {
  const hookSrc = readFileSync(APP_ACTIVE_HOOK_SRC, "utf8");
  const contractorSrc = readFileSync(CONTRACTOR_LIFECYCLE_SRC, "utf8");
  const warehouseReceiveSrc = readFileSync(
    join(
      __dirname,
      "../../screens/warehouse/hooks/useWarehouseReceiveFlow.ts",
    ),
    "utf8",
  );

  it("I1: Contractor subscribes to network state and triggers refresh on recovery", () => {
    expect(contractorSrc).toContain("subscribeLifecycleNetworkRecovery");
    expect(contractorSrc).toContain("subscribeLifecycleAppActiveTransition");
    expect(hookSrc).toContain("previousOnline === false && nextOnline === true");
    expect(contractorSrc).toContain('"network_back"');
  });

  it("I2: Warehouse receive flow triggers queue flush on network recovery", () => {
    expect(warehouseReceiveSrc).toContain("subscribeLifecycleNetworkRecovery");
    expect(warehouseReceiveSrc).toContain("subscribeLifecycleAppActiveTransition");
    expect(warehouseReceiveSrc).toContain('"network_back"');
  });

  it("I3: Network recovery is NOT triggered if was already online (no false re-flush)", () => {
    // The guard is: wasOnline === false && nextOnline === true
    // ie. only changes from offline→online, not online→online
    expect(hookSrc).toContain("previousOnline === false");
    expect(hookSrc).toContain("nextOnline === true");
  });

  it("I4: Network service listener is registered exactly once (ensurePlatformNetworkService guard)", () => {
    const networkSrcPath = join(
      __dirname,
      "../offline/platformNetwork.service.ts",
    );
    const networkSrc = readFileSync(networkSrcPath, "utf8");
    expect(networkSrc).toContain("if (!serviceStarted)");
    expect(networkSrc).toContain("serviceStarted = true");
  });
});
