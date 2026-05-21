import {
  completeMediaUploadSession,
  queueMediaProcessingJob,
  type MediaBackendOperation,
  type MediaBackendTransport,
} from "../../../src/lib/media/services/mediaBackendUploadService";

describe("backend media complete upload contract", () => {
  it("completes uploads and queues processing via backend operations", async () => {
    const operations: string[] = [];
    const transport: MediaBackendTransport = {
      async call<TResult>(
        operation: MediaBackendOperation,
        _payload: Record<string, unknown>,
      ): Promise<TResult> {
        operations.push(operation);
        if (operation === "completeMediaUploadSession") {
          return {
            mediaAssetId: "media-1",
            queuedVariantJob: true,
            queuedAiAnalysisJob: true,
          } as TResult;
        }
        return { jobId: "job-1", status: "queued" } as TResult;
      },
    };

    const completed = await completeMediaUploadSession(transport, {
      uploadSessionId: "session-1",
      mimeType: "image/jpeg",
      byteSize: 1000,
      contentHash: "hash-1",
    });

    const job = await queueMediaProcessingJob(transport, {
      mediaAssetId: completed.mediaAssetId,
      jobType: "variant_generation",
    });

    expect(completed).toMatchObject({
      mediaAssetId: "media-1",
      queuedVariantJob: true,
      queuedAiAnalysisJob: true,
    });
    expect(job.status).toBe("queued");
    expect(operations).toEqual(["completeMediaUploadSession", "queueMediaProcessingJob"]);
  });
});
