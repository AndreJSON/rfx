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

See [image.instructions.md](image.instructions.md) for full image handling rules (accepted MIME types, magic byte detection, file storage, and API behaviour).

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

`imageUrl` is a relative path the client can use directly, e.g. `/api/recipes/{id}/image`. See [image.instructions.md](image.instructions.md) for full image endpoint details.

## Search

- Searching/filtering is done **client-side** — the list endpoint returns all recipes.
- The server does not implement query-based filtering.
