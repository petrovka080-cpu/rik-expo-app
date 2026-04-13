export type SerializedQueuePersistence = {
  run: <T>(operation: () => Promise<T>) => Promise<T>;
  reset: () => void;
};

export const createSerializedQueuePersistence = (): SerializedQueuePersistence => {
  let tail: Promise<void> = Promise.resolve();

  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      const current = tail.catch(() => undefined).then(operation);
      tail = current.then(
        () => undefined,
        () => undefined,
      );
      return current;
    },
    reset() {
      tail = Promise.resolve();
    },
  };
};
