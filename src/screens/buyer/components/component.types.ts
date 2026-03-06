export type StylesBag = Record<string, object | undefined>;

export type StateSetter<T> = (v: T | ((prev: T) => T)) => void;

