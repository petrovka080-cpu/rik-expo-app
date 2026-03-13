# RIK Platform: Engineering Inventory Registries

Инженерный реестр технического долга (read-only аудит). Ниже приведены точные таблицы локализации архитектурных аномалий, нарушений слоев и костылей типов, которые подлежат рефакторингу **без изменения бизнес-логики**.

---

## 1. Type Suppression Registry (Подавление Типов)
**Приоритет: P0** | **Суть:** Скрытие реальных несовпадений типов между БД и UI.

| File Path | Suppression Type | Context / Risk |
|---|---|---|
| `src/lib/api/_core.ts` | `as any` | Кастование сырых ответов Supabase RPC. При изменении схемы БД упадет в Runtime. |
| `src/lib/supabaseClient.ts` | `as any` | Игнорирование типов глобального клиента Supabase. |
| `src/screens/buyer/buyer.actions.ts` | `as any` | Приведение DTO поставщиков/заявок в обход интерфейсов. |
| `src/screens/director/director.metrics.ts` | `as any` | Маскировка отличий в ключах метрик (camelCase vs snake_case). |
| `src/lib/api/director_reports.ts` | `@ts-ignore` | Игнорирование несовпадения DTO отчета базы данных и пропсов графика. |
| `src/screens/director/director.reports.ts` | `@ts-ignore` | Проброс null/undefined в компоненты, ожидающие строгую типизацию. |
| `src/components/map/MapScreen.tsx` | `@ts-ignore` | Игнорирование пропсов нативных карт Yandex/Google/Expo. |
| `src/components/SingleDatePickerSheet.tsx`| `@ts-ignore` | Подавление ошибок дат (string vs Date object). |
| `src/components/PeriodPickerSheet.tsx` | `@ts-ignore` | Кастование `null` в качестве валидной даты. |
| `src/dev/_debugStyleTrap.web.ts` | `@ts-ignore` | Web-only хак стилей. |
| `src/screens/foreman/ForemanSubcontractTab.tsx`| `as unknown as` | Двойное кастование типов при маппинге данных с сервера. |
| `src/lib/pdfRunner.ts` | `as any` | Подавление ошибок типов при передаче конфигураций HTML/WebView. |

---

## 2. Build-Mutation & Patch Scripts Registry
**Приоритет: P0** | **Суть:** Скрипты, переписывающие исходный код перед сборкой (Regex Patching).

| Script File | Action | System Impact |
|---|---|---|
| `fix-ts-ignore.js` | Auto-injection `// @ts-ignore` | Автоматически глушит ошибки компиляции перед EAS Build. Скрытые баги. |
| `fix-ts-hard.js`, `fix-ts.js` | Force type stripping | Грубое удаление или подмена строгих типов на `any`. Ломает статанализ. |
| `auto-ignore.js` | Bulk ignore injector | Маппит красные файлы TSC и ставит в них игноры. |
| `fix-accountant-cast.js` | Mutates Data Layer | Переписывает приведение типов (cast) на лету для роли Бухгалтера. |
| `fix-syntax.js` | Regex Code replacer | Решает конфликты парсера через строки, а не AST-дерево. |
| `fix-rik-api.js` | API Endpoint mutator | Заменяет импорты или вызовы внутри `src/lib/api`. |
| `scripts/fix-web-dom.js` | Web DOM Patching | Пытается адаптировать Native элементы к DOM (div, span) грубой заменой. |
| `scripts/fix-foreman-before-styles.js`| UI Lifecycle mutation | Хак для перестановки стилей до рендера у Прораба. |
| `db_idempotency_audit_v1.js` | DB Schema checking (Preflight) | Анализирует и, возможно, патчит DDL/типы БД перед запуском. |

---

## 3. Layer Violations Registry (Нарушение Архитектурных Слоев)
**Приоритет: P1** | **Суть:** Файлы смешивают в себе логику хранения, запросов к БД и рендеринг.

