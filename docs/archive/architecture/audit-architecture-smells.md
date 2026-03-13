# Audit: Architecture Smells, Giant Files & Duplication

**Criticallity: P1 (HIGH)**

Проект страдает от отсутствия строгой архитектурной границы (Layered Architecture). Слои получения данных (Data Layer), представления (UI Layer) и бизнес правил (Domain Layer) склеены в гигантских компонентах.

## 1. Категория: Layer Violations (Нарушение слоев)

**Описание проблемы:**
React Components (например `warehouse.tsx`, `Contractor Dashboard`) делают прямые RPC вызовы к БД Supabase:
`supabase.rpc('get_my_data', {...})` прямо внутри `useEffect`. 
Это нарушает SRP (Single Responsibility Principle). UI должен только отрисовывать данные, а не знать название SQL-процедуры.

**Roadmap устранения:**
Создать слой `/services` (например `warehouse.service.ts`), куда перенести весь код вызовов к БД. Экраны будут вызывать `await WarehouseService.getInventory()`.

## 2. Категория: Giant Files (Компоненты-Боги)

**Список файлов-гигантов:**
- `app/(tabs)/warehouse.tsx`
- `src/screens/foreman/ForemanSubcontractTab.tsx`
- `src/lib/pdfRunner.ts`
- Индексные файлы ролей (Buyer, Contractor)

**Описание проблемы:**
Размер файлов превышает 1000-1500 строк. Файл содержит объявление страниц, локальные компоненты, хуки, стили и функции расчета. Такое невозможно поддерживать — малейший фикс в отступах ломает расчет тоталов.

**Roadmap устранения:**
Extract Components (Декомпозиция). Разбить экраны на:
- `Page Container` (получает стейт)
- `Header/Metrics`
- `Listings`
- `Modals/Sheets`
Логику не меняем, просто выносим в отдельные файлы по принципу Colocation.

## 3. Категория: Duplicate Role Logic (Дублирование ролей)

**Описание проблемы:**
Логика "Subcontracts" (субподрядов) или "Инвентаризаций" физически скопирована (Copy-Paste) минимум трижды:
- В `AccountantSubcontractTab.tsx`
- В `ForemanSubcontractTab.tsx`
- В `BuyerSubcontractTab.tsx`
Если в БД добавят новый флаг (например `is_urgent`), его придется прописывать руками во всех вкладках.

**Roadmap устранения:**
Объединить логику в `SharedSubcontractList.tsx`. Передавать роль (`role="Foreman" | "Buyer"`) через пропсы, и на основе роли отключать или включать нужные кнопки (например: `canEditPrice={role === 'Accountant'}`).
