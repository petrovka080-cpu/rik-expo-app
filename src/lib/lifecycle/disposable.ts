export type Disposable = {
  dispose(): void | Promise<void>;
};

export const noopDisposable: Disposable = {
  dispose: () => undefined,
};

export function createOnceDisposable(dispose: () => void | Promise<void>): Disposable {
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return undefined;
      disposed = true;
      return dispose();
    },
  };
}

export async function disposeAll(disposables: readonly Disposable[]): Promise<void> {
  for (const disposable of disposables) {
    await disposable.dispose();
  }
}
