---
description: "Use when working with recipe data, the recipe file format, disk persistence, GUIDs, or the server/data directory structure. Covers recipe schema, recipe.txt format, and validation rules. For image handling see image.instructions.md."
---

# Recipe Data Model

## Recipe Object

| Field   | Type     | Constraints |
|---------|----------|-------------|
| `id`      | `string` | UUID v4; immutable once created |
| `title`   | `string` | Non-empty; no newline characters; plain text only |
| `tags`    | `string[]` | Each tag contains no whitespace; stored as comma-separated in file; plain text only |
| `body`    | `string` | Free-form multi-line plain text; no HTML or other markup |
| `imageName`   | `string \| null` | Filename (e.g. `image.jpg`); at most one image per recipe. See [image.instructions.md](image.instructions.md) |
| `created` | `string` | ISO 8601 timestamp; set by backend on creation; never updated; **never sent to the frontend** |
| `updated` | `string` | ISO 8601 timestamp; set by backend on creation and on every PUT; **never sent to the frontend** |
| `deleted` | `string \| null` | ISO 8601 timestamp; set by backend on creation and on every PUT; **never sent to the frontend** |

## Disk Layout

```
server/data/
└── {uuid}/
    ├── recipe.txt       # always present
    ├── image.{ext}      # optional; only one image file per folder
```

- The folder name **is** the recipe ID.
- Image filename convention and MIME type detection: see [image.instructions.md](image.instructions.md).
- Only `recipe.txt` and `image.{ext}` should be placed in a recipe folder.

## `recipe.txt` Format

Plain text file with exactly 6 sections in a fixed order, no blank lines between them:

```
TITLE: Banana Bread
CREATED: 2024-01-15T10:30:00.000Z
UPDATED: 2024-03-22T14:05:00.000Z
DELETED: 2024-05-22T14:05:00.000Z
TAGS: baking,sweet,easy
BODY: Mix flour and sugar.
Mash the bananas.
Bake at 180°C for 50 minutes.
```

Parsing rules:
- Line 1 is always `TITLE:` — value is the rest of the line (trimmed).
- Line 2 is always `CREATED:` — ISO 8601 timestamp set on creation; never changes.
- Line 3 is always `UPDATED:` — ISO 8601 timestamp updated on every PUT.
- Line 4 is always `DELETED:` — ISO 8601 timestamp if the recipe is marked as deleted. Empty if recipe is marked as deleted.
- Line 5 is always `TAGS:` — value is the rest of the line, comma-separated. Empty if no tags.
- Line 6 onward is always `BODY:` — the first line's value starts after the colon; subsequent lines until EOF are continuation lines. Empty if no body.
- All five sections are always written.

## Validation Rules

- `title`: required, `string`, plain text only, strip leading/trailing whitespace, reject if empty or contains `\n`.
- `created`: set by backend to `new Date().toISOString()` on recipe creation; never modified after that.
- `updated`: set by backend to `new Date().toISOString()` on creation and overwritten on every PUT.
- `deleted`: set by backend to `new Date().toISOString()` on deletion. This marks the recipe as **soft-deleted**. Everything related to the recipe still remains on disk.
- `created`, `updated` and `deleted` are **internal fields** — they must not be included in any API response sent to the frontend.
- `tags`: each element must match `/^\S+$/` (no whitespace), plain text only. Duplicates should be deduplicated.
- `body`: optional free-form plain text string; newlines are preserved; no HTML or other markup.
- `image`: at most one image per recipe; replaces any existing image on upload; deleted from disk on removal. See [image.instructions.md](image.instructions.md) for accepted MIME types and validation rules.

## Deleted recipes

Recipes are **soft-deleted** by specifying a `deleted` date.

- **Deleted recipes are excluded** from all API list and fetch responses — the UI has no view for them.
- **Deletion is not reversible through the UI or API.** To restore a recipe, manually remove `deleted` date from the recipe text file.
- Any endpoint that operates on a recipe (GET, PUT, image upload/removal) must treat a recipe containing a `deleted` date as non-existent and respond with `404`.
- `GET /api/recipes` must not include deleted recipes in its listing.

