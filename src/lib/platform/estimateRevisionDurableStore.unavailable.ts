import {
  durableWriteFailure,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";

export class UnavailableEstimateRevisionDurableStore implements EstimateRevisionDurableStore {
  async readBundle(): Promise<RevisionBundle | null> {
    return null;
  }

  async writeBundleAtomically(): Promise<DurableWriteResult> {
    return durableWriteFailure(
      "STORAGE_UNAVAILABLE",
      "No transactional durable storage adapter is available on this runtime.",
      null,
    );
  }

  async recoverLastValid(): Promise<RevisionBundle | null> {
    return null;
  }

  async deleteOrphans(): Promise<void> {
    // There is no durable backend to clean.
  }

  async listKeys(): Promise<string[]> {
    return [];
  }
}
