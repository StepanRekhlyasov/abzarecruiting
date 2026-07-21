# Abza Recruiting

Платформа для вакансий, профилей кандидатов и резюме (CV).  
Стек: **ASP.NET Core** (backend) + **React / TypeScript / Vite** (frontend) + **MySQL 8**.

## Содержание

- [Требования](#требования)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Переменные окружения](#переменные-окружения)
- [Локальный запуск без Docker](#локальный-запуск-без-docker)
- [Полезные URL](#полезные-url)
- [Архитектура](#архитектура)
- [Работа с проектом](#работа-с-проектом)
- [Сидерские данные](#сидерские-данные)
- [Миграции](#миграции)
- [Типичные проблемы](#типичные-проблемы)

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Compose v2)
- Для локальной разработки без Docker:
  - .NET SDK **10**
  - Node.js **22+** и [pnpm](https://pnpm.io/) (`corepack enable`)
  - MySQL **8**

## Быстрый старт (Docker)

1. Клонируйте репозиторий и перейдите в корень проекта.

2. Создайте `backend/.env` из примера:

```bash
cp backend/.env.example backend/.env
```
3. Запуск:

```bash
docker compose up --build
```

Для авто-пересборки backend при изменении кода (рекомендуется в dev):

```bash
docker compose watch
# или
docker compose up --build --watch
```

## Работа с проектом

### Frontend

```bash
cd frontend
pnpm install
pnpm dev          # dev-сервер
pnpm build        # production build
pnpm lint         # oxlint
```

Структура по FSD: импорты через алиасы `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared`.

### Backend

```bash
cd backend
dotnet build Backend.Api.csproj
dotnet watch run --project Backend.Api.csproj
```

После изменений C# в Docker **без** volume на исходники нужен rebuild:

```bash
docker compose up -d --build backend
```

или `docker compose watch`.

### Типовой сценарий проверки

1. Войти рекрутером → дашборд, вакансии, CV.  
2. Войти кандидатом → профиль, проекты, создание CV на вакансию, публикация.  
3. Админ → управление пользователями, атрибутами, вакансиями.

## Сидерские данные

Сиды выполняются при каждом старте API (идемпотентно: существующие записи обновляются / дополняются).

Порядок (`DatabaseSeeder`):

1. Миграции  
2. Роли Identity  
3. `AttributeSeeder` — системные (default) атрибуты + Admin  
4. `UserSeeder` — демо-пользователи  
5. `MockDataSeeder` — атрибуты/теги/вакансии/проекты/сообщения/резюме/лайки  
6. Rebuild Lucene  

### Роли и пароль демо-пользователей

**Пароль всех сидерских пользователей:** `1`

| Email | Имя | Роль |
| --- | --- | --- |
| `user-1@fexpost.com` | Anna Ivanova | Candidate |
| `user-2@fexpost.com` | Boris Petrov | Candidate |
| `user-3@fexpost.com` | Clara Smirnova | Candidate |
| `user-4@fexpost.com` | Dmitry Kozlov | Candidate |
| `user-5@fexpost.com` | Elena Volkova | Candidate |
| `user-6@fexpost.com` | Fedor Sokolov | Recruiter |
| `user-7@fexpost.com` | Galina Morozova | Recruiter |
| `user-8@fexpost.com` | Igor Novikov | Recruiter |
| `user-9@fexpost.com` | Julia Fedorova | Recruiter |
| `user-10@fexpost.com` | Kirill Orlov | Recruiter |

У кандидатов заполнены default-атрибуты профиля: имя, фамилия, email, телефон, bio, location, фото (общий дефолтный аватар). На каждое опубликованное резюме рекрутеры ставят от 3 до 5 лайков.