| File Path | Violation Type | Description |
|---|---|---|
| `app/(tabs)/warehouse.tsx` | **UI_TO_DB** | Напрямую вызывает `supabase.rpc` внутри эффектов компонента. Нет Service Layer. |
| `src/screens/buyer/BuyerSubcontractTab.tsx`| **UI_TO_DB** | Прямые селекты к таблицам субподрядов прямо внутри рендер-цикла. |
| `app/pdf-viewer.tsx` | **UI_TO_FS** | Компонент WebView (UI) напрямую читает FileSystem (`localUri`) без абстракции. |
| `src/screens/contractor/useContractorPdfActions.ts` | **HOOK_TO_FS** | Хук UI-состояния управляет записью и удалением физических файлов (FileSystem). |
| `src/lib/pdfRunner.ts` | **SERVICE_TO_UI** | Сервисный класс жестко сцеплен с разметкой (HTML String), стилями и отображением. |
| `src/screens/director/DirectorDashboard.tsx`| **UI_TO_DB** | Вызовы методов метрик БД из компонента дашборда. |
| `src/components/foreman/CatalogModal.tsx` | **UI_TO_DB** | Модальное окно самостоятельно делает Fetch каталога. |

---

## 4. Giant Files Registry (Fat Components)
**Приоритет: P1** | **Суть:** Файлы, перегруженные ответственностью (LOC > 800-1500).

| File Path | Estimated LOC | Responsibilities |
|---|---|---|
| `app/(tabs)/warehouse.tsx` | > 1500 | Запросы склада, фильтрация, стейт корзины, UI карточек, модалки подтверждений, логика PDF. |
| `src/screens/foreman/ForemanSubcontractTab.tsx`| > 1000 | Табы субподрядов, работа со сметами, стейт загрузки, инпуты, обработка RPC. |
| `src/lib/api/pdf.ts` | > 800 | HTML шаблоны, FileSystem API (Legacy/New), Base64 конвертеры, Error boundaries. |
| `src/components/map/MapScreen.tsx` | > 800 | Рендеринг SDK Карты, кластеризация пикселей, стейт модалок BottomSheet. |
| `src/screens/director/DirectorReportsModal.tsx`| > 700 | Запросы отчетов, графики, таблицы, фильтры по датам, стейт попапов. |

---

## 5. Duplicate Logic Registry (Дублирование Контрактов)
**Приоритет: P2** | **Суть:** Copy-Paste логика, которая усложняет поддержку.

| Domain | Cloned Files | Maintenance Risk |
|---|---|---|
| **Subcontracts (Субподряды)** | `ForemanSubcontractTab` <br> `BuyerSubcontractTab` <br> `AccountantSubcontractTab` | Три независимых реализации одного бизнес-процесса. Изменение статуса сделки придется кодить трижды. |
| **Catalog Fetching** | `warehouse.tsx` <br> `CatalogModal.tsx` (Foreman) <br> `CatalogSearchModal.tsx` | Каталог товаров запрашивается и кэшируется (в useState) отдельно в каждой куче компонентов. |
| **PDF Signatures** | `director.helpers.ts` <br> `pdfRunner.ts` | Разная логика формирования подвала документа для директора и склада. |
| **Network Retries** | `queueWorker.ts` <br> `contractor.issuedPolling.ts` | Разные самописные механизмы повтора плохих запросов без использования единого клиента (React Query). |

---

## 6. Async & State Risks Registry (Риски Runtime/Гонки)
**Приоритет: P1** | **Суть:** Потенциальные утечки памяти и зависания UI.

| Component / File | Risk Type | Description |
|---|---|---|
| `src/screens/warehouse/hooks/useDebouncedValue.ts` | **Stale-Response** | Задержка ввода отрабатывает, но нет отмены предыдущего Fetch. Быстрый набор текста вызовет наложение старых ответов от сервера на новые. |
| `BuyerMobileItemEditorModal` | **Unmounted Update** | Вызывает `setPrice` после асинхронного `update` от Supabase, без проверки `isMounted`. |
| `src/lib/fileSystemPaths.ts` | **Storage Leak** | Отсутствует механизм `FileSystem.deleteAsync()` для старых PDF (рост CacheDirectory). |
| `src/screens/accountant/useAccountantKeyboard.ts`| **Timer Leak** | Использование `setTimeout` для обхода багов клавиатуры без `clearTimeout` при анмаунте. |
| `app/(tabs)/*` | **Double Fetch / Waterfall** | Вкладки монтируются одновременно (Expo Router), вызывая 5-10 параллельных дублирующих запросов к `Users` / `Profile`. |

