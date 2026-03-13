# RIK Platform: Scalability Blockers Audit (Read-Only)

## Executive Summary
Аудит выявил **5 критических зон**, физически блокирующих масштабирование платформы (увеличение числа ролей, отчетов, объема данных и пользователей). 
Текущая архитектура строится на физическом дублировании файлов (Copy-Paste) для новых ролей, прямых вызовах БД из компонентов UI (`UI_TO_DB`) и ручной склейке строк для PDF в главном JS-треде. Отсутствие глобального кэша приводит к дублированию десятков `fetch` запросов (каталога и профиля) при каждой смене вкладки, что экспоненциально нагрузит PostgreSQL при росте базы пользователей. Скрытие несоответствий DTO (через `as any` и мутирующие скрипты) делает невозможным безопасное расширение схемы данных.

---

## Confirmed Blockers

### A. Role Duplication (Дублирование ролевых потоков)
Добавление новой роли требует клонирования файлов от 500 до 1500 строк.

| Domain | Files | Duplicate Scope | Risk | Safe First Extraction |
|---|---|---|---|---|
| **Subcontracts** | `ForemanSubcontractTab.tsx`<br>`BuyerSubcontractTab.tsx`<br>`AccountantSubcontractTab.tsx` | Карточки, стейты загрузки, обработчики статусов, получение списка заявок | Баги правятся только в одной роли, остальные рассинхронизируются | Вынести `SubcontractItemCard` в `src/components/shared/` |
| **PDF Signatures** | `warehouse.tsx`<br>`director.helpers.ts` | Логика формирования подписей (Signatures) акта | Расхождение бизнес-логики подписи отчетов | Создать независимый UI/PDF билдер подписей |
| **Catalog Modals**| `warehouse.tsx`<br>`Foreman/CatalogModal.tsx` | UI поиска, выделения элементов и модального окна | Рост тех.долга UI-кита | `SharedCatalogPickerModal` |

### B. UI ↔ DB Coupling (Жесткое сцепление UI и БД)
Компоненты содержат внутри себя названия таблиц и SQL-процедур.

| File | Layer Violation | Exact Call | Why It Blocks Scale | Suggested Service Target |
|---|---|---|---|---|
| `app/(tabs)/warehouse.tsx` | `UI_TO_DB` | `supabase.from('inventory')` | Переименование колонки базы сломает весь рендер страницы Склада | `InventoryService.fetchItems()` |
| `src/screens/buyer/buyer.actions.ts`| `HOOK_TO_DB` | `supabase.rpc('get_proposals')` | Действия Buyer 100% завязаны на названия процедур БД | `BuyerApiService.getProposals()` |
| `src/components/foreman/CatalogModal.tsx`| `UI_TO_DB` | `supabase.rpc(...)` | Модалка сама стягивает данные БД. Нельзя переиспользовать с mock-данными | Передавать `items` как props от родителя |
| `src/screens/director/DirectorDashboard.tsx`| `UI_TO_DB` | `supabase.rpc('director_metrics')`| Графики неотделимы от конкретного RPC вызова | `MetricsService.getDirectorSummary()` |

### C. Type Hiding (Скрытие несовпадений типов)
Полная потеря типобезопасности из-за маскировок DTO.

| File | Pattern | Count / Locations | Scale Risk | Safe Now? |
|---|---|---|---|---|
| `src/lib/api/_core.ts` | `as any` | Multiple (`unwrap` functions) | Скрытый Runtime crash при росте полей БД | YES (Require `supabase gen types`) |
| `fix-ts-ignore.js` / `fix-ts.js` | Mutation Scripts | Root (`package.json` hooks) | Модификация кода перед 빌дом. IDE и Prod видят разные контракты | YES (Delete scripts) |
| `director.metrics.ts` | `as any` | Multiple (DTO casting) | Отваливание графиков без предупреждения компилятора | YES (Explicit DTO Interface) |
| `ForemanSubcontractTab.tsx` | `as unknown as` | 1-3 (Data mapping) | Потеря вложенных JSON-объектов | YES (Zod Validation Runtime) |

### D. PDF Scalability Hot Zone (Узкое горлышко отчетов)
Генерация документов завязана на конкатенацию гигантских строк в JS.

