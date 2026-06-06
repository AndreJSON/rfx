---
description: "Use when working with image upload, storage, serving, validation, or display in the recipe app. Covers accepted MIME types, magic byte detection, file naming, API endpoints, frontend upload/remove UI, and Pinia store methods."
applyTo: "{server,client}/**"
---

# Image Handling

## Accepted MIME Types

Only the following MIME types are accepted for recipe images:

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/heic`
- `image/heif`
- `image/avif`

Uploads with any other MIME type must be rejected with `400 { "error": "Unsupported image type" }`.

## MIME Type Detection

The MIME type **must be detected from the file's magic bytes** (e.g. using the `file-type` package). Do **not** trust the client-supplied `Content-Type` header or the original filename extension.

## File Storage

- At most **one image per recipe** — uploading replaces any existing image; any existing image file is deleted before saving the new one.
- Image filename is always `image` with an extension derived from the **detected** MIME type (e.g. `image.png`, `image.jpg`) — never from the client-supplied filename.
- Use a fixed MIME-type-to-extension mapping (e.g. `image/jpeg` → `.jpg`); do not rely on the original filename.
- Stored at: `server/data/{uuid}/image.{detectedExtension}`.
- On image removal (`DELETE /api/recipes/:id/image`), the file is deleted from disk.

## API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `POST` | `/api/recipes/:id/image` | `multipart/form-data` field `image` | `200` `{ imageUrl }` |
| `DELETE` | `/api/recipes/:id/image` | — | `204` |
| `GET` | `/api/recipes/:id/image` | — | Image file stream |

- Accept image uploads via `multipart/form-data` using `multer` (or equivalent).
- Serve images via `GET /api/recipes/:id/image` by reading and streaming the file; set the `Content-Type` response header to the MIME type corresponding to the stored file extension so the browser can render it correctly.
- `imageUrl` in API responses is a relative path the client can use directly, e.g. `/api/recipes/{id}/image`.
- Any image endpoint for a soft-deleted recipe must respond with `404`.

## Frontend

### Display (read mode)

- The Recipe Modal displays the image if one is present.

### Upload / Remove (edit/create mode)

- Show the current image with a **remove** button when an image is present.
- Show an upload control when no image is present.
- A recipe can have **at most one image** — uploading replaces the existing one.

### Pinia Store

The `useRecipeStore` exposes these image mutations:

- `uploadImage(id, file)` — calls `POST /api/recipes/:id/image` and updates local state.
- `removeImage(id)` — calls `DELETE /api/recipes/:id/image` and updates local state.