---

## 7. Top-25 Remediation Backlog (Roadmap)

Ниже представлен **единый беклог задач** (от критичных к минорным), которые можно давать агенту/разработчику для исправления **без изменения бизнес-логики**.

### 🔴 Phase 1: P0 (CRITICAL) - Угроза компиляции и крашей
1. `[Fix]` Выпустить нативный билд (EAS iOS/Android) с Expo SDK 54 для нативного разрешения крашей WebView (SIGABRT).
2. `[Remove]` Удалить `fix-ts-ignore.js`, `fix-ts-hard.js`, `fix-syntax.js` из pre-build и post-install хуков.
3. `[Remove]` Удалить `auto-ignore.js`, `fix-accountant-cast.js` и `fix-rik-api.js` из пайплайна сборки.
4. `[Refactor]` Сгенерировать Typescript DTO контракты через `supabase gen types` и сохранить в коде (`database.types.ts`).
5. `[Refactor]` Удалить `as any` и `as unknown as` в файлах API (`_core.ts`, `supabaseClient.ts`, `director.metrics.ts`).
6. `[Refactor]` Снять `@ts-ignore` c компонентов-модалок (DatePickers) и типизировать их через `interface Props`.
7. `[Fix]` Изолировать логику `FileSystemModule.copyAsync` и `File.copy` в единый адаптер (вместо ручной склейки Legacy в `pdf.ts`).

### 🟠 Phase 2: P1 (HIGH) - Стабилизация состояний и сети
8. `[Architecture]` Создать слой `/services` (например `SupabaseApiService`). Перенести все вызовы `supabase.rpc()` из UI.
9. `[State]` Внедрить `AbortController` (Отмену запросов) во все `useEffect` которые делают data-fetching.
10. `[State]` Переписать гонки компонентов склада (`stale-response` risk). Возвращать только последний запрошенный результат (Ignore stale promises).
11. `[Decompose]` Вынести логику Local State из `warehouse.tsx` (>1500 LOC) в кастомный хук `useWarehouseController`.
12. `[Decompose]` Вынести UI Карточки Склада из `warehouse.tsx` в отдельные файлы (`WarehouseItemCard.tsx`).
13. `[Decompose]` Декомпозировать `ForemanSubcontractTab.tsx` на атомарные списки без выноса логики в другие домены.
14. `[Storage]` Скрипт-Garbage Collector: Написать функцию очистки `FileSystem.cacheDirectory` от файлов pdf старше 3-х дней при запуске App.
15. `[State]` Убрать `setTimeout` в `AccountantKeyboard` и `BuyerMobileItemEditor`, заменить на безопасные InteractionManager / Keyboard API.

### 🟡 Phase 3: P2 (MEDIUM) - Дедупликация и UI слои
16. `[Refactor]` Объединить `ForemanSubcontractTab`, `BuyerSubcontractTab` и `AccountantSubcontractTab` в единый shared-компонент, параметризованный Ролью.
17. `[Refactor]` Создать единый Data Handler для Каталога (CatalogFetcher), чтобы убрать дублирование вызовов каталога из 4-х разных модалок.
18. `[Refactor]` Вынести генерацию строк (HTML Builder) из `pdfRunner.ts` в изолированные функции-генераторы (Шаблонизаторы).
19. `[Fix]` Ограничить проп-дриллинг: перестать передавать функции `setIsOpen` на 5 уровней вглубь дерева UI.
20. `[Memory]` Устранить "Double Fetch" стейта профиля при старте приложения (Expo Router tab mounts). Закешировать глобальный Profile Info в Context.
21. `[Refactor]` Снять `as any` из обработчиков Yandex/Map SDK в `MapScreen.tsx`.
22. `[Build]` Удалить скрипты `fix-web-dom.js` и настроить платформозависимые файлы (Platform Extensions `.web.tsx`).
23. `[Fix]` Заменить жестко закодированные идентификаторы (например `id === 13`) в `director.helpers` на Enum-роли.
24. `[Refactor]` Изолировать логику Job Queue (`queueWorker.ts`) от UI треда React.
25. `[Fix]` Убрать подавление ошибок (TS Error suppressions) в файлах метрик Директора.
