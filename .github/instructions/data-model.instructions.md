---
description: "Use when working with recipe data, the recipe file format, disk persistence, GUIDs, or the server/data directory structure. Covers recipe schema, recipe.txt format, image handling, and validation rules."
---

# Recipe Data Model

## Recipe Object

| Field   | Type     | Required | Constraints |
|---------|----------|----------|-------------|
| `id`      | `string` | Yes      | UUID v4; immutable once created |
| `title`   | `string` | Yes      | Non-empty; no newline characters; plain text only |
| `tags`    | `string[]` | No     | Each tag contains no whitespace; stored as comma-separated in file; plain text only |
| `body`    | `string` | No       | Free-form multi-line plain text; no HTML or other markup |
| `image`   | `string \| null` | No | Relative filename (e.g. `image.jpg`); at most one image per recipe |
| `created` | `string` | Yes      | ISO 8601 timestamp; set by backend on creation; never updated; **never sent to the frontend** |
| `updated` | `string` | Yes      | ISO 8601 timestamp; set by backend on creation and on every PUT; **never sent to the frontend** |

## Disk Layout

```
server/data/
└── {uuid}/
    ├── recipe.txt       # always present
    ├── image.{ext}      # optional; only one image file per folder
    └── deleted.txt      # optional; presence marks recipe as deleted
```

- The folder name **is** the recipe ID.
- Image filename is always `image` with the original extension preserved (e.g. `image.png`, `image.jpg`).
- Only `recipe.txt`, `image.{ext}`, and `deleted.txt` should be placed in a recipe folder.

## `recipe.txt` Format

Plain text file with exactly three sections in a fixed order, no blank lines between them:

```
TITLE: Banana Bread
CREATED: 2024-01-15T10:30:00.000Z
UPDATED: 2024-03-22T14:05:00.000Z
TAGS: baking,sweet,easy
BODY: Mix flour and sugar.
Mash the bananas.
Bake at 180°C for 50 minutes.
```

Parsing rules:
- Line 1 is always `TITLE:` — value is the rest of the line (trimmed).
- Line 2 is always `CREATED:` — ISO 8601 timestamp set on creation; never changes.
- Line 3 is always `UPDATED:` — ISO 8601 timestamp updated on every PUT.
- Line 4 is always `TAGS:` — value is the rest of the line, comma-separated. Empty if no tags.
- Line 5 onward is always `BODY:` — the first line's value starts after the colon; subsequent lines until EOF are continuation lines. Empty if no body.
- All five sections are always written.

## Validation Rules

- `title`: required, `string`, plain text only, strip leading/trailing whitespace, reject if empty or contains `\n`.
- `created`: set by backend to `new Date().toISOString()` on recipe creation; never modified after that.
- `updated`: set by backend to `new Date().toISOString()` on creation and overwritten on every PUT.
- `created` and `updated` are **internal fields** — they must not be included in any API response sent to the frontend.
- `tags`: each element must match `/^\S+$/` (no whitespace), plain text only. Duplicates should be deduplicated.
- `body`: optional free-form plain text string; newlines are preserved; no HTML or other markup.
- `image`: server accepts `multipart/form-data`; only one image per recipe; replaces any existing image on upload; deleted from disk on removal.

## Deletion Model

Recipes are **soft-deleted** by placing an empty `deleted.txt` file in the recipe's folder. The folder and `recipe.txt` remain on disk.

- **Deleted recipes are excluded** from all API list and fetch responses — the UI has no view for them.
- **Deletion is not reversible through the UI or API.** To restore a recipe, manually remove `deleted.txt` from the recipe's folder on disk.
- Any endpoint that operates on a recipe (GET, PUT, image upload/removal) must treat a folder containing `deleted.txt` as non-existent and respond with `404`.
- `GET /api/recipes` must not include deleted recipes in its listing.

## API Contract (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recipes` | List all non-deleted recipes (id, title, tags only), sorted by `created` ascending |
| `GET` | `/api/recipes/:id` | Full recipe including body and image URL; 404 if deleted |
| `POST` | `/api/recipes` | Create recipe; body: `{ title, tags?, body? }` |
| `PUT` | `/api/recipes/:id` | Replace all recipe fields; all fields (`title`, `tags`, `body`) are required — omitting a field is not allowed; send an empty string/array to clear an optional field; 404 if deleted |
| `DELETE` | `/api/recipes/:id` | Soft-delete: creates an empty `deleted.txt` in the recipe folder; 404 if already deleted |
| `POST` | `/api/recipes/:id/image` | Upload image (`multipart/form-data`); 404 if deleted |
| `DELETE` | `/api/recipes/:id/image` | Remove image; 404 if deleted |
| `GET` | `/api/recipes/:id/image` | Serve image file; 404 if deleted |
