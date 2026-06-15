import type {
  EditableEstimateAuditEvent,
  EditableEstimateAuditEventType,
  EditableEstimateSnapshot,
} from "./editableEstimateTypes";

function eventId(type: EditableEstimateAuditEventType, at: string, index: number): string {
  return `editable_audit:${type}:${at}:${index}`;
}

export function appendEditableEstimateAuditEvent(
  snapshot: EditableEstimateSnapshot,
  event: Omit<EditableEstimateAuditEvent, "id" | "createdAt"> & { createdAt?: string },
): EditableEstimateSnapshot {
  const createdAt = event.createdAt ?? new Date().toISOString();
  const nextEvent: EditableEstimateAuditEvent = {
    ...event,
    id: eventId(event.type, createdAt, snapshot.auditTrail.length + 1),
    createdAt,
  };
  return {
    ...snapshot,
    auditTrail: [...snapshot.auditTrail, nextEvent],
    updatedAt: createdAt,
  };
}
