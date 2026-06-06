---
description: "Use when working with recipe data, the recipe file format, disk persistence, GUIDs, or the server/data directory structure. Covers recipe schema, recipe.txt format, image handling, and validation rules."
---

# Recipe Data Model

## Recipe Object

| Field   | Type     | Required | Constraints |
|---------|----------|----------|-------------|
| `id`    | `string` | Yes      | UUID v4; immutable once created |
| `title` | `string` | Yes      | Non-empty; no newline characters |
| `tags`  | `string[]` | No     | Each tag contains no whitespace; stored as comma-separated in file |
| `body`  | `string` | No       | Free-form multi-line text |
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

Plain text file with labelled sections separated by blank lines:

```
TITLE: Banana Bread

TAGS: baking,sweet,easy

BODY:
Mix flour and sugar.
Mash the bananas.
Bake at 180°C for 50 minutes.
```

Parsing rules:
- `TITLE:` — single line after the colon (trimmed).
- `TAGS:` — single line, comma-separated, no surrounding whitespace per tag. Omit the line entirely if there are no tags.
- `BODY:` — everything after the `BODY:` line until end of file. Omit the section entirely if body is empty.
- Sections may appear in any order but `TITLE` must be present.

## Validation Rules

- `title`: required, `string`, strip leading/trailing whitespace, reject if empty or contains `\n`.
- `tags`: each element must match `/^\S+$/` (no whitespace). Duplicates should be deduplicated.
- `body`: optional free-form string; newlines are preserved.
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
