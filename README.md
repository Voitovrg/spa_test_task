# SPA Test Task (Vue 3 + Vite + TypeScript)

## Розгорнута версія

- **Демо (Vercel)**: `https://spa-test-task-eight.vercel.app/`

## Короткий опис процесу розгортання

- Проєкт деплоїться на **Vercel** як статичний фронтенд (Vite build → `dist`).
- Для роботи **без локального бекенду** використовується мок-API на **Vercel Serverless Functions**:
  - `/api/projects`
  - `/api/tasksCRUD`
- У продакшені фронтенд за замовчуванням звертається до API за шляхом **`/api`** (тобто запити йдуть на той самий домен).

## Локальний запуск

### Варіант 1: тільки фронтенд (API на Vercel)

```bash
npm i
npm run dev
```

### Варіант 2: фронтенд + локальний json-server

1) Запустити мок-базу:

```bash
npm i
npm run server
```

2) Запустити фронтенд, вказавши base URL API:

```bash
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```
