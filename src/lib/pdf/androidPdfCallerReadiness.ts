type Caller = Readonly<{ ownerUserId: string; draftId: string | null }>;
let mounted: Caller | null = null;
const listeners = new Set<() => void>();
export function getMountedAndroidPdfCaller(): Caller | null { return mounted; }
export function publishMountedAndroidPdfCaller(ownerUserId: string, draftId: string | null): () => void {
  const caller = { ownerUserId, draftId };
  mounted = caller;
  for (const listener of listeners) listener();
  return () => { if (mounted === caller) mounted = null; };
}
export function subscribeMountedAndroidPdfCaller(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
