# Chatbot Yellow AI

YellowAI adalah workspace chatbot multi-user untuk membuat asisten per project. Setiap project punya prompt sendiri, file context sendiri, riwayat percakapan sendiri, dan daftar collaborator dengan role yang berbeda. Aplikasi ini dibuat untuk alur yang cukup praktis: user register, buat project, atur instruksi agent, upload file sebagai context, lalu chat dengan Responses API.

Stack saat ini terbagi dua:

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, dan Phosphor Icons.
- Backend: FastAPI, SQLAlchemy, Alembic, SQLite, JWT bearer auth, dan OpenAI Responses/Files API.

## Gambaran Produk

YellowAI tidak memakai satu prompt global untuk semua user. Prompt disimpan per project, sehingga satu project bisa menjadi support agent, project lain bisa menjadi assistant internal, dan project lain lagi bisa dipakai untuk membaca dokumen tertentu. File yang di-upload dikirim ke OpenAI Files API, sedangkan database lokal hanya menyimpan metadata file seperti nama, ukuran, MIME type, dan `openai_file_id`.

Role project dibuat sederhana:

- `owner` bisa mengatur project, prompt, member, file, dan chat.
- `editor` bisa mengubah project, mengubah prompt, upload file, dan chat.
- `viewer` hanya bisa membaca project dan riwayat percakapan.

Chat mendukung streaming response via Server-Sent Events. Frontend menampilkan pesan user secara optimistik, lalu mengisi pesan assistant saat token delta datang dari backend.

## Struktur Kode

```txt
app/                         Next.js routes
  page.tsx                   landing page
  login/page.tsx             login screen
  register/page.tsx          registration screen
  dashboard/page.tsx         authenticated project list
  projects/[projectId]/      project workspace screen

components/                  React client components
  auth-form.tsx              login/register form
  dashboard-client.tsx       dashboard UI and project creation
  project-workspace-client.tsx
                              chat, prompt editor, file context, members, settings
  assistant-orb.tsx          visual assistant element
  scroll-reveal.tsx          reveal animation wrapper

lib/
  api.ts                     API client and localStorage auth token helpers

backend/
  app/main.py                FastAPI app, CORS, routers, healthcheck
  app/api/v1/                API route modules
  app/core/                  config, auth, RBAC, errors, dependencies
  app/models/                SQLAlchemy database and model definitions
  app/schemas/               Pydantic request/response schemas
  app/services/              OpenAI, file validation, guardrail helpers
  alembic/                   database migrations
  tests/                     pytest backend tests
```

## Data Model

Database memakai SQLAlchemy models dengan CUID string IDs.

Core table:

- `users`: akun user, email unik, nama opsional, password hash.
- `projects`: workspace milik user.
- `project_members`: role user di project, unik per `(project_id, user_id)`.
- `prompts`: satu prompt aktif per project.
- `project_files`: metadata file yang sudah di-upload ke OpenAI.
- `conversations`: thread chat per project.
- `messages`: pesan user dan assistant, termasuk `response_id` dari OpenAI jika ada.

Relasi project memakai cascade delete, jadi ketika project dihapus, prompt, files, conversations, messages, dan memberships ikut hilang.

## API Utama

