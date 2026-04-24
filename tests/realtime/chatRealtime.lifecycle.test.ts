type MockChannelRecord = {
  channel: {
    name: string;
    on: jest.Mock;
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
  };
  subscribeStatus?: ((status: string) => void) | null;
};

const createdChannels: MockChannelRecord[] = [];

const buildChannelRecord = (name: string): MockChannelRecord => {
  const record: MockChannelRecord = {
    channel: {
      name,
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback?: (status: string) => void) => {
        record.subscribeStatus = callback ?? null;
        callback?.("SUBSCRIBED");
        return record.channel;
      }),
      unsubscribe: jest.fn(),
    },
    subscribeStatus: null,
  };
  createdChannels.push(record);
  return record;
};

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    realtime: {
      setAuth: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

import { subscribeToListingChatMessages } from "../../src/lib/chat_api";
import { clearRealtimeSessionState } from "../../src/lib/realtime/realtime.client";

type MockSupabaseModule = {
  supabase: {
    auth: {
      getSession: jest.Mock;
    };
    realtime: {
      setAuth: jest.Mock;
    };
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };
};

const { supabase: mockSupabase } = jest.requireMock(
  "../../src/lib/supabaseClient",
) as MockSupabaseModule;

const flushRealtimeLifecycle = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
};

describe("chat realtime lifecycle", () => {
  beforeEach(() => {
    clearRealtimeSessionState();
    createdChannels.length = 0;
    mockSupabase.auth.getSession.mockReset();
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-market-chat",
        },
      },
    });
    mockSupabase.realtime.setAuth.mockReset();
    mockSupabase.realtime.setAuth.mockResolvedValue(undefined);
    mockSupabase.channel.mockReset();
    mockSupabase.channel.mockImplementation((name: string) =>
      buildChannelRecord(name).channel,
    );
    mockSupabase.removeChannel.mockReset();
    mockSupabase.removeChannel.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    clearRealtimeSessionState();
  });

  it("removes the chat channel on unsubscribe", async () => {
    const unsubscribe = subscribeToListingChatMessages("listing-1", jest.fn());

    await flushRealtimeLifecycle();

    expect(mockSupabase.channel).toHaveBeenCalledWith("chat:listing:listing-1");
    expect(createdChannels).toHaveLength(1);

    const [record] = createdChannels;
    unsubscribe();

    expect(record?.channel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(record?.channel);

    const removeCallsBeforeSessionClear =
      mockSupabase.removeChannel.mock.calls.length;
    clearRealtimeSessionState();
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(
      removeCallsBeforeSessionClear,
    );
  });

  it("replaces duplicate chat attaches and leaves no zombie channel after repeated teardown", async () => {
    const unsubscribeFirst = subscribeToListingChatMessages("listing-1", jest.fn());
    await flushRealtimeLifecycle();

    const firstRecord = createdChannels[0];

    const unsubscribeSecond = subscribeToListingChatMessages("listing-1", jest.fn());
    await flushRealtimeLifecycle();

    const secondRecord = createdChannels[1];

    expect(createdChannels).toHaveLength(2);
    expect(firstRecord?.channel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(firstRecord?.channel);

    unsubscribeFirst();
    expect(secondRecord?.channel.unsubscribe).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(secondRecord?.channel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(secondRecord?.channel);

    const removeCallsBeforeSessionClear =
      mockSupabase.removeChannel.mock.calls.length;
    clearRealtimeSessionState();
    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(
      removeCallsBeforeSessionClear,
    );
  });
});
