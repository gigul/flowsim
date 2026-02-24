# FlowSim

Симулятор бизнес-процессов на основе дискретно-событийного моделирования (DES).

## Технологический стек

| Компонент | Технологии |
|-----------|------------|
| Monorepo | Turborepo, npm workspaces |
| Sim-engine | TypeScript (mulberry32 RNG, min-heap очередь событий) |
| API | Fastify 5, Drizzle ORM, SQLite (better-sqlite3), worker threads |
| Web | Next.js 14, React Flow, Zustand, Recharts, Tailwind CSS |
| Shared | Zod-схемы, типы API, константы |

## Быстрый старт

Требования: Node.js >= 20.

```bash
# Установка зависимостей
npm install

# Сборка всех пакетов
npm run build

# Запуск в режиме разработки (API на :3001, Web на :3000)
npm run dev
```

## Шаблоны

В директории `templates/` доступны 5 готовых моделей:

| Файл | Описание |
|------|----------|
| `warehouse.json` | Склад -- приёмка и отгрузка товаров |
| `delivery.json` | Доставка заказов |
| `coffee-shop.json` | Кофейня -- обслуживание клиентов |
| `workshop.json` | Мини-цех -- производственный процесс |
| `call-center.json` | Колл-центр -- обработка входящих звонков |

## Тестирование

```bash
# Unit-тесты (Vitest)
npm run test

# E2E-тесты (Playwright)
npm run test:e2e
```

## Структура проекта

```
flowsim/
  packages/
    sim-engine/    — DES-движок на чистом TypeScript
    shared/        — Zod-схемы, типы, константы
  apps/
    api/           — REST API (Fastify + SQLite)
    web/           — Веб-интерфейс (Next.js 14)
  templates/       — Готовые JSON-шаблоны моделей
```

## Возможности

- Визуальный редактор моделей на базе React Flow (drag-and-drop, соединение узлов)
- DES-движок с детерминированным ГПСЧ (mulberry32) для воспроизводимых результатов
- 5 статистических распределений для параметров узлов
- 4 типа узлов: источник, обработка, решение, сток
- Обнаружение узких мест (bottleneck detection)
- Сравнение сценариев (side-by-side)
- Экспорт и импорт моделей в формате JSON
- Undo/Redo в редакторе
- Визуализация результатов симуляции (Recharts)
