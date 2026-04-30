import { attachBuyerSubscriptions } from "./buyer.subscriptions";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { BUYER_REALTIME_CHANNEL_NAME } from "../../lib/realtime/realtime.channels";

const mockSubscribeChannel = jest.fn();

jest.mock("../../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("../../lib/realtime/realtime.client", () => ({
  subscribeChannel: (...args: unknown[]) => mockSubscribeChannel(...args),
}));

describe("attachBuyerSubscriptions", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockSubscribeChannel.mockReset().mockReturnValue(jest.fn());
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("logs callback and cleanup failures without breaking detach or realtime callbacks", () => {
    const detachInner = jest.fn(() => {
      throw new Error("detach failed");
    });
    mockSubscribeChannel.mockReturnValue(detachInner);
    const mockSupabase = {};

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
      mockSubscribeChannel.mock.calls[0]?.[0]?.onEvent?.({
        binding: { key: "buyer_notifications", table: "notifications" },
        payload: {
          new: {
            title: "Title",
            body: "Body",
          },
        },
      }),
    ).not.toThrow();
    expect(() =>
      mockSubscribeChannel.mock.calls[0]?.[0]?.onEvent?.({
        binding: { key: "buyer_proposals_terminal", table: "proposals" },
        payload: {},
      }),
    ).not.toThrow();
    expect(() => detach()).not.toThrow();

    expect(mockSubscribeChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: BUYER_REALTIME_CHANNEL_NAME,
        scope: "buyer",
        route: "/buyer",
        surface: "realtime_subscriptions",
      }),
    );

    const events = getPlatformObservabilityEvents().map((event) => event.event);
    expect(events).toEqual(
      expect.arrayContaining([
        "buyer_notif_callback_failed",
        "buyer_notif_refresh_failed",
        "buyer_proposals_refresh_failed",
        "buyer_realtime_detach_failed",
      ]),
    );
  });
});
