---
description: "Use when working with recipe data, the recipe file format, disk persistence, GUIDs, or the server/data directory structure. Covers recipe schema, recipe.txt format, image handling, and validation rules."
---

# Recipe Data Model

## Recipe Object

| Field   | Type     | Required | Constraints |
|---------|----------|----------|-------------|
| `id`    | `string` | Yes      | UUID v4; immutable once created |
| `title` | `string` | Yes      | Non-empty; no newline characters; plain text only |
| `tags`  | `string[]` | No     | Each tag contains no whitespace; stored as comma-separated in file; plain text only |
| `body`  | `string` | No       | Free-form multi-line plain text; no HTML or other markup |
| `image` | `string \| null` | No | Relative filename (e.g. `image.jpg`); at most one image per recipe |

## Disk Layout

```
server/data/
└── {uuid}/
    ├── recipe.txt       # always present
    └── image.{ext}      # optional; only one image file per folder
```

- The folder name **is** the recipe ID.
- Image filename is always `image` with the original extension preserved (e.g. `image.png`, `image.jpg`).
- No other files should be placed in a recipe folder.

## `recipe.txt` Format

Plain text file with exactly three sections in a fixed order, no blank lines between them:

```
TITLE: Banana Bread
TAGS: baking,sweet,easy
BODY: Mix flour and sugar.
Mash the bananas.
Bake at 180°C for 50 minutes.
```

Parsing rules:
- Line 1 is always `TITLE:` — value is the rest of the line (trimmed).
- Line 2 is always `TAGS:` — value is the rest of the line, comma-separated. Empty if no tags.
- Line 3 onward is always `BODY:` — the first line's value starts after the colon; subsequent lines until EOF are continuation lines. Empty if no body.
- All three sections are always written, even when `TAGS` or `BODY` are empty (e.g. `TAGS: ` and `BODY: `).

## Validation Rules

- `title`: required, `string`, plain text only, strip leading/trailing whitespace, reject if empty or contains `\n`.
- `tags`: each element must match `/^\S+$/` (no whitespace), plain text only. Duplicates should be deduplicated.
- `body`: optional free-form plain text string; newlines are preserved; no HTML or other markup.
- `image`: server accepts `multipart/form-data`; only one image per recipe; replaces any existing image on upload; deleted from disk on removal.

## API Contract (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recipes` | List all recipes (id, title, tags only) |
| `GET` | `/api/recipes/:id` | Full recipe including body and image URL |
| `POST` | `/api/recipes` | Create recipe; body: `{ title, tags?, body? }` |
| `PUT` | `/api/recipes/:id` | Update recipe fields |
| `DELETE` | `/api/recipes/:id` | Delete recipe and its folder |
| `POST` | `/api/recipes/:id/image` | Upload image (`multipart/form-data`) |
| `DELETE` | `/api/recipes/:id/image` | Remove image |
| `GET` | `/api/recipes/:id/image` | Serve image file |
