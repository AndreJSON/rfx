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
- On calling the image removal endpoint, the file is deleted from disk.
- Accept image uploads via `multipart/form-data` using `multer`.
- Serve images via api by reading and streaming the file; set the `Content-Type` response header to the MIME type corresponding to the stored file extension so the browser can render it correctly.