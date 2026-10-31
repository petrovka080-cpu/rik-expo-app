import type { ChatMessage } from "../../lib/chat_api";

export const compareChatMessages = (a: ChatMessage, b: ChatMessage): number =>
  a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);

export function mergeChatMessages(previous: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const rows = new Map(previous.map((row) => [row.id, row]));
  for (const row of incoming) {
    if (row.is_deleted) rows.delete(row.id);
    else {
      const readBy = [...(rows.get(row.id)?.read_by ?? []), ...(row.read_by ?? [])];
      rows.set(row.id, readBy.length ? { ...row, read_by: [...new Set(readBy)] } : row);
    }
  }
  return Array.from(rows.values()).sort(compareChatMessages);
}

export function reconcileLatestChatMessages(
  previous: ChatMessage[], latest: ChatMessage[], pageSize: number,
): { messages: ChatMessage[]; resetHistory: boolean; complete: boolean } {
  const latestIds = new Set(latest.map((row) => row.id));
  const page = mergeChatMessages(previous.filter((row) => latestIds.has(row.id)), latest);
  const complete = latest.length < pageSize;
  // A refresh that has jumped past the loaded range must not leave a hidden
  // hole which the oldest-message cursor would then skip permanently.
  const disjoint = previous.length > 0 && page.length > 0
    && compareChatMessages(page[0], previous[previous.length - 1]) > 0;
  if (complete || disjoint || previous.length === 0) {
    return { messages: page, resetHistory: true, complete };
  }
  const older = previous.filter((row) => compareChatMessages(row, page[0]) < 0);
  return { messages: mergeChatMessages(older, page), resetHistory: false, complete };
}

export const hasChatContentChanged = (previous: ChatMessage, next: ChatMessage): boolean =>
  JSON.stringify({ ...previous, read_by: undefined, user: undefined })
    !== JSON.stringify({ ...next, read_by: undefined, user: undefined });