Semua route backend berada di prefix `/api/v1`.

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`

Projects:

- `GET /projects`
- `POST /projects`
- `GET /projects/{project_id}`
- `PATCH /projects/{project_id}`
- `DELETE /projects/{project_id}`

Members:

- `GET /projects/{project_id}/members`
- `POST /projects/{project_id}/members`
- `PATCH /projects/{project_id}/members/{member_id}`
- `DELETE /projects/{project_id}/members/{member_id}`

Prompt, files, conversations, chat:

- `GET /projects/{project_id}/prompts`
- `POST /projects/{project_id}/prompts`
- `GET /projects/{project_id}/files`
- `POST /projects/{project_id}/files`
- `GET /projects/{project_id}/conversations`
- `GET /projects/{project_id}/conversations/{conversation_id}/messages`
- `DELETE /projects/{project_id}/conversations/{conversation_id}`
- `POST /projects/{project_id}/chat`

Request chat menerima `message`, `conversation_id`, `file_ids`, dan `stream`. Untuk streaming, backend mengirim event SSE: `user_message`, `delta`, `guardrail_triggered`, `done`, atau `error`.

## File Context

File upload dibatasi di backend sebelum dikirim ke OpenAI:

- Maksimal 10 MB.
- Ekstensi yang diterima: PDF, TXT, Markdown, CSV, JSON, DOCX.
- MIME type harus cocok dengan tipe yang diizinkan.

File bytes tidak disimpan di SQLite. Setelah upload berhasil, backend menyimpan metadata dan `openai_file_id`. Saat user memilih file di chat composer, frontend mengirim `file_ids` ke endpoint chat. Backend memvalidasi bahwa file tersebut milik project yang sama, lalu menyusun input Responses API dengan blok `input_file` dan `input_text`.

## Guardrail

Backend punya guardrail sederhana yang bisa diaktifkan lewat env:

- `GUARDRAIL_ENABLED`
- `GUARDRAIL_INPUT_CHECK`
- `GUARDRAIL_OUTPUT_CHECK`

Guardrail menambahkan instruksi batasan scope pada prompt project, memblokir pola input yang mencoba mengubah instruksi agent, dan mengganti output yang terlihat membocorkan aturan internal. Response penolakan saat ini memakai bahasa Indonesia agar konsisten dengan pesan guardrail.

## Setup Lokal

Butuh Node.js untuk frontend dan Python 3.12+ untuk backend. Backend dikelola dengan `uv`.

Install dependency frontend:

```bash
npm install
```

Install dependency backend:

```bash
cd backend
uv sync --extra dev
```

Buat env untuk frontend di root project:

```bash
cp .env.example .env
```

Minimal value yang dipakai frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Buat env backend di folder `backend/`:

```bash
cp ../.env.example .env
```

Pastikan value backend memakai format SQLAlchemy untuk SQLite:

```bash
DATABASE_URL=sqlite:///./dev.db
JWT_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
GUARDRAIL_ENABLED=true
GUARDRAIL_INPUT_CHECK=true
GUARDRAIL_OUTPUT_CHECK=true
CORS_ORIGINS=http://localhost:3000
```

`OPENAI_API_KEY` boleh kosong saat hanya ingin mencoba register, login, project, dan member management. Upload file dan chat akan menolak request sampai key diisi.

Jalankan migration:

```bash
cd backend
uv run alembic upgrade head
```

Jalankan backend:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```

Jalankan frontend dari root project:

```bash
npm run dev
```

Default URL:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Backend docs: `http://localhost:8000/docs`

Jika port `3000` sudah dipakai, Next.js akan memilih port lain. Kalau itu terjadi, update `CORS_ORIGINS` di env backend agar origin frontend tetap diizinkan.

## Script dan Verifikasi

Frontend:

```bash
npm run lint
npm run build
npm test
```

Catatan: konfigurasi Vitest saat ini mencari `tests/**/*.test.ts`. Kalau belum ada test frontend di path itu, `npm test` akan keluar dengan pesan `No test files found`.

Backend:

```bash
cd backend
uv run pytest
```

Test backend yang ada sekarang menutup area auth, `/me`, validasi upload file, dan permission role.

## Catatan Implementasi

- Token auth disimpan di `localStorage` oleh frontend, lalu dikirim sebagai `Authorization: Bearer <token>`.
- FastAPI error handler mengembalikan format konsisten: `{ "error": { "code", "message", "details" } }`.
- `Base.metadata.create_all()` tetap berjalan saat app startup, tetapi Alembic tetap disediakan untuk migration yang lebih eksplisit.
- Riwayat chat yang dikirim ke OpenAI dibatasi ke 12 message terakhir.
- Prompt project maksimal 8000 karakter, message chat maksimal 4000 karakter, dan maksimal 10 file bisa dipilih dalam satu request chat.
- Uploaded files di OpenAI tidak otomatis dihapus ketika metadata project dihapus; kalau butuh lifecycle cleanup penuh, itu perlu ditambahkan sebagai job atau service terpisah.
