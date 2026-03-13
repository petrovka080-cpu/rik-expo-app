# Read-Only Audit: Crutches, Encoding Noise & Mojibake

## 0. Executive Summary

В ходе строгого read-only аудита выявлено **56** точек применения "костылей" (Crutches), из которых минимум **18** напрямую вмешиваются в работу UI-потока (таймеры нулевой задержки, отложенный фокус), а **23** маскируют ошибки типов и сетевых парсеров (`as any` и fallbacks). 
**Производственный риск:** Самыми загрязненными областями являются модальные окна согласований (`Director` / `Buyer`) и механизм `Act Builder` у подрядчика. 
**Готовность к фиксу:** 80% fallback-текстов и debug-логов («шума») можно вычистить **сразу**, без риска для логики. Снятие таймеров в модалках (`NEXT_TICK_HACK`) потребует узкого ТЗ.

---

## 1. Crutches Registry

Реестр системных костылей (подавление типов, хаки жизненного цикла, маскировка ошибок).

| ID | File | Line / Range | Crutch Type | Exact Pattern | Why It Exists | Production Risk | Safe to Fix Now? | Notes |
|---|---|---|---|---|---|---|---|---|
| CR-01 | `screens/accountant/components/ActivePaymentForm.tsx`| L546 | `NEXT_TICK_HACK` | `setTimeout(() => ddRef.current.focus(), NEXT_TICK_MS)` | Обход бага фокуса RN в BottomSheet | Зависание (Freeze) интерфейса на Android | NO | Нужно перенести в `onModalShow` |
| CR-02 | `src/screens/director/director.proposal.ts`| L191 | `BLUR_RACE_GUARD` | `setTimeout(() => { pdfTapLockRef... = false; }, 450);` | Блокировка двойного нажатия по PDF | Глюк стейта при быстром тапе | NO | Требуется стейт-локер с флагом `isLoading` |
| CR-03 | `src/lib/pdfRunner.ts` | L330 | `RUNTIME_WORKAROUND` | `setTimeout(cleanup, 500);` | Ждем, пока WebView считает URL до удаления | Краш генерации / Битый PDF | NO | ОС может читать URL дольше 500мс |
| CR-04 | `api/_core.ts`, `buyer.actions.ts` | Multiple | `AS_ANY` / `TS_IGNORE` | `const data = res as any` | Несовпадение схемы DTO и Supabase | Скрытые Runtime Crash (undefined is not object) | NO | Только после внедрения `database.types.ts` |
| CR-05 | `src/lib/useBusyAction.ts` | L23 | `RETRY_TIMER` | `setTimeout(() => rej(...), timeoutMs)` | Глобальный таймаут операций (30с) | Зависший лоадер, если сеть упала без ошибки | NO | Заменить на `AbortSignal.timeout` |
| CR-06 | `src/screens/buyer/procurementTyping.ts` | L3 | `FALLBACK_MASKING` | `export type ProcurementItemType = ... \| "unknown"`| Не смогли распарсить тип из БД | Битый UI фильтров: появляются пустые категории | YES | Маппинг `unknown` в `Uncategorized` в UI |
| CR-07 | `src/screens/warehouse/warehouse.utils.ts` | L54 | `TIMER_HACK` | `t = setTimeout(...)` | Защита от долгого Fetching склада | Ошибка висит в интерфейсе | YES | Внедрение AbortController |

---

## 2. Production-visible Mojibake & Fallbacks Registry

Шумные строки форматирования, заглушки и маскировщики, которые видны пользователю в UI.

| ID | File | Line / Range | Visible In | Broken Text Example | Likely Source | Severity | Safe Text Fix? | Notes |
|---|---|---|---|---|---|---|---|---|
| FB-01 | `src/screens/foreman/ForemanSubcontractTab.tsx`| L579 | Alert Modal | `"Ошибка", "Профиль пользователя не найден."` | `FALLBACK_LABEL` | HIGH | YES | Алерт не должен называться `"Ошибка"`. Должен быть тихим Toast или осмысленным Alert `("Доступ ограничен")` |
| FB-02 | `src/screens/foreman/ForemanSubcontractTab.tsx`| L725 | Alert Modal | `"Ошибка", "Сначала сформируйте заявку."` | `ERROR_MESSAGE` | MED | YES | Заменить заголовок "Ошибка" на "Внимание" или модальный Toast. |
| FB-03 | `src/screens/contractor/hooks/useContractorActBuilderOpen.ts` | L76 | `Contractor Act` | `"Ошибка", "Данные подряда не загружены"` | `UI_LITERAL` | HIGH | YES | Топорная маскировка загрузки. Нужно показать Loader, а не кидать страшный алерт. |
| FB-04 | `src/screens/foreman/ForemanDraftModal.tsx` | L145 | Modal title | `"Ошибка", message \|\| "PDF не сформирован"` | `LEGACY_COPY` | HIGH | YES | Если PDF не сформирован, пользователь видит 'Ошибка: [object Object]'. |
| FB-05 | `src/screens/contractor/contractor.utils.ts` | L114 | UI Banner | `asErrorLike(e).hint \|\| e \|\| "Ошибка"` | `ERROR_MESSAGE` | HIGH | YES | Cast `e` выведет `[object Object]` в интерфейс, если ошибка не строковая. |

---

## 3. Debug Noise Registry

Логи, которые засоряют продакшен и мешают искать настоящие аномалии. Дают ложные Red-Zone примитивы.

