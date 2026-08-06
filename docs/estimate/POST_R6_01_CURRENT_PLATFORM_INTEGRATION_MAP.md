# POST-R6-01 current platform integration map

Base SHA: `9b39f3e9c7b8d24d6f86b288c8ff3f0e21082f22`

This map was produced before the first implementation/schema change. POST-R6-01 extends the
existing modular-monolith V4 estimate path; it does not introduce another catalog, estimate
engine, persistence stack, or revision type.

| Required seam | Current owner | Decision | POST-R6-01 boundary |
|---|---|---|---|
| Catalog identity / 11,610 denominator | `catalogProfessionalCoverageLedgerV4.ts`; tracked 10,000 manifest + 1,610 expanded templates | EXTEND_ADDITIVELY | Resolution records retain every existing catalog ID and coverage state. |
| Road/asphalt inventory | `roadworks/roadworksWaveA.ts` | ADAPT_WITH_COMPATIBILITY_LAYER | Derive the denominator from catalog data and resolve its 35 IDs through eight canonical owners. |
| Formula and resource compilation | `roadworksWaveA.ts`; existing V4 asphalt compilers | EXTEND_ADDITIVELY | Versioned archetype/formula references; no second calculation engine. |
| Scope interpretation | `asphalt/roadScopeTruthV4.ts`; `roadworksWaveAProductionBinding.ts` | EXTEND_ADDITIVELY | Add the four professional presets and require clarification for an unspecified asphalt scope. |
| Parameter schemas | V4 asphalt/work-specific schemas | EXTEND_ADDITIVELY | Typed P0/P1/P2 definitions are registry metadata consumed by the same compiler. |
| Normative sources | `roadworksWaveASemanticTruth.ts` | MIGRATE_VERSIONED | Immutable source descriptors, status/license/currentness, hashes and A/B parser reconciliation. |
| Composite ownership / deduplication | `asphalt/roadCompositeOwnershipV4.ts` | REUSE_AS_IS | Foundation exposes ownership keys and rejects duplicate quantity ownership. |
| Revision persistence | `estimateDraftRevisionContract`, `createEstimateDraftRevision`, revision store | ADAPT_WITH_COMPATIBILITY_LAYER | Frozen resolved-profile snapshot is payload metadata; old revisions are replayed unchanged. |
| UI/PDF/procurement | existing estimate draft/revision projections | ADAPT_WITH_COMPATIBILITY_LAYER | All projections receive the same immutable resolved profile and BOQ row identities. |
| Evidence control plane | R6 artifact manifest/hydration/run-scoped producers | REUSE_AS_IS | Any generated ledgers use canonical producer metadata and isolated run/worker paths. |

Storage policy: registries and deterministic contracts are tracked source; generated audit and
runner output remains run-scoped evidence. No generated artifact is read opportunistically.

