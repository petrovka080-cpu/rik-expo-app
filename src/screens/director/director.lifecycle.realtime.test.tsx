import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import TestRenderer, { act } from "react-test-renderer";

import { useDirectorLifecycle } from "./director.lifecycle";
import {
  DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
  DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";

const mockEnsureSignedIn = jest.fn();
const mockGetSession = jest.fn();
const mockSetAuth = jest.fn();
const mockRemoveChannel = jest.fn();
const mockChannelFactory = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockRecordPlatformGuardSkip = jest.fn();
const mockGetPlatformNetworkSnapshot = jest.fn();
const mockAppStateRemove = jest.fn();

const mockAppStateListener = jest.fn((_type?: string, _listener?: unknown) => ({ remove: mockAppStateRemove }));
const mockLogError = jest.fn();

type MockRealtimeChannel = {
  name: string;
  on: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
};

const createdChannels: MockRealtimeChannel[] = [];

jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: (type: string, listener: unknown) => mockAppStateListener(type, listener),
  },
}));

jest.mock("../../lib/supabaseClient", () => ({
  ensureSignedIn: (...args: unknown[]) => mockEnsureSignedIn(...args),
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    realtime: {
      setAuth: (...args: unknown[]) => mockSetAuth(...args),
    },
    channel: (...args: unknown[]) => mockChannelFactory(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

jest.mock("../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: jest.fn(() => false),
  recordPlatformGuardSkip: (...args: unknown[]) => mockRecordPlatformGuardSkip(...args),
}));

jest.mock("../../lib/offline/platformNetwork.service", () => ({
  getPlatformNetworkSnapshot: (...args: unknown[]) => mockGetPlatformNetworkSnapshot(...args),
}));

jest.mock("../../lib/logError", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

const flushAsyncEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function Harness(props: { focused: boolean }) {
  useDirectorLifecycle({
    dirTab: "Заявки",
    requestTab: "foreman",
    finFrom: null,
    finTo: null,
    repFrom: null,
    repTo: null,
    isScreenFocused: props.focused,
    fetchRows: async () => {},
    fetchProps: async () => {},
    fetchFinance: async () => {},
    fetchReport: async () => {},
    showRtToast: () => {},
  });
  return null;
}

describe("director realtime channel lifecycle", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;

    createdChannels.length = 0;
    mockEnsureSignedIn.mockReset().mockResolvedValue(true);
    mockGetSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "director-access-token" } },
    });
    mockSetAuth.mockReset().mockResolvedValue(undefined);
    mockRemoveChannel.mockReset().mockImplementation(() => undefined);
    mockRecordPlatformObservability.mockReset();
    mockRecordPlatformGuardSkip.mockReset();
    mockGetPlatformNetworkSnapshot.mockReset().mockReturnValue({
      hydrated: false,
      networkKnownOffline: false,
    });
    mockAppStateRemove.mockReset();
    mockAppStateListener.mockClear();
    mockLogError.mockReset();
    mockChannelFactory.mockReset().mockImplementation((name: string) => {
      const channel: MockRealtimeChannel = {
        name,
        on: jest.fn(() => channel),
        subscribe: jest.fn((callback?: (status: string) => void) => {
          callback?.("SUBSCRIBED");
          return channel;
        }),
        unsubscribe: jest.fn(() => "ok"),
      };
      createdChannels.push(channel);
      return channel;
    });
  });

  it("keeps director screen realtime channel identity stable across blur and reopen, and cleans previous instances", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Harness focused />);
    });
    await flushAsyncEffects();

    expect(mockChannelFactory).toHaveBeenNthCalledWith(1, DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME);
    expect(mockChannelFactory).toHaveBeenNthCalledWith(2, DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });
    expect(mockSetAuth).toHaveBeenCalledWith("director-access-token");

    const firstScreenChannel = createdChannels[0];
    const firstHandoffChannel = createdChannels[1];

    await act(async () => {
      renderer.update(<Harness focused={false} />);
    });
    await flushAsyncEffects();

    expect(firstScreenChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(firstHandoffChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledWith(firstScreenChannel);
    expect(mockRemoveChannel).toHaveBeenCalledWith(firstHandoffChannel);

    await act(async () => {
      renderer.update(<Harness focused />);
    });
    await flushAsyncEffects();

    expect(mockChannelFactory).toHaveBeenNthCalledWith(3, DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME);
    expect(mockChannelFactory).toHaveBeenNthCalledWith(4, DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME, {
      config: {
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });

    const createdNames = mockChannelFactory.mock.calls.map((entry) => String(entry[0]));
    expect(createdNames).toEqual([
      DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
      DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
      DIRECTOR_SCREEN_REALTIME_CHANNEL_NAME,
      DIRECTOR_HANDOFF_BROADCAST_CHANNEL_NAME,
    ]);
    expect(createdNames.some((name) => /^notif-director-rt:\d+$/.test(name))).toBe(false);

    const reopenedScreenChannel = createdChannels[2];
    const reopenedHandoffChannel = createdChannels[3];

    await act(async () => {
      renderer.unmount();
    });

    expect(reopenedScreenChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(reopenedHandoffChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledWith(reopenedScreenChannel);
    expect(mockRemoveChannel).toHaveBeenCalledWith(reopenedHandoffChannel);
  });

  it("keeps lifecycle teardown non-fatal while surfacing swallowed cleanup failures", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<Harness focused />);
    });
    await flushAsyncEffects();

    const screenChannel = createdChannels[0];
    const handoffChannel = createdChannels[1];
    screenChannel.unsubscribe.mockImplementation(() => {
      throw new Error("screen unsubscribe failed");
    });
    handoffChannel.unsubscribe.mockImplementation(() => {
      throw new Error("handoff unsubscribe failed");
    });
    mockRemoveChannel.mockImplementation(() => {
      throw new Error("remove failed");
    });
    mockAppStateRemove.mockImplementation(() => {
      throw new Error("app state remove failed");
    });

    expect(() => {
      act(() => {
        renderer.unmount();
      });
    }).not.toThrow();

    const events = mockRecordPlatformObservability.mock.calls.map(([event]) => event);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "director",
          surface: "lifecycle_subscription",
          event: "app_state_listener_remove_failed",
          result: "error",
        }),
        expect.objectContaining({
          screen: "director",
          surface: "realtime_cleanup",
          event: "screen_channel_unsubscribe_failed",
          result: "error",
        }),
        expect.objectContaining({
          screen: "director",
          surface: "realtime_cleanup",
          event: "screen_channel_remove_failed",
          result: "error",
        }),
        expect.objectContaining({
          screen: "director",
          surface: "realtime_cleanup",
          event: "handoff_channel_unsubscribe_failed",
          result: "error",
        }),
        expect.objectContaining({
          screen: "director",
          surface: "realtime_cleanup",
          event: "handoff_channel_remove_failed",
          result: "error",
        }),
      ]),
    );
  });

  it("removes anonymous silent catches from director lifecycle Tier-1 cleanup paths", () => {
    const lifecycleSource = readFileSync(join(__dirname, "director.lifecycle.ts"), "utf8");
    const realtimeSource = readFileSync(join(__dirname, "director.lifecycle.realtime.ts"), "utf8");

    expect(lifecycleSource).not.toContain("catch {}");
    expect(realtimeSource).not.toContain("catch {}");
    expect(lifecycleSource).not.toContain("eslint-disable");
    expect(lifecycleSource).toContain("app_state_listener_remove_failed");
    expect(realtimeSource).toContain("teardown_previous_channels_failed");
    expect(realtimeSource).toContain("screen_channel_unsubscribe_failed");
    expect(realtimeSource).toContain("handoff_channel_remove_failed");
  });
});