| File | Pattern | Why It Blocks Scale | Safe First Step | Blocked? |
|---|---|---|---|---|
| `src/lib/pdfRunner.ts` | Giant HTML string builders | JS String Limit (~20-50MB). Hermes падает с OOM при росте Data-таблиц отчета | Удалить `base64: true` из expo-print | YES (requires React `renderToString`) |
| `src/lib/api/pdf.ts` | JS Main thread allocation | Блокирует UI (зависает приложение) на время формирования строки (до ~10 сек) | Перенос HTML-сборки в Web Worker / Background тред | NO |
| `src/lib/fileSystemPaths.ts` | File lifecycle coupling | `cacheDirectory` растет бесконечно с каждым отчетом (1GB+ мусора) | Добавить `FileSystem.deleteAsync` для старых PDF | NO |

### E. Global Fetch Duplication / Missing Cache (Дублирование сети)
Повторные запросы глобальных справочников при каждом монтировании.

| Data Domain | Files | Duplicate Fetch Points | Current Local State Pattern | Best Cache Candidate |
|---|---|---|---|---|
| **Catalog** | `warehouse.tsx`, `CatalogModal.tsx`, `CatalogSearchModal.tsx` | 3 independent fetchers | `useState<CatalogItem[]>` + `useEffect` | `React Query` (`useCatalogQuery`) |
| **Profile/Auth** | `app/(tabs)/*` | Tab mounts (4-5 fetchers) | `useRole` hook makes internal DB calls | `Context` / `Zustand` (Global User Store) |
| **Suppliers** | `BuyerSubcontractTab.tsx`, `useBuyerSuppliers.ts` | 2+ fetchers | Empty dependency Array `[]` | `React Query` (`useSuppliersList`) |

---

## Safe Fix Candidates (Можно чинить сразу без смены бизнес-логики)
- Удалить `fix-*.js` мутирующие скрипты из пайплайна (восстановит прозрачность Typescript).
- Написать Garbage Collector для очистки PDF из `cacheDirectory`.
- Удалить `base64: true` из генератора PDF (уберет падения Hermes `Address size fault`).
- Заменить `as any` в слое `api/_core.ts`, опираясь на DTO из `database.types.ts`.
- Внедрить `AbortController` в поисковых строках и фильтрах склада (защита от Stale-response).

## Phase-only Fixes (Требуют пошагового рефакторинга)
- **Phase 1:** Выделение Service Layer (`src/services/`). Перенос всех вызовов `supabase.from`/`rpc` из `.tsx` компонентов.
- **Phase 2:** Создание `SharedSubcontractList.tsx` с параметром `role="Buyer" | "Foreman"`, удаление дублей.
- **Phase 3:** Внедрение `React Query` для кэширования Каталога и Профиля (избавление от N+1 запросов при рендере вкладок).

## Blocked Zones (Не трогать до выполнения других задач)
- Использование `expo-file-system/legacy` в PDF заблокировано необходимостью собрать нативный билд EAS (`eas build -p ios`) для Expo SDK 54. ОТА-апдейтом (JavaScript) эту дыру в нативном мосту не починить.
- Строгий `interface` для `director.metrics.ts` заблокирован генерацией типов БД. Пока не запустят `supabase gen types` — типизировать нельзя.
- Переписывание HTML string-builder'ов PDF заблокировано текущим ограничением Expo Print. Требуется внедрить `react-dom/server` как промежуточный слой.

## Recommended Fix Order
*План разблокировки масштабирования:*

1. **RELEASE-BLOCKERS (P0):** 
   - Выпускаем iOS EAS Buid (SDK 54).
   - Удаляем из PDF возврат `base64`.
   - Удаляем все `fix-*.js` скрипты-мутаторы.
2. **DTO & TYPINGS STABILIZATION (P1):** 
   - Генерация единого `database.types.ts`.
   - Выжигание `as any` из ядра к БД (`_core.ts`).
3. **CACHING & STATE (P2):** 
   - Защита `useEffect`-ов от перезапросов (AbortControllers, Debounce).
   - Устранение двойных `fetch` Каталога и Профиля.
4. **DECOUPLING & DEDUP (P3):** 
   - Вынос `supabase` процедур в Слой Сервисов (Service Layer).
   - Объединение дублируемых Ролевых интерфейсов (Subcontracts, CatalogPickers).
