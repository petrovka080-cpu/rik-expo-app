export type MediaAuditEvent = {
  eventName: string;
  assetId?: string;
  groupId?: string;
  messageRu: string;
  payload?: Record<string, unknown>;
};

const SECRET_KEY_PATTERN = /signed|storage|url|base64|payload/i;

export function redactMediaAuditEvent(event: MediaAuditEvent): MediaAuditEvent {
  const safePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event.payload ?? {})) {
    if (SECRET_KEY_PATTERN.test(key)) {
      safePayload[key] = "[redacted]";
    } else {
      safePayload[key] = value;
    }
  }

  return {
    ...event,
    payload: safePayload,
  };
}
