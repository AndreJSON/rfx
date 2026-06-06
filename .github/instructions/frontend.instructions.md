---
description: "Use when building or modifying the Vue frontend, UI components, Pinia stores, Radix UI usage, layout, styling, or the single-page recipe application interface."
applyTo: "client/**"
---

# Frontend Guidelines

## Stack

- **Vue 3** with `<script setup>` syntax and Composition API throughout.
- **Pinia** for all shared state — one store per logical domain (e.g. `useRecipeStore`).
- **Radix UI Vue** for interactive primitives (Dialog, DropdownMenu, Tooltip, etc.).
- **@mdi/font** npm package is required and must be used for all fonts in the frontend.
- **Vite** as the build tool.

## Application Layout (single page)

```
┌─────────────────────────────────────────────┐
│  Toolbar                                    │
│  [ Search bar              ] [ + ]          │
├─────────────────────────────────────────────┤
│  Recipe List                                │
│  ┌───────────────────────────────────────┐  │
│  │ Recipe Title                          │  │
│  │ tag1, tag2, tag3                      │  │
│  └───────────────────────────────────────┘  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

- The toolbar uses primary color for its background.
- The search bar filters the recipe list in real time (client-side filter on title and tags).
- The `+` button opens the recipe modal in "create" mode.

## Recipe List

- Each list item displays two lines: **title** (line 1) and comma-separated tags (line 2).
- Clicking a list item opens the **Recipe Modal** in view mode.
- The list is sourced from the Pinia recipe store.

## Modals

### Recipe Modal (read mode)
- Displays: title, tags, body text, image (if present). Elements should appear in this order from top to bottom.
- Controls: `×` (close) icon button, pen/edit icon button, trash icon button for delete.
- Clicking the pen icon transforms model to edit mode.
- Top part of dialog (title and buttons) should remain fixed when body content is long and causes scrolling.
- Top part of dialog should have the primary color as background, and the content area should have a light neutral background.

### Recipe Modal (edit/create mode)
- Editable fields: title (input), body (textarea), tags (add/remove chips), image (upload or remove).
- Title field must reject newlines (strip on input or prevent via keydown).
- Tag input must reject whitespace (validate before adding tag).
- Tag input should always uppercase tags on input.
- Image: show current image with a remove button; show upload control when no image is present.
- See [image.instructions.md](image.instructions.md) for full image upload/remove behaviour.
- Save action calls the Pinia store method which calls the API.
- On successful save, modal is transformed to read mode.

## Pinia Store (`useRecipeStore`)

Responsibilities:
- `recipes` — reactive list of all recipes (id, title, tags).
- `fetchRecipes()` — load list from `GET /api/recipes`.
- `fetchRecipe(id)` — load full recipe detail (body, image URL).
- `createRecipe(data)` — POST then refresh list.
- `updateRecipe(id, data)` — PUT then update local state.
- `deleteRecipe(id)` — DELETE then remove from list.
- `uploadImage(id, file)` — calls `POST /api/recipes/:id/image` and updates local state.
- `removeImage(id)` — calls `DELETE /api/recipes/:id/image` and updates local state.
- `searchQuery` — reactive string used to filter the displayed list.

## Styling Conventions

- Teal (#81C784) is the primary color of the app.
- Prefer scoped `<style scoped>` blocks in single-file components.
- Do not introduce a separate CSS framework (e.g. Tailwind) unless already present.

## Component Conventions

- One component per file; filename matches component name in PascalCase.
- Emit events upward; do not call store methods from deeply nested child components — pass callbacks or use the store directly only in top-level view components.
- Use Radix UI `Dialog` for all modals; do not build custom modal/overlay logic.
