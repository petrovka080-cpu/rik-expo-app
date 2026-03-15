# Отчет: Статус P0 "Blind-Write Hardening" и аудит `as any` (Финал)

## 1. Что было сделано и доказано (На примере `subcontracts.shared.ts`)

Мы провели глубокий анализ файла `subcontracts.shared.ts`, который исторически являлся одним из главных Hotspots по заглушкам типов (`as any` / `as never`) при записи данных в БД.

**Изначально:**
Бизнес-логика создания драфтов субподрядов (`.insert` и `.rpc`) была полностью ослеплена через касты `as any`, что скрывало несовпадение между локальным DTO и реальным интерфейсом БД:
`await supabase.rpc("subcontract_create_draft", payload as any);`

### Шаг 1: Сужение костыля (Narrowing the suppression)
Сначала мы убрали слепые `any` и привязали Payload к контрактам через `satisfies Partial<SubcontractInsert>`. Однако для RPC вызова выявился **структурный конфликт (structural mismatch)** между историческим `payload` и типами сгенерированной схемы `Database["public"]["Functions"]["subcontract_create_draft"]["Args"]` (разное количество и optional-поведене полей).
Был применен временный narrowed suppression: `as unknown as ...Args`.

### Шаг 2: Полное устранение Boundary Debt (Safe local adapter)
Затем был написан идеальный Production-Ready код. Вместо продавливания типов компилятору мы:
1. Выделили совместимый тип: `type SubcontractCreateDraftArgsCompat = SubcontractCreateDraftArgs & { p_contractor_inn?: string | null; }`.
2. Создали явный локальный маппер: `const payloadLegacy: SubcontractCreateDraftArgs = { ... }`.
3. Сконструировали строгие границы для таблиц (Boundaries): `SubcontractItemsTable` и `SubcontractItemsBoundary`.

## 2. Архитектурный вердикт по модулю

**Статус:** `subcontracts.shared.ts` полностью вылечен от Blind-Writes.

* **Direct insert paths:** 100% Type-Safe.
* **RPC paths:** 100% Type-Safe (входящие аргументы маппятся напрямую без супрессий).
* Костыль устранен полностью. TypeScript гарантирует, что всё, что попадет в БД, соответствует SQL-контракту.
* Fallback-поведение (устаревшие схемы без `contractor_inn`) сохранено.

То есть, это пример **идеального эталонного Boundary**, который мы выстроили между грязными UI стейтами и защищенным клиентом Supabase.

---

## 3. Общие выводы для остального проекта

Доказано, что костыли `as any` в слое API-вызовов вызваны не "глюками Supabase", а именно **Structural Mismatch** (несовпадением исторических интерфейсов с текущей структурой базы данных). 

Разработчикам было проще написать `as any`, чем сопоставить поля вручную, как мы сделали сейчас:

```ts
p_created_by: payload.p_created_by,
p_contractor_org: payload.p_contractor_org, // и т.д.
```

### Roadmap для остальных файлов:
По такой же схеме (локальный Typed Adapter + Boundary Interfaces) нужно вылечить оставшиеся Write-Hotspots (запись данных), в первую очередь:
1. `src/lib/catalog_api.ts` (Там живут тяжелые RPC вызовы `insert(rows as never)`).
2. `warehouse.api.repo.ts` и `warehouse.seed.ts` (Там прямые инсерты из UI).
3. `foreman.helpers.ts`.

---

## 4. Phase 2B: Shared Read Boundary Hardening (`rikQuickSearch()`)

Следующим узким batch был выполнен read-boundary pass по `rikQuickSearch()` в `src/lib/catalog_api.ts`.

**Изначально:**
shared reader опирался на weak parsing и inline row guessing:

```ts
const { data, error } = await supabase.rpc(fn as any, { ... } as any);
return data.map((r: any) => ({
  rik_code: r.rik_code || r.code,
  name_human: r.name_human || r.name || r.name_ru || r.item_name || r.rik_code,
  ...
}));
```

Это создавало слабую shared boundary между UI и БД:

* RPC и fallback semantics были смешаны в одном parsing block.
* Row-contract был не локализован.
* Возврат наружу зависел от ad-hoc guessing по полям.
* Shared reader продолжал размазывать weak assumptions по вызывающим экранам.

### Что было сделано

1. Введены локальные source-specific контракты:
   * `RikQuickSearchRpcRow`
   * `RikQuickSearchFallbackRow`
   * `RikQuickSearchItem`
2. Вынесены shape constants:
   * `RIK_QUICK_SEARCH_RPCS`
   * `RIK_QUICK_SEARCH_FALLBACK_FIELDS`
3. Вынесены parse/map helpers:
   * `parseRikQuickSearchRpcRow()`
   * `parseRikQuickSearchFallbackRow()`
   * `mapRikQuickSearchRpcRow()`
   * `mapRikQuickSearchFallbackRow()`
