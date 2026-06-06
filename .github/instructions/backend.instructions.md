---
description: "Use when working on the Node.js server, REST API endpoints, file system persistence, image upload handling, or server configuration."
applyTo: "server/**"
---

# Backend Guidelines

## Server

- Node.js with Express (or equivalent minimal framework).
- Listens on **port 8080**.
- Serves the Vue production build as static files from `../client/dist/` for all non-API routes.
- All recipe API routes are prefixed `/api/recipes`.
- No caching is used, since number of recipes will be low.

## File System

- Recipe data root: `server/data/`
- One sub-folder per recipe, named by the recipe's UUID: `server/data/{uuid}/`
- Each folder contains `recipe.txt` (always) and optionally one image file (`image.{ext}`).
- Use `fs/promises` (`readFile`, `writeFile`, `mkdir`, `rm`, `rename`) — no sync FS calls in request handlers.
- Write recipe files atomically: write to a temp file, then `fs.rename` to the target path.

## UUID Generation

- Use the `uuid` package (`uuidv4`) to generate new recipe IDs.
- IDs are generated server-side; clients never supply their own ID on creation.

## Image Handling

- Accept image uploads via `multipart/form-data` using `multer` (or equivalent).
- Only the following MIME types are accepted: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`, `image/avif`. Reject any other type with `400 { "error": "Unsupported image type" }`.
- **Detect the MIME type from the file's magic bytes** (e.g. using the `file-type` package) — do **not** trust the client-reported `Content-Type` or the original filename extension.
- Derive the file extension from the detected MIME type (e.g. `image/jpeg` → `.jpg`). Use a fixed mapping; do not rely on the original filename.
- Store uploaded image as `server/data/{uuid}/image.{detectedExtension}`.
- Only one image per recipe — any existing image file is deleted before saving the new one.
- Serve images via `GET /api/recipes/:id/image` by reading and streaming the file. Set the `Content-Type` response header to the MIME type that corresponds to the stored file extension so the browser can render it correctly.
- On image removal (`DELETE /api/recipes/:id/image`), delete the file and respond 204.

## Error Handling

- Return structured JSON errors: `{ "error": "message" }`.
- `404` when a recipe folder or file does not exist.
- `400` for validation failures (missing title, invalid tags, etc.).
- `500` for unexpected file system errors — log the underlying error server-side.

## Recipe Parsing & Serialisation

- Implement a `parseRecipe(text: string)` and `serialiseRecipe(recipe)` utility in `server/lib/recipe.js` (or `.ts`).
- See data model instructions for the `recipe.txt` format.

## API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `GET` | `/api/recipes` | — | `200` `[{ id, title, tags }]` sorted by `created` ascending |
| `GET` | `/api/recipes/:id` | — | `200` `{ id, title, tags, body, imageUrl }` |
| `POST` | `/api/recipes` | JSON `{ title, tags?, body? }` | `201` `{ id, title, tags, body, imageUrl }` (`imageUrl` is `null` on creation) |
| `PUT` | `/api/recipes/:id` | JSON `{ title, tags, body }` — all fields required; all fields are always overwritten; send `""` / `[]` to clear optional fields | `200` `{ id, title, tags, body, imageUrl }` |
| `DELETE` | `/api/recipes/:id` | — | `204` |
| `POST` | `/api/recipes/:id/image` | `multipart/form-data` field `image` | `200` `{ imageUrl }` |
| `DELETE` | `/api/recipes/:id/image` | — | `204` |
| `GET` | `/api/recipes/:id/image` | — | Image file stream |

`imageUrl` is a relative path the client can use directly, e.g. `/api/recipes/{id}/image`.

## Search

- Searching/filtering is done **client-side** — the list endpoint returns all recipes.
- The server does not implement query-based filtering.
