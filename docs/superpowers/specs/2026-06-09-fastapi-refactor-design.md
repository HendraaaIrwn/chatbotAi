# FastAPI Backend Refactor — Design Spec

**Date:** 2026-06-09
**Status:** Approved

## Goal

Port seluruh 17 Next.js API route handlers ke FastAPI dengan SQLAlchemy + SQLite, JWT Bearer token auth, dan struktur clean architecture. Frontend Next.js tetap berjalan, hanya `lib/api.ts` diupdate ke Bearer token.

## Architecture

Monorepo dengan folder `backend/`. FastAPI app dengan dependency injection untuk auth/authorization. Service layer terpisah dari route handlers. SQLAlchemy models + Alembic migrations. Pydantic schemas untuk request/response validation.

## Stack

| Layer | Current | New |
|-------|---------|-----|
| Framework | Next.js API Routes | FastAPI |
| ORM | Prisma | SQLAlchemy 2.0 |
| DB | SQLite (file-based) | SQLite (tetap) |
| Migrations | `prisma migrate` | Alembic |
| Auth | JWT cookie (jose) | JWT Bearer (python-jose) |
| Password | bcryptjs | passlib[bcrypt] |
| Validation | Zod | Pydantic v2 |
| OpenAI SDK | openai (npm) | openai (PyPI) |
| Server | Next.js built-in | Uvicorn |
| Testing | Vitest | pytest + httpx |
| Package mgr | npm | uv/poetry |

## Directory Structure

```
backend/
├── alembic/              # Database migrations
│   └── versions/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py           # /api/v1/auth/*
│   │       ├── users.py          # /api/v1/me
│   │       ├── projects.py       # /api/v1/projects/*
│   │       ├── members.py        # /api/v1/projects/{id}/members/*
│   │       ├── files.py          # /api/v1/projects/{id}/files/*
│   │       ├── prompts.py        # /api/v1/projects/{id}/prompts
│   │       └── chat.py           # /api/v1/projects/{id}/chat
│   ├── core/
│   │   ├── config.py             # Settings (pydantic-settings, .env)
│   │   ├── security.py           # JWT encode/decode, password hashing
│   │   ├── deps.py               # Depends(get_current_user), Depends(get_project_access)
│   │   ├── roles.py              # RBAC permission helpers
│   │   └── errors.py             # Custom exceptions + exception handlers
│   ├── models/
│   │   ├── database.py           # Engine, session, Base
│   │   └── models.py             # SQLAlchemy models (7 tables)
│   ├── schemas/
│   │   ├── auth.py               # Register, Login request/response
│   │   ├── user.py               # User response
│   │   ├── project.py            # Project CRUD schemas
│   │   ├── file.py               # File schemas
│   │   ├── chat.py               # Chat request/response
│   │   ├── prompt.py             # Prompt schemas
│   │   └── member.py             # Member schemas
│   ├── services/
│   │   ├── openai_service.py     # OpenAI client, chat input builder
│   │   └── file_service.py       # File validation + upload flow
│   └── main.py                   # FastAPI app, lifespan, CORS, routers
├── tests/
│   ├── conftest.py               # Fixtures (test DB, test client, auth headers)
│   ├── test_auth.py
│   ├── test_permissions.py
│   └── test_files.py
├── alembic.ini
├── pyproject.toml
└── .env
```

## API Endpoints

| Method | Path | Auth | Permission | File |
|--------|------|------|------------|------|
| POST | `/api/v1/auth/register` | No | — | `api/auth.py` |
| POST | `/api/v1/auth/login` | No | — | `api/auth.py` |
| POST | `/api/v1/auth/logout` | No | — | `api/auth.py` |
| GET | `/api/v1/me` | Optional | — | `api/users.py` |
| GET | `/api/v1/projects` | Yes | — | `api/projects.py` |
| POST | `/api/v1/projects` | Yes | — | `api/projects.py` |
| GET | `/api/v1/projects/{id}` | Yes | `read` | `api/projects.py` |
| PATCH | `/api/v1/projects/{id}` | Yes | `edit` | `api/projects.py` |
| DELETE | `/api/v1/projects/{id}` | Yes | `manage_members` | `api/projects.py` |
| POST | `/api/v1/projects/{id}/chat` | Yes | `read` | `api/chat.py` |
| GET | `/api/v1/projects/{id}/files` | Yes | `read` | `api/files.py` |
| POST | `/api/v1/projects/{id}/files` | Yes | `upload_files` | `api/files.py` |
| GET | `/api/v1/projects/{id}/prompts` | Yes | `read` | `api/prompts.py` |
| POST | `/api/v1/projects/{id}/prompts` | Yes | `edit` | `api/prompts.py` |
| GET | `/api/v1/projects/{id}/members` | Yes | `read` | `api/members.py` |
| POST | `/api/v1/projects/{id}/members` | Yes | `manage_members` | `api/members.py` |
| PATCH | `/api/v1/projects/{id}/members/{mid}` | Yes | `manage_members` | `api/members.py` |
| DELETE | `/api/v1/projects/{id}/members/{mid}` | Yes | `manage_members` | `api/members.py` |

## Error Response Shape

```json
{ "error": { "code": "unauthorized", "message": "Please log in to continue.", "details": null } }
```

Error codes: `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `server_error`

## RBAC Matrix

| Role   | read | edit | upload_files | manage_members |
|--------|------|------|--------------|----------------|
| owner  | yes  | yes  | yes          | yes            |
| editor | yes  | yes  | yes          | no             |
| viewer | yes  | no   | no           | no             |

## Authentication

- JWT Bearer token, algorithm HS256, expiry 7 days
- Token returned in login/register response body as `token` field
- Client stores in localStorage, sends via `Authorization: Bearer <token>` header
- FastAPI dependencies: `get_current_user` (required), `get_current_user_optional` (nullable)

## Database

- SQLite via SQLAlchemy 2.0
- 7 models: User, Project, ProjectMember, Prompt, ProjectFile, Conversation, Message
- All IDs use cuid2 generator
- Alembic for migration management
- `check_same_thread=False` for SQLite in FastAPI

## OpenAI

- Uses OpenAI Responses API (not Chat Completions)
- Model from `OPENAI_MODEL` env (default: `gpt-5.4-mini`)
- Singleton client via `functools.lru_cache`
- Chat history: last 12 messages, formatted as transcript
- File attachments via `input_file` content type
- Upload purpose: `user_data`

## Dependencies

```toml
dependencies = [
    "fastapi[standard]>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy>=2.0.36",
    "alembic>=1.14.1",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-multipart>=0.0.19",
    "openai>=1.70.0",
    "cuid2>=0.1.0",
]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "httpx>=0.28.0",
]
```

## Testing Strategy

- pytest + FastAPI TestClient + SQLite in-memory
- Fixtures: test DB session, auth headers, test user
- Coverage: auth flow, permissions matrix, file validation
- Parity with existing 11 Vitest tests
