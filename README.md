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

Заполните минимум:

| Переменная | Назначение |
| --- | --- |
| `Jwt__SecretKey` | Секрет JWT (≥ 32 символа) |
| `DefaultAttributes__SystemUserEmail` | Email админа (см. сидеры) |
| `DefaultAttributes__SystemUserPassword` | Пароль админа |
| `Cloudinary__ApiKey` / `Cloudinary__ApiSecret` | Загрузка файлов/аватаров |
| `Smtp__*` | Опционально: письма (активация, подтверждение) |
| `Authentication__Google__*` / `Facebook__*` | Опционально: OAuth |

> В Docker строка БД в `docker-compose.yml` уже задана как `Server=mysql;...User=app;Password=app;SslMode=None`.  
> `SslMode=None` нужен для `MySql.EntityFrameworkCore` + MySQL 8 в Docker (иначе SSL handshake падает с `Authentication to host 'mysql' failed`).  
> Значение `ConnectionStrings__DefaultConnection` из `.env` для контейнера backend перекрывается compose.

3. В корне уже есть `.env` с `APP_MODE=dev-stage` (hot reload). Для production-сборки:

```env
APP_MODE=production-stage
```

4. Запуск:

```bash
docker compose up --build
```

Для авто-пересборки backend при изменении кода (рекомендуется в dev):

```bash
docker compose watch
# или
docker compose up --build --watch
```

5. Откройте приложение: [http://localhost:8000](http://localhost:8000)

При старте backend автоматически:

- применяет EF-миграции;
- создаёт роли;
- сидит атрибуты / пользователей / mock-данные;
- пересобирает Lucene-индекс поиска.

## Переменные окружения

Шаблон: [`backend/.env.example`](backend/.env.example).

Основные группы:

- **JWT** — авторизация API  
- **App / Cors** — `FrontendBaseUrl`, разрешённые origin  
- **DefaultAttributes** — системный Admin для mock-сидера и дефолтных атрибутов  
- **Cloudinary** — изображения и файлы профиля  
- **Smtp** — исходящая почта  
- **OAuth** — Google / Facebook  

Корневой `.env` (Compose):

```env
APP_MODE=dev-stage
```

## Локальный запуск без Docker

### База

Поднимите MySQL 8 и создайте БД `camp_project` (или укажите свою в connection string).

### Backend

```bash
cd backend
cp .env.example .env
# отредактируйте ConnectionStrings__DefaultConnection на localhost
dotnet restore
dotnet watch run --project Backend.Api.csproj
```

API по умолчанию: `http://localhost:8080` (см. launchSettings / `ASPNETCORE_URLS`).

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

В Docker Vite проксирует `/api` на `http://backend:8080`.  
При локальном `pnpm dev` поправьте `frontend/vite.config.ts` (`target`) на `http://localhost:8080`, либо ходите в API напрямую.

## Полезные URL

| URL | Описание |
| --- | --- |
| http://localhost:8000 | UI |
| http://localhost:8000/swagger | Swagger API |
| http://localhost:8000/phpmyadmin | phpMyAdmin (`app` / `app`) |
| localhost:3306 | MySQL (`app`/`app` или `root`/`root`) |

WebSocket уведомлений: `/ws` (проксируется на backend).

## Архитектура

```
project/
├── backend/          # ASP.NET Core Web API, EF Core, Identity, Lucene
├── frontend/         # React + Vite, FSD (app / pages / widgets / features / entities / shared)
├── docker-compose.yml
└── README.md
```

**Роли:** `Candidate`, `Recruiter`, `Admin`.

Основные сущности: пользователи, атрибуты профиля (EAV), валидации атрибутов, вакансии, ограничения вакансий, резюме (CV), проекты, теги, сообщения обсуждения, лайки резюме.

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
5. `MockDataSeeder` — атрибуты/теги/вакансии/проекты/сообщения/резюме  
6. Rebuild Lucene  

### Важно: Admin для mock-данных

`MockDataSeeder` **не стартует**, если в БД нет пользователя с email:

```text
srekhlyasov@gmail.com
```

Этот пользователь создаётся через `DefaultAttributes__SystemUserEmail` / `DefaultAttributes__SystemUserPassword` в `backend/.env` (см. `AttributeSeeder`).  
Укажите тот же email и пароль — иначе mock-вакансии и резюме не появятся.

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
| `user-11@fexpost.com` … `user-20@fexpost.com` | Laura Nowak … Umut Yilmaz | Candidate |

У кандидатов заполнены default-атрибуты профиля: имя, фамилия, email, телефон, bio, location, фото (общий дефолтный аватар).

### Default-атрибуты профиля

Системные поля (не привязаны к автору-админу):

- Profile photo  
- First name / Last name  
- Email / Phone number  
- Biography / Location  

### Mock-атрибуты

~**100** дополнительных атрибутов всех типов (`string`, `text`, `number`, `boolean`, `date`, `select`, `period`, `image`, `file`) с категориями и опциями для select.

Для части атрибутов заданы правила валидации (`MockAttributeValidationDefinitions`):  
`minLength` / `maxLength` / `regex` / `minNumber` / `maxNumber` / `maxFileSizeKb` (около 15 атрибутов).

### Теги

Набор технологических и доменных тегов (C#, React, Go, Kubernetes, …) для вакансий и проектов.

### Вакансии

**20** вакансий (Junior / Middle / Senior), компании и страны EU, форматы Hybrid / Remote / Office.  
У каждой — связанные атрибуты, теги; у части — ограничения (restrictions) по атрибутам/тегам.

Примеры:

- Junior .NET Backend Developer  
- Middle React Frontend Engineer  
- Senior Full-Stack Engineer  
- Junior Python Developer  
- Middle DevOps Engineer  
- …

Автор mock-вакансий — Admin (`srekhlyasov@gmail.com`).

### Проекты кандидатов

У `user-1` … `user-5` — **5–9** проектов с описанием, датами и тегами (`MockProjectDefinitions`).  
Проекты используются в CV при совпадении тегов вакансии.

### Сообщения обсуждений

**100** markdown-сообщений на вакансиях от кандидатов и рекрутеров (`user-1` … `user-10`).

### Резюме (CV)

Базовые назначения (`user-1` … `user-5`) — по 1–3 CV на разные вакансии.  
Публикация чередуется: нечётный индекс в общем списке → **published** (с заполненными атрибутами вакансии), чётный → **unpublished**.

Дополнительно **10 опубликованных** CV от `user-11` … `user-20` на уже занятые вакансии (`ForcePublished`), чтобы удобно тестировать списки, дашборд и CSV-выгрузку.

Итого ориентировочно **~16 опубликованных** резюме после полного сида.

## Миграции

Миграции применяются автоматически при старте API.

Добавить новую:

```bash
cd backend
dotnet ef migrations add NameOfMigration --project Backend.Api.csproj
```

После добавления миграции в Docker пересоберите backend.

## Типичные проблемы

**Нет вакансий / пустая БД после старта**  
Проверьте, что в `.env` задан `DefaultAttributes__SystemUserEmail=srekhlyasov@gmail.com` и пароль, и в логах backend нет `Mock data seeding skipped`.

**Изменения backend не видны в Docker**  
Исходники backend не монтируются volume’ом — нужен `docker compose up -d --build backend` или `compose watch`.

**CSV / счётчики резюме**  
Учитываются только **опубликованные** CV.

**Cloudinary / фото**  
Без валидных ключей Cloudinary аватары и upload файлов могут не работать; остальной функционал доступен.

**OAuth / почта**  
Без Google/Facebook и SMTP локальный логин по email + пароль `1` достаточен для демо-пользователей.
