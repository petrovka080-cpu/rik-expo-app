import type { Disposable } from "../lifecycle/disposable";

export type ManagedRealtimeChannel = {
  unsubscribe?: () => void | Promise<void>;
};

export type RealtimeSubscriptionManagerOptions<TChannel extends ManagedRealtimeChannel> = {
  key?: string;
  removeChannel?: (channel: TChannel) => void | Promise<void>;
};

export type RealtimeSubscriptionSnapshotEntry = {
  key: string;
  owners: string[];
  refCount: number;
  pending: boolean;
  disposed: boolean;
};

export type RealtimeSubscriptionManagerSnapshot = {
  activeChannelCount: number;
  activeSubscriberCount: number;
  channels: RealtimeSubscriptionSnapshotEntry[];
};

type ManagedEntry<TChannel extends ManagedRealtimeChannel> = {
  key: string;
  channel: TChannel | null;
  channelPromise: Promise<TChannel> | null;
  removeChannel?: (channel: TChannel) => void | Promise<void>;
  subscribers: Map<number, string>;
  disposed: boolean;
};

let nextToken = 0;
const entries = new Map<string, ManagedEntry<ManagedRealtimeChannel>>();

const normalizeOwner = (owner: string): string => String(owner || "").trim() || "unknown_realtime_owner";
const normalizeKey = (owner: string, key?: string): string => String(key || owner || "").trim() || "unknown_realtime_key";

const redactLifecycleId = (value: string): string =>
  String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<redacted-email>")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "<redacted-id>",
    )
    .replace(/\b(?:token|secret|password|authorization|apikey|api_key)[^:/\s]*/gi, "<redacted-key>");

async function cleanupEntry(entry: ManagedEntry<ManagedRealtimeChannel>) {
  if (entry.disposed) return;
  entry.disposed = true;
  const channel = entry.channel;
  entry.channel = null;
  if (!channel) return;
  if (typeof channel.unsubscribe === "function") {
    await channel.unsubscribe();
  }
  if (entry.removeChannel) {
    await entry.removeChannel(channel);
  }
}

function releaseToken(key: string, token: number): void {
  const entry = entries.get(key);
  if (!entry || !entry.subscribers.delete(token)) return;
  if (entry.subscribers.size > 0) return;
  entries.delete(key);
  void cleanupEntry(entry);
}

export function subscribe<TChannel extends ManagedRealtimeChannel>(
  owner: string,
  channelFactory: () => TChannel | Promise<TChannel>,
  options: RealtimeSubscriptionManagerOptions<TChannel> = {},
): Disposable {
  const normalizedOwner = normalizeOwner(owner);
  const key = normalizeKey(normalizedOwner, options.key);
  const token = ++nextToken;

  const existing = entries.get(key);
  if (existing && !existing.disposed) {
    existing.subscribers.set(token, normalizedOwner);
    return {
      dispose: () => releaseToken(key, token),
    };
  }

  const entry: ManagedEntry<ManagedRealtimeChannel> = {
    key,
    channel: null,
    channelPromise: null,
    removeChannel: options.removeChannel as ManagedEntry<ManagedRealtimeChannel>["removeChannel"],
    subscribers: new Map([[token, normalizedOwner]]),
    disposed: false,
  };
  entries.set(key, entry);

  const channelPromise = Promise.resolve()
    .then(channelFactory)
    .then(async (channel) => {
      if (entry.disposed || entries.get(key) !== entry || entry.subscribers.size === 0) {
        if (typeof channel.unsubscribe === "function") {
          await channel.unsubscribe();
        }
        if (options.removeChannel) {
          await options.removeChannel(channel);
        }
        return channel;
      }
      entry.channel = channel;
      return channel;
    });
  entry.channelPromise = channelPromise as Promise<ManagedRealtimeChannel>;
  void channelPromise.catch(() => {
    entries.delete(key);
    entry.disposed = true;
  });

  return {
    dispose: () => releaseToken(key, token),
  };
}

export function unsubscribe(owner: string): number {
  return unsubscribeAllByOwner(owner);
}

export function unsubscribeAllByOwner(owner: string): number {
  const normalizedOwner = normalizeOwner(owner);
  let removed = 0;
  for (const [key, entry] of [...entries.entries()]) {
    for (const [token, subscriberOwner] of [...entry.subscribers.entries()]) {
      if (subscriberOwner !== normalizedOwner) continue;
      entry.subscribers.delete(token);
      removed += 1;
    }
    if (entry.subscribers.size === 0) {
      entries.delete(key);
      void cleanupEntry(entry);
    }
  }
  return removed;
}

export function unsubscribeAll(): number {
  const count = entries.size;
  for (const [key, entry] of [...entries.entries()]) {
    entries.delete(key);
    void cleanupEntry(entry);
  }
  return count;
}

export function getActiveChannels(): string[] {
  return [...entries.keys()].sort();
}

export function getSnapshot(): RealtimeSubscriptionManagerSnapshot {
  const channels = [...entries.values()]
    .map((entry) => ({
      key: redactLifecycleId(entry.key),
      owners: [...new Set(entry.subscribers.values())].map(redactLifecycleId).sort(),
      refCount: entry.subscribers.size,
      pending: entry.channel == null && !entry.disposed,
      disposed: entry.disposed,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  return {
    activeChannelCount: channels.length,
    activeSubscriberCount: channels.reduce((total, channel) => total + channel.refCount, 0),
    channels,
  };
}

export const realtimeSubscriptionManager = {
  subscribe,
  unsubscribe,
  unsubscribeAllByOwner,
  unsubscribeAll,
  getActiveChannels,
  getSnapshot,
};
