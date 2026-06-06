# Recipe App — Project Guidelines

## Overview

A Node.js web server (port 8080) that serves a Vue 3 single-page frontend for listing, viewing, and editing recipes. Recipes are persisted to disk. The project is a monorepo with a `server/` directory for the backend and a `client/` directory for the frontend.

## Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js (Express or similar), port 8080 |
| Frontend | Vue 3, Pinia (state), Radix UI (components) |
| Persistence | File system — one folder per recipe |
| Build | Vite (client), served as static files from the server |

## Architecture

```
/
├── server/          # Node.js backend
│   └── data/        # Recipe storage root
│       └── {guid}/
│           ├── recipe.txt
│           └── image.*   (optional)
└── client/          # Vue 3 frontend
```

- The server exposes a REST API for recipe CRUD and image upload/removal.
- The server serves the built Vue app as static files from `client/dist/`.
- All recipe data lives under `server/data/`. Each recipe occupies its own folder named after its GUID.

## Data Model

See `.github/instructions/data-model.instructions.md` for the full recipe schema and file format.

## Key Constraints

- Recipe title is **mandatory**; tags, body text, and image are optional.
- A recipe may have **0 or 1 images**.
- Title must not contain newlines.
- Tags must not contain whitespace; multiple tags are comma-separated.
- GUIDs are the canonical identifier — never reassigned or reused.

## Build & Dev

```bash
# Install all dependencies
npm install          # run from root, or separately in server/ and client/

# Development
npm run dev          # starts both server and Vite dev server (if concurrently script exists)

# Production build
npm run build        # builds client to client/dist/
npm start            # starts the Node server on port 8080
```

## Conventions

- Use `async/await` throughout; no raw callback patterns.
- Pinia stores are the single source of truth for frontend state — no ad-hoc local reactive state for recipe data.
- Radix UI primitives are used for all interactive components (Dialog, Tooltip, etc.); avoid custom re-implementations.
