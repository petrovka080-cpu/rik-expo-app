import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts/realtime/channelCapacity.mjs");

function runCapacity(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args, "--json"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_REALTIME_MAX_CHANNELS: undefined,
      SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: undefined,
      SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: undefined,
      ...env,
      EXPO_PUBLIC_SUPABASE_URL: "https://prod-secret-project.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon_secret_should_not_print",
      SUPABASE_SERVICE_ROLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.role.signature",
      EXPO_TOKEN: "expo_secret_should_not_print",
    },
  });
}

function parseStdout(result: ReturnType<typeof runCapacity>) {
  expect(result.stdout.trim()).toBeTruthy();
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

describe("realtime channel capacity proof", () => {
  it("emits valid JSON without generating realtime load", () => {
    const result = runCapacity(["--scales", "1000,5000,10000,50000"]);
    const report = parseStdout(result);

    expect(result.status).toBe(0);
    expect(report.wave).toBe("S-RT-4B");
    expect(report.status).toBe("PARTIAL_LIMITS_MISSING");
    expect(report.productionTouched).toBe(false);
    expect(report.realtimeLoadGenerated).toBe(false);
    expect(report.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        realtimeLoadGenerated: false,
        otaPublished: false,
        easBuildTriggered: false,
        easSubmitTriggered: false,
        easUpdateTriggered: false,
      }),
    );
  });

  it("parses scales and computes deterministic projection math", () => {
    const result = runCapacity(["--scales", "1,10"]);
    const report = parseStdout(result) as {
      channelsPerActiveUser: number;
      staticUpperBoundChannelsPerActiveUser: number;
      reducedPersistentChannelsPerActiveUser: number;
      focusedSessionChannelsPerActiveUser: number;
      projections: Array<{
        activeUsers: number;
        projectedChannels: number;
        projectedStaticUpperBoundChannels: number;
        projectedPersistentChannels: number;
        projectedFocusedSessionChannels: number;
      }>;
    };

    expect(result.status).toBe(0);
    expect(report.channelsPerActiveUser).toBe(14);
    expect(report.staticUpperBoundChannelsPerActiveUser).toBe(14);
    expect(report.reducedPersistentChannelsPerActiveUser).toBe(8);
    expect(report.focusedSessionChannelsPerActiveUser).toBe(2);
    expect(report.projections).toEqual([
      expect.objectContaining({
        activeUsers: 1,
        projectedChannels: 14,
        projectedStaticUpperBoundChannels: 14,
        projectedPersistentChannels: 8,
        projectedFocusedSessionChannels: 2,
      }),
      expect.objectContaining({
        activeUsers: 10,
        projectedChannels: 140,
        projectedStaticUpperBoundChannels: 140,
        projectedPersistentChannels: 80,
        projectedFocusedSessionChannels: 20,
      }),
    ]);
  });

  it("reports the reduced persistent fanout model alongside the static upper bound", () => {
    const result = runCapacity(["--scales", "50000"]);
    const report = parseStdout(result) as {
      realtimeFanoutModel: {
        modelStatus: string;
        staticUpperBoundChannelsPerActiveUser: number;
        reducedPersistentChannelsPerActiveUser: number;
        focusedSessionChannelsPerActiveUser: number;
      };
      projections: Array<{
        activeUsers: number;
        projectedChannels: number;
        projectedPersistentChannels: number;
        projectedFocusedSessionChannels: number;
      }>;
      bindings: Array<{
        channelNamePattern: string;
        channelsPerMountedSource: number;
        persistentBudgetContribution: number;
      }>;
    };

    expect(result.status).toBe(0);
    expect(report.realtimeFanoutModel).toEqual(
      expect.objectContaining({
        modelStatus: "reduced_persistent_budget_implemented",
        staticUpperBoundChannelsPerActiveUser: 14,
        reducedPersistentChannelsPerActiveUser: 8,
        focusedSessionChannelsPerActiveUser: 2,
      }),
    );
    expect(report.projections).toEqual([
      expect.objectContaining({
        activeUsers: 50000,
        projectedChannels: 700000,
        projectedPersistentChannels: 400000,
        projectedFocusedSessionChannels: 100000,
      }),
    ]);
    expect(report.bindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channelNamePattern: "notif-buyer-rt + buyer-proposals-rt",
          channelsPerMountedSource: 2,
          persistentBudgetContribution: 0,
        }),
        expect.objectContaining({
          channelNamePattern: "director:screen:realtime + director-handoff-rt",
          channelsPerMountedSource: 2,
          persistentBudgetContribution: 1,
        }),
        expect.objectContaining({
          channelNamePattern: "director-handoff-rt",
          channelsPerMountedSource: 1,
          persistentBudgetContribution: 0,
        }),
      ]),
    );
  });

  it("proves the focused-session channel budget from focus and visible gates", () => {
    const result = runCapacity(["--scales", "50000"]);
    const report = parseStdout(result) as {
      realtimeFanoutModel: {
        focusedSessionModel: {
          modelStatus: string;
          maxFocusedSessionChannelsPerActiveUser: number;
          roleScreenChannelsPerFocusedRoute: number;
          directorBaseScreenChannels: number;
          directorVisibleAncillaryChannelMax: number;
          chatFocusedRouteChannels: number;
        };
      };
      projections: Array<{
        projectedFocusedSessionChannels: number;
      }>;
    };

    const buyerSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/screens/buyer/buyer.realtime.lifecycle.ts"),
      "utf8",
    );
    const accountantSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/screens/accountant/accountant.realtime.lifecycle.ts"),
      "utf8",
    );
    const warehouseSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/screens/warehouse/warehouse.realtime.lifecycle.ts"),
      "utf8",
    );
    const contractorSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/screens/contractor/contractor.realtime.lifecycle.ts"),
      "utf8",
    );
    const directorControllerSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/screens/director/useDirectorScreenController.ts"),
      "utf8",
    );
    const chatSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/chat/ChatScreen.tsx"),
      "utf8",
    );

    for (const source of [buyerSource, accountantSource, warehouseSource, contractorSource]) {
      expect(source).toContain("useFocusEffect(bindRealtime)");
    }
    expect(directorControllerSource).toContain(
      "visible: isScreenFocused && dirTab === DIRECTOR_FINANCE_TAB",
    );
    expect(directorControllerSource).toContain(
      "visible: isScreenFocused && dirTab === DIRECTOR_REPORTS_TAB && reports.repOpen",
    );
    expect(chatSource).toContain("subscribeToListingChatMessages(listingId");
    expect(report.realtimeFanoutModel.focusedSessionModel).toEqual(
      expect.objectContaining({
        modelStatus: "focused_session_budget_implemented",
        maxFocusedSessionChannelsPerActiveUser: 2,
        roleScreenChannelsPerFocusedRoute: 1,
        directorBaseScreenChannels: 1,
        directorVisibleAncillaryChannelMax: 1,
        chatFocusedRouteChannels: 1,
      }),
    );
    expect(report.projections).toEqual([
      expect.objectContaining({
        projectedFocusedSessionChannels: 100000,
      }),
    ]);
  });

  it("rejects invalid scale input", () => {
    const result = runCapacity(["--scales", "1000,-1"]);
    const report = parseStdout(result) as { status: string; errors: string[] };

    expect(result.status).toBe(2);
    expect(report.status).toBe("BLOCKED");
    expect(report.errors.join(" ")).toContain("Invalid --scales");
  });

  it("marks projections unverified when account limits are missing", () => {
    const result = runCapacity(["--scales", "10000"], {
      SUPABASE_REALTIME_MAX_CHANNELS: undefined,
      SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: undefined,
      SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: undefined,
    });
    const report = parseStdout(result) as {
      accountLimitStatus: string;
      capacityClaim: string;
      limits: Record<string, unknown>;
      missingLimitKeys: string[];
      projections: Array<{ withinVerifiedAccountLimits: boolean | null; reason: string }>;
    };

    expect(result.status).toBe(0);
    expect(report.accountLimitStatus).toBe("owner_action_required");
    expect(report.capacityClaim).toBe("partial");
    expect(report.limits).toEqual({
      maxChannels: "missing",
      maxConcurrentClients: "missing",
      maxMessagesPerSecond: "missing",
    });
    expect(report.missingLimitKeys).toEqual([
      "SUPABASE_REALTIME_MAX_CHANNELS",
      "SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS",
      "SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND",
    ]);
    expect(report.projections[0].withinVerifiedAccountLimits).toBeNull();
    expect(report.projections[0].reason).toContain("positive integers");
  });

  it("checks true and false projections when account limits are provided", () => {
    const within = parseStdout(
      runCapacity(["--scales", "10000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "200000",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "20000",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: "100000",
      }),
    ) as { status: string; accountLimitStatus: string; projections: Array<{ withinVerifiedAccountLimits: boolean }> };

    expect(within.accountLimitStatus).toBe("verified");
    expect(within.projections[0].withinVerifiedAccountLimits).toBe(true);
    expect(within.status).toBe("GREEN_LIMITS_VERIFIED");

    const over = parseStdout(
      runCapacity(["--scales", "10000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "1000",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "20000",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: "100000",
      }),
    ) as { projections: Array<{ withinVerifiedAccountLimits: boolean; reason: string }> };

    expect(over.projections[0].withinVerifiedAccountLimits).toBe(false);
    expect(over.projections[0].reason).toContain("projected channels exceed");
  });

  it("keeps channel/client conclusions when messages/sec is missing", () => {
    const report = parseStdout(
      runCapacity(["--scales", "1000,5000,10000,50000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "200000",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "20000",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: undefined,
      }),
    ) as {
      status: string;
      accountLimitStatus: string;
      missingLimitKeys: string[];
      conclusion: { oneK: string; fiveK: string; tenK: string; fiftyK: string };
    };

    expect(report.status).toBe("PARTIAL_MESSAGES_PER_SECOND_MISSING");
    expect(report.accountLimitStatus).toBe("partial_messages_per_second_missing");
    expect(report.missingLimitKeys).toEqual(["SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND"]);
    expect(report.conclusion).toEqual({
      oneK: "verified",
      fiveK: "verified",
      tenK: "verified",
      fiftyK: "requires_enterprise",
    });
  });

  it("distinguishes present-but-invalid limit env from missing env", () => {
    const report = parseStdout(
      runCapacity(["--scales", "10000"], {
        SUPABASE_REALTIME_MAX_CHANNELS: "true",
        SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS: "also-not-a-number",
        SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND: undefined,
      }),
    ) as {
      env: Record<string, string>;
      missingLimitKeys: string[];
      invalidLimitKeys: string[];
      conclusion: { tenK: string };
    };

    expect(report.env.SUPABASE_REALTIME_MAX_CHANNELS).toBe("present_redacted");
    expect(report.env.SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS).toBe("present_redacted");
    expect(report.missingLimitKeys).toEqual(["SUPABASE_REALTIME_MAX_MESSAGES_PER_SECOND"]);
    expect(report.invalidLimitKeys).toEqual([
      "SUPABASE_REALTIME_MAX_CHANNELS",
      "SUPABASE_REALTIME_MAX_CONCURRENT_CLIENTS",
    ]);
    expect(report.conclusion.tenK).toBe("unknown");
  });

  it("redacts dynamic channel names and does not print secrets", () => {
    const result = runCapacity(["--scales", "1000"]);
    const output = result.stdout + result.stderr;
    const report = parseStdout(result) as { bindings: Array<{ channelNamePattern: string }> };

    expect(report.bindings.some((binding) => binding.channelNamePattern === "chat:listing:<redacted>")).toBe(true);
    expect(output).not.toContain("prod-secret-project");
    expect(output).not.toContain("anon_secret_should_not_print");
    expect(output).not.toContain("service.role.signature");
    expect(output).not.toContain("expo_secret_should_not_print");
  });

  it("does not import or call Supabase realtime APIs", () => {
    const source = fs.readFileSync(SCRIPT_PATH, "utf8");

    expect(source).not.toContain("createClient");
    expect(source).not.toContain("supabase.channel");
    expect(source).not.toContain(".channel(");
    expect(source).not.toContain("EXPO_PUBLIC_SUPABASE");
    expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
