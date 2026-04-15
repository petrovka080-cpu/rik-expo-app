import { attachBuyerSubscriptions } from "./buyer.subscriptions";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

type ChannelHandler = (payload?: unknown) => void;

describe("attachBuyerSubscriptions", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("logs callback and cleanup failures without breaking detach or realtime callbacks", () => {
    const callbacks: Record<string, ChannelHandler> = {};
    const builtChannels: { name: string }[] = [];

    const mockSupabase = {
      channel: jest.fn((name: string) => {
        const channel = {
          name,
          on: jest.fn((_event: string, _filter: unknown, callback: ChannelHandler) => {
            callbacks[name] = callback;
            return channel;
          }),
          subscribe: jest.fn(() => channel),
        };
        builtChannels.push(channel);
        return channel;
      }),
      removeChannel: jest.fn((channel: { name: string }) => {
        throw new Error(`remove failed: ${channel.name}`);
      }),
    };

    const detach = attachBuyerSubscriptions({
      supabase: mockSupabase as never,
      focusedRef: { current: true },
      onNotif: () => {
        throw new Error("notif failed");
      },
      onProposalsChanged: () => {
        throw new Error("refresh failed");
      },
    });

    expect(() =>
      callbacks["notif-buyer-rt"]?.({
        new: {
          title: "Title",
          body: "Body",
        },
      }),
    ).not.toThrow();
    expect(() => callbacks["buyer-proposals-rt"]?.({})).not.toThrow();
    expect(() => detach()).not.toThrow();

    expect(builtChannels.map((channel) => channel.name)).toEqual([
      "notif-buyer-rt",
      "buyer-proposals-rt",
    ]);

    const events = getPlatformObservabilityEvents().map((event) => event.event);
    expect(events).toEqual(
      expect.arrayContaining([
        "buyer_notif_callback_failed",
        "buyer_notif_refresh_failed",
        "buyer_proposals_refresh_failed",
        "buyer_notif_remove_channel_failed",
        "buyer_proposals_remove_channel_failed",
      ]),
    );
  });
});
