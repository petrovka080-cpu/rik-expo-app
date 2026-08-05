type PooledPdfFrameEntry = {
  uri: string;
  iframe: HTMLIFrameElement;
  ready: boolean;
  leases: number;
  lastAccessAt: number;
  loadListeners: Set<() => void>;
  errorListeners: Set<() => void>;
  pooled: boolean;
};

export type PooledPdfFrameMount = {
  iframe: HTMLIFrameElement;
  reusedReadyFrame: boolean;
  release: () => void;
};

const MAX_POOLED_PDF_FRAMES = 3;
const POOLED_PDF_FRAME_TTL_MS = 5 * 60 * 1000;
const pooledFrames = new Map<string, PooledPdfFrameEntry>();
let hiddenPoolHost: HTMLDivElement | null = null;

function ensureHiddenPoolHost(): HTMLDivElement {
  if (hiddenPoolHost?.isConnected) return hiddenPoolHost;
  const host = document.createElement("div");
  host.setAttribute("data-testid", "pdf-viewer-web-frame-pool");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    pointerEvents: "none",
  });
  document.body.appendChild(host);
  hiddenPoolHost = host;
  return host;
}

function evictUnusedFrames(reserveSlot = false): void {
  const now = Date.now();
  for (const entry of pooledFrames.values()) {
    if (entry.leases === 0 && now - entry.lastAccessAt > POOLED_PDF_FRAME_TTL_MS) {
      pooledFrames.delete(entry.uri);
      entry.iframe.src = "about:blank";
      entry.iframe.remove();
    }
  }
  const candidates = [...pooledFrames.values()]
    .filter((entry) => entry.leases === 0)
    .sort((left, right) => left.lastAccessAt - right.lastAccessAt);
  while (
    (reserveSlot
      ? pooledFrames.size >= MAX_POOLED_PDF_FRAMES
      : pooledFrames.size > MAX_POOLED_PDF_FRAMES)
    && candidates.length > 0
  ) {
    const entry = candidates.shift();
    if (!entry) break;
    pooledFrames.delete(entry.uri);
    entry.iframe.src = "about:blank";
    entry.iframe.remove();
  }
}

function createEntry(uri: string): PooledPdfFrameEntry {
  evictUnusedFrames(true);
  const pooled = pooledFrames.size < MAX_POOLED_PDF_FRAMES;
  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.background = "#111111";
  const entry: PooledPdfFrameEntry = {
    uri,
    iframe,
    ready: false,
    leases: 0,
    lastAccessAt: Date.now(),
    loadListeners: new Set(),
    errorListeners: new Set(),
    pooled,
  };
  iframe.addEventListener("load", () => {
    entry.ready = true;
    for (const listener of entry.loadListeners) listener();
  });
  iframe.addEventListener("error", () => {
    for (const listener of entry.errorListeners) listener();
  });
  if (pooled) pooledFrames.set(uri, entry);
  return entry;
}

export function canPoolWebPdfFrame(uri: string): boolean {
  return (
    typeof document !== "undefined"
    && typeof HTMLIFrameElement !== "undefined"
    && String(uri || "").toLowerCase().startsWith("blob:")
  );
}

export function mountPooledWebPdfFrame(input: {
  container: HTMLElement;
  uri: string;
  title: string;
  renderInstanceKey: string;
  onLoad: () => void;
  onError: () => void;
}): PooledPdfFrameMount {
  if (!canPoolWebPdfFrame(input.uri)) {
    throw new Error("Only browser Blob PDF frames can enter the render pool.");
  }
  const existing = pooledFrames.get(input.uri);
  const entry = existing ?? createEntry(input.uri);
  entry.leases += 1;
  entry.lastAccessAt = Date.now();
  entry.loadListeners.add(input.onLoad);
  entry.errorListeners.add(input.onError);
  entry.iframe.title = input.title || "PDF";
  entry.iframe.dataset.renderKey = input.renderInstanceKey;
  entry.iframe.dataset.testid = "pdf-viewer-web-iframe";
  entry.iframe.removeAttribute("aria-hidden");
  entry.iframe.setAttribute("aria-busy", "true");
  input.container.appendChild(entry.iframe);
  if (!existing) entry.iframe.src = input.uri;
  const reusedReadyFrame = Boolean(existing?.ready);
  if (reusedReadyFrame) queueMicrotask(input.onLoad);

  let released = false;
  return {
    iframe: entry.iframe,
    reusedReadyFrame,
    release: () => {
      if (released) return;
      released = true;
      entry.loadListeners.delete(input.onLoad);
      entry.errorListeners.delete(input.onError);
      entry.leases = Math.max(0, entry.leases - 1);
      entry.lastAccessAt = Date.now();
      if (!entry.pooled) {
        entry.iframe.src = "about:blank";
        entry.iframe.remove();
        return;
      }
      if (entry.iframe.parentElement === input.container) {
        delete entry.iframe.dataset.testid;
        entry.iframe.setAttribute("aria-hidden", "true");
        ensureHiddenPoolHost().appendChild(entry.iframe);
      }
      evictUnusedFrames();
    },
  };
}

export function clearPooledWebPdfFrames(): void {
  for (const entry of pooledFrames.values()) {
    entry.iframe.src = "about:blank";
    entry.iframe.remove();
  }
  pooledFrames.clear();
  hiddenPoolHost?.remove();
  hiddenPoolHost = null;
}

export function __resetPooledWebPdfFramesForTests(): void {
  clearPooledWebPdfFrames();
}