4. Убраны weak patterns:
   * `as any`
   * broad RPC cast
   * inline row guessing в теле `rikQuickSearch()`
   * смешанный parsing RPC/fallback без явной границы

### Архитектурный вердикт по batch

**Статус:** `rikQuickSearch()` больше не является weak shared-reader первого уровня.

* RPC path локализован и маппится через явный adapter.
* Fallback path локализован отдельно и парсится array-safe / null-safe.
* Внешний return shape для callers сохранен.
* Business semantics, search ordering и fallback order не изменялись.
* `npx tsc --noEmit` проходит без дополнительных suppressions.

Итог: shared search cluster перестал опираться на неявное угадывание row shape. После этого pass архитектурная цепочка выглядит как:

```text
UI
 -> repo / caller
 -> typed shared reader
 -> DB
```

а не как weak helper с неявным parsing между экраном и источником данных.

### Значение для Master-плана

Этот pass не завершает автоматически всю Phase 3 readiness, но снимает один из ключевых systemic risks в shared read layer.

Практически это означает:

* `catalog_api.ts` больше не содержит критичный weak shared-reader в точке `rikQuickSearch()`.
* Shared read layer вышел из "красной зоны" и перешел в состояние контролируемой стабилизации.
* Следующим шагом уже уместен короткий audit-pass по соседним shared readers, а не широкий рефактор.

---

## 5. Phase 2D: Write-Heavy Orchestration Hardening (`createProposalsBySupplier()`)

После triage remaining hotspots в `catalog_api.ts` следующим узким batch был взят `createProposalsBySupplier()` как последний write-heavy узел первого уровня в shared supply orchestration.

**Изначально:**
функция уже содержала часть typed payloads, но внутри оставались weak orchestration zones:

```ts
const created = await rpcProposalCreate();
proposalId = String(created);

const q = await supabase
  .from("proposals")
  .select("proposal_no,id_short,display_no,request_id")
  .eq("id", proposalId)
  .maybeSingle();

proposalNo =
  (q.data as any)?.proposal_no ??
  (q.data as any)?.display_no ??
  ...
```

Кроме этого, approval gate и `bucket.meta` все еще опирались на inline row guessing:

* `(qItemsData || []).map((r: any) => ...)`
* `(qReq.data || []).forEach((r: any) => ...)`
* `(row as any)?.price`
* `(row as any)?.supplier`
* `(row as any).note`

То есть write semantics были уже частично стабилизированы, но orchestration boundary еще оставался смешанным: typed writes соседствовали с ad-hoc parsing и broad shaping.

### Что было сделано

1. Head creation path переведен на более строгий typed источник:
   * вместо `proposalCreate() + refetch + broad cast`
   * используется `proposalCreateFull()` и локальный mapper head metadata
2. Локализованы contracts для внутренних read/write-support rows:
   * `RequestStatusLiteRow`
   * `ProposalHeadMetaRow`
   * `RequestItemForProposalRow`
   * `ProposalBucketMetaInput`
   * `ProposalSnapshotMetaRow`
3. Вынесены parse/map helpers:
   * `parseRequestStatusLiteRows()`
   * `parseRequestItemsForProposalRows()`
   * `parseProposalHeadMetaRow()`
   * `mapProposalHeadDisplay()`
   * `parseProposalBucketMetaInput()`
4. Убраны weak patterns внутри orchestration path:
   * `proposalCreate -> fetch -> (q.data as any)` metadata guessing
   * inline parsing request_items/request statuses через `any`
   * inline parsing `bucket.meta` через `row as any`

### Архитектурный вердикт по batch

**Статус:** `createProposalsBySupplier()` больше не выглядит как blind-shaping write orchestrator первого уровня.

* Proposal head metadata теперь приходит через локализованный typed path.
* Approval gate больше не зависит от ad-hoc row guessing.
* `bucket.meta` стабилизирован через локальный parse boundary.
* Insert / upsert / update semantics не менялись.
* Submit/fallback/status transition behavior сохранен.
* `npx tsc --noEmit` проходит.

Важно: этот pass **не означает**, что весь `catalog_api.ts` полностью оздоровлен. Он означает более точную вещь:

* самый крупный remaining write-heavy orchestration hotspot в этом модуле локально стабилизирован
* remediation-pattern для сложных mixed write/read-support функций теперь доказан и на orchestration слое

### Значение для Master-плана

После этого batch `catalog_api.ts` уже не держится на одном крупном blind-write orchestration hotspot.

Практически это означает:

* `subcontracts.shared.ts` подтвердил **Typed Write Boundary**
* `rikQuickSearch()` подтвердил **Typed Shared Read Boundary**
* `jobQueue.ts` подтвердил **Typed Infra Queue Boundary**
* `createProposalsBySupplier()` подтвердил **Typed Write Orchestration Boundary**

То есть remediation-подход уже доказан на нескольких разных архитектурных классах узлов без смены бизнес-логики.

Продолжаем двигаться в таком же доказательном и строгом русле? У нас есть эталонный модуль субподрядов.
