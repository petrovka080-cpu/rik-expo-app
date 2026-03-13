# Master Audit Report: RIK Platform System Crutches

## 1. Executive Summary

В результате глубокого (read-only) аудита всей кодовой базы RIK Platform были выявлены системные проблемы на всех архитектурных слоях. Технический долг вышел за рамки "PDF движка" и проник в пайплайн сборки, слой управления состоянием (React State) и связывание UI с сетью.

**Общий статус:** 🔴 КРИТИЧЕСКИЙ ДОЛГ (P0-P1)
**Основной риск:** Приложение работает только за счет постоянного подавления ошибок типов и ручного мутирования кода перед компиляцией. Масштабирование бизнес-логики (например, добавление новых ролей) приведет к экспоненциальному росту багов из-за жесткой связности UI, сети и "угадывания" контрактов БД.

## 2. Индекс Аудит-Отчетов по Категориям

Детальный анализ разделен на 5 суб-отчетов, доступных в этой же директории:

1. [Type Suppression & Type Safety (`audit-types-suppression.md`)](./audit-types-suppression.md)
   - Анализ `@ts-ignore`, `as any`, `as unknown as`.
2. [Build Hacks & Patch Scripts (`audit-build-hacks.md`)](./audit-build-hacks.md)
   - Разбор мутаторов исходного кода (`fix-*.js`) и пре-флайт скриптов.
3. [Architecture Smells & UI Coupling (`audit-architecture-smells.md`)](./audit-architecture-smells.md)
   - Анализ Layer violations, Giant files (>1000 строк) и дублирования логики ролей.
4. [State Management & React Anti-Patterns (`audit-state-hooks.md`)](./audit-state-hooks.md)
   - "Hook soup", проблемы гонок (stale-responses) и вложенные эффекты.
5. [Runtime, Memory & Platform Hacks (`audit-runtime-memory.md`)](./audit-runtime-memory.md)
   - Утечки кэша, костыли с `setTimeout`, platform-specific костыли.

## 3. Приоритетная Карта Снятия Костылей (Roadmap)

### Фаза 1: Остановка деградации (P0 - Critical) 
**Цель:** Сделать сборку и работу Typescript предсказуемой.
- Удалить ВСЕ `fix-*.js` скрипты из проекта.
- Настроить официальный инструмент типов `supabase gen types` и внедрить жесткие DTO (Data Transfer Objects).
- Запретить использование `any` и `as unknown as` на уровне ESLint для всех новых PR.
- Снять Platform Workarounds из `pdf.ts` путем правильного обновления Expo Native.

### Фаза 2: Отвязка UI от Сети (P1 - High)
**Цель:** Предотвратить загрузку UI потока сетевыми нюансами.
- Внедрить асинхронный State Manager (React Query / SWR / RTK Query).
- Вынести запросы к БД (`_core.ts`, `*.api.ts`) в изолированные Service-классы, не привязанные к React.
- Настроить AbortControllers для отмены "stale" сетевых запросов при размонтировании "толстых" компонентов.

### Фаза 3: Дроблении монолитных экранов (P2 - Medium)
**Цель:** Избавиться от файлов по 1000+ строк и дублирования ролей.
- Разделить `warehouse.tsx` и `ForemanSubcontractTab.tsx` на атомарные контейнеры.
- Устранить проп-дриллинг: вместо передачи `setItems` на 5 уровней вглубь использовать Context или Zustand.
- Вынести общие модальные окна и дропдауны (Catalog, Contractor Picker, Buyer Dropdowns) в Shared Components без примеси бизнес-логики.

### Фаза 4: Оптимизация памяти и Runtime (P3 - Enhancement)
**Цель:** Сделать приложение энергоэффективным и перестать течь по памяти.
- Внедрить стратегию очистки (Garbage Collection) для `cacheDirectory`, чтобы старые PDF-файлы удалялись автоматически.
- Очистить UI-логику от задержек: убрать `setTimeout` хаки из Lifecycle-методов и анимаций клавиатур.
- Переместить HTML-строковый билдер генератора актов из React-Main треда в Worker/Background процесс.

---
*См. детальные отчеты для построчного разбора проблем.*
