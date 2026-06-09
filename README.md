# Chatbot Yellow AI

A minimal multi-user chatbot platform built with Next.js, Prisma, SQLite, JWT
cookies, and the OpenAI Responses and Files APIs.

## Features

- Email/password registration and login
- User-owned projects with owner, editor, and viewer roles
- Collaborator management by registered email
- Project prompt editor
- Document uploads to OpenAI Files API with local metadata storage
- Project chat using OpenAI Responses API
- Local message history replay per conversation

## Local setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Set these values in `.env` before running the app:

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-5.4-mini"
```

`OPENAI_API_KEY` can be added later, but file uploads and chat will return a
clear configuration error until it is present.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run prisma:generate
npm run prisma:migrate
```

## Notes

- Uploaded file bytes are sent to OpenAI and are not stored locally.
- The local database is SQLite; the Prisma schema is portable enough to move to
  Postgres later.
- Supported upload types are PDF, TXT, Markdown, CSV, JSON, and DOCX up to
  10 MB.