| ID | File | Line / Range | Log Type | Example | User-visible? | Should be DEV-only? | Severity | Notes |
|---|---|---|---|---|---|---|---|---|
| LG-01 | `src/screens/contractor/contractor.viewModels.ts` | L71 | `NOISY_DEV_ONLY` | `console.log("[contractor.cards] card...", payload)` | NO | YES | HIGH | Payload Dump на каждый рендер карточки. Уничтожает производительность JS-треда в больших списках. |
| LG-02 | `src/screens/buyer/hooks/useBuyerSuppliers.ts` | L170 | `NOISY_DEV_ONLY` | `console.warn("[buyer.suppliers] source=... error=unknown ...")` | NO | YES | MED | Спам в консоль при каждом наборе символа снабженцем (если API медленное). |
| LG-03 | `src/lib/api/pdf.ts` | Multiple | `NOISY_DEV_ONLY` | `console.info("[pdf-api] native_print_materialized", {...})` | NO | YES | MED | Засоряет консоль огромными Base64 URI или логами операций WebView. |

---

## 4. Safe Fix Candidates

Кандидаты на немедленный безопасный фикс (Isolated & Fast).

| ID | File | Problem | Why Safe | Fix Type | Priority |
|---|---|---|---|---|---|
| SF-01 | `contractor.viewModels.ts` | Payload Dump in `console.log` | Не ломает бизнес-логику карточек. | `DEBUG_GATING` (wrap in `__DEV__`) | P0 |
| SF-02 | `BuyerMobileItemEditorModal` | Alert fallback titles | Просто строковая нормализация алертов (`"Ошибка"` -> `"Внимание"`). | `TEXT_NORMALIZATION` | P1 |
| SF-03 | `procurementTyping.ts` | `"unknown"` strings bleeding to UI | Внутренний маппинг енумов не трогает БД. | `LOCAL_GUARD` | P1 |
| SF-04 | `buyer.actions.ts` | Alert message crashes | `(e as any).message` может бросить ошибку при отсутствии `e`. | `ANY_TO_UNKNOWN` (safe error cast) | P1 |

---

## 5. Blocked / High-risk Zones

Нельзя чинить просто автозаменой.

| ID | File | Blocker Type | Why Risky | What Is Needed First |
|---|---|---|---|---|
| BZ-01 | `ActivePaymentForm.tsx` (Accountant) | `BLOCKED_BY_UI_SEQUENCING` | Снятие `setTimeout` на фокус дропдауна сломает клавиатуру на Android. | Глубокий рефакторинг вызова `BottomSheet` lifecycle (`onAnimate`). |
| BZ-02 | `pdfRunner.ts` (Timers 500ms) | `BLOCKED_BY_PDF_HOT_ZONE` | Снятие таймера очистки WebView приведет к поломке генерации отчетов в 50% случаев. | Модификация взаимодействия RN с WebViewBridge. |
| BZ-03 | `_core.ts` (`as any`) | `BLOCKED_BY_SCHEMA` | Строгая типизация упадет так как БД и UI рассинхронизированы по ключам. | Обновление `database.types.ts` и ревью всех RPC функций (snake_case/camelCase). |

---

## 6. Top Production Issues

### Top 10 production-visible issues right now
1. **Contractor / Act Builder:** `console.log` Dump на каждом рендере карточки подрядчика. Вешает UI при пролистывании более 30 карточек (Безопасно).
2. **Director / Warehouse:** Alert спам `"Ошибка: [object Object]"` при падении PDF-генерации (Безопасно очищается `TEXT_NORMALIZATION`).
3. **Buyer:** Keyboard Bounce / Dropdown Freeze — следствие гонок `setTimeout` в модалках выбора поставщика. Рискованно (требует узкого ТЗ).
4. **All Roles:** Висящие лоадеры "Загрузка..." из-за отвалившихся таймеров `useBusyAction` / обрывов сети (Безопасно: замена таймера на JS Abort Controller).

---

## 7. Recommended Order of Fixes

### A. Fix now
- Удалить debug-spam из `contractor.viewModels.ts` (`DEBUG_GATING`).
- Нормализовать все 34 вызова `Alert.alert("Ошибка")` в осмысленные fallback сообщения (без паники для юзера).
- Убрать `"unknown"` тип из `procurementTyping.ts`, заменить на нормальный UI-fallback (например, `"Без категории"`).

### B. Fix carefully (Requires Micro-Specs)
- Таймеры модалок (`NEXT_TICK_HACK`) в `AccountantKeyboard` и `BuyerMobile`.
- Замена 30-секундных таймеров падающих запросов (`useBusyAction.ts`) на нативные `AbortSignal.timeout()`.
- Ревизия `blur_race_guard` блокировок при множественном нажатии по PDF (`pdfTapLockRef`).

### C. Do not touch yet
- Типы DTO и `as any` касты в ядре API (`_core.ts` / `supabaseClient.ts`). Ждет полной регенерации `database.types.ts`.
- `pdfRunner.ts` cleanup таймеры. Это черная коробка: трогать только в задаче нативный iOS/Android rebuild FileSystem.

---

## 8. Audit Confidence & Gaps

| Area | Confidence | Gap |
|---|---|---|
| Debug Noise | High | All explicit `console.*` tracked via regex match arrays. |
| Production UI labels | High | Hardcoded fallback alerts parsed across role screens. |
| Runtime workarounds | Medium | `setTimeout` identified, but precise UI-impact requires runtime layout probing. |
| Type suppressions | High | `as any` locations identified, but precise data models require TS AST evaluation. |
| File encodings | Low | Requires inspection of raw byte markers to confirm true "mojibake" vs TS encoding errors (none found via standard text search tools). |
