export type DirectorLifecycleDeps = {
  dirTab: string;
  requestTab: string;
  finFrom: string | null;
  finTo: string | null;
  repFrom: string | null;
  repTo: string | null;
  isScreenFocused: boolean;
  fetchRows: (force?: boolean) => Promise<void>;
  fetchProps: (force?: boolean) => Promise<void>;
  fetchFinance: () => Promise<void>;
  fetchReport: () => Promise<void>;
  showRtToast: (title?: string, body?: string) => void;
};

export type DirectorLifecycleScopeSnapshot = Pick<
  DirectorLifecycleDeps,
  "dirTab" | "requestTab" | "finFrom" | "finTo" | "repFrom" | "repTo"
>;

export type DirectorLifecycleRefreshHandler = (reason: string, force?: boolean) => Promise<void> | void;
