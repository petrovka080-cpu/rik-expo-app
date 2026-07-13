# ADR-002: AI Estimate Runtime Boundary

Status: accepted

Context:
Request, consumer repair, foreman, office PDF, and future procurement-facing flows need the same behavior: classify work, build a draft, expose a parameter passport, accept missing inputs, approve a revision, generate artifacts, and load approved history.

Decision:
`src/lib/estimate/runtime/createAiEstimateRuntime.ts` is the single public construction estimate facade. Product surfaces call runtime methods instead of importing formula, graph, revision, storage, PDF, or buyer package internals directly.

Required runtime operations:

- `createDraft`
- `classifyWork`
- `buildParameterPassport`
- `applyParameterOverride`
- `answerMissingInput`
- `approveRevision`
- `buildPdfSnapshot`
- `buildBuyerPackage`
- `loadApprovedHistory`
- `rebuildFromRevision`
- `validate`

Consequences:
The runtime may depend on domain/application code and ports. It must not import concrete browser/server adapters directly. Adapter selection belongs to application composition, tests, or platform bootstrap.
