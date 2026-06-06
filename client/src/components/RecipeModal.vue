<script setup>
import { ref, computed, watch } from 'vue';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
} from 'radix-vue';
import { useRecipeStore } from '../stores/recipeStore.js';

const props = defineProps({
  open: Boolean,
  recipeId: { type: String, default: null },
});

const emit = defineEmits(['close']);

const store = useRecipeStore();

// --- State ---
const mode = ref('view'); // 'view' | 'edit' | 'create'
const recipe = ref(null); // full recipe: { id, title, tags, body, imageName }
const isLoading = ref(false);
const error = ref(null);

// Edit form fields
const editTitle = ref('');
const editBody = ref('');
const editTags = ref([]);
const tagInput = ref('');

// Image handling
const imageTimestamp = ref(Date.now()); // cache-busting for API images
const pendingImageFile = ref(null);     // File selected in create mode (uploaded on save)
const pendingImagePreviewUrl = ref(null); // blob URL for create-mode preview

// --- Computed ---

/** The current recipe ID — uses fetched recipe.id after creation, falls back to prop */
const currentId = computed(() => recipe.value?.id ?? props.recipeId);

/** Image URL to display (either blob preview or API URL) */
const displayImageUrl = computed(() => {
  if (pendingImagePreviewUrl.value) return pendingImagePreviewUrl.value;
  if (!recipe.value?.imageName) return null;
  if (!currentId.value) return null;
  return `/api/recipes/${currentId.value}/image?t=${imageTimestamp.value}`;
});

// --- Watchers ---

watch(() => props.open, async (open) => {
  if (!open) return;
  error.value = null;
  clearPendingImage();
  if (props.recipeId === null) {
    mode.value = 'create';
    recipe.value = null;
    resetEditForm();
  } else {
    mode.value = 'view';
    await loadRecipe(props.recipeId);
  }
});

// --- Methods ---

async function loadRecipe(id) {
  isLoading.value = true;
  error.value = null;
  try {
    recipe.value = await store.fetchRecipe(id);
    imageTimestamp.value = Date.now();
  } catch {
    error.value = 'Failed to load recipe.';
  } finally {
    isLoading.value = false;
  }
}

function resetEditForm() {
  editTitle.value = '';
  editBody.value = '';
  editTags.value = [];
  tagInput.value = '';
}

function startEdit() {
  editTitle.value = recipe.value.title;
  editBody.value = recipe.value.body;
  editTags.value = [...recipe.value.tags];
  tagInput.value = '';
  mode.value = 'edit';
}

function clearPendingImage() {
  if (pendingImagePreviewUrl.value) {
    URL.revokeObjectURL(pendingImagePreviewUrl.value);
    pendingImagePreviewUrl.value = null;
  }
  pendingImageFile.value = null;
}

// --- Tag input ---

function handleTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    commitTag();
  }
}

function handleTagInput(e) {
  // Strip whitespace and enforce uppercase as user types
  e.target.value = e.target.value.replace(/\s/g, '').toUpperCase();
  tagInput.value = e.target.value;
}

function commitTag() {
  const tag = tagInput.value.trim().toUpperCase();
  if (tag && /^\S+$/.test(tag) && !editTags.value.includes(tag)) {
    editTags.value.push(tag);
  }
  tagInput.value = '';
}

function removeTag(tag) {
  editTags.value = editTags.value.filter(t => t !== tag);
}

// --- Title input ---

function handleTitleKeydown(e) {
  if (e.key === 'Enter') e.preventDefault();
}

function handleTitleInput(e) {
  if (e.target.value.includes('\n')) {
    e.target.value = e.target.value.replace(/\n/g, '');
    editTitle.value = e.target.value;
  }
}

// --- Image handling ---

async function handleImageFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (mode.value === 'create') {
    // Store for upload on save; show preview via blob URL
    clearPendingImage();
    pendingImageFile.value = file;
    pendingImagePreviewUrl.value = URL.createObjectURL(file);
  } else {
    // Edit mode: upload immediately
    isLoading.value = true;
    error.value = null;
    try {
      const result = await store.uploadImage(currentId.value, file);
      recipe.value = { ...recipe.value, imageName: result.imageName };
      imageTimestamp.value = Date.now();
    } catch (err) {
      error.value = err.message || 'Failed to upload image.';
    } finally {
      isLoading.value = false;
      e.target.value = '';
    }
  }
}

async function handleImageRemove() {
  if (mode.value === 'create') {
    clearPendingImage();
    return;
  }
  // Edit mode: remove immediately
  isLoading.value = true;
  error.value = null;
  try {
    await store.removeImage(currentId.value);
    recipe.value = { ...recipe.value, imageName: null };
    imageTimestamp.value = Date.now();
  } catch (err) {
    error.value = err.message || 'Failed to remove image.';
  } finally {
    isLoading.value = false;
  }
}

// --- Save / Cancel / Delete ---

async function handleSave() {
  // Flush any pending tag in the input
  commitTag();
  const title = editTitle.value.trim();
  if (!title) {
    error.value = 'Title is required.';
    return;
  }
  error.value = null;
  isLoading.value = true;
  try {
    const data = { title, body: editBody.value, tags: editTags.value };
    if (mode.value === 'create') {
      const created = await store.createRecipe(data);
      recipe.value = { ...created };
      // Upload pending image if any
      if (pendingImageFile.value) {
        try {
          const result = await store.uploadImage(created.id, pendingImageFile.value);
          recipe.value = { ...recipe.value, imageName: result.imageName };
        } catch {
          error.value = 'Recipe saved but image upload failed.';
        }
        clearPendingImage();
      }
      imageTimestamp.value = Date.now();
    } else {
      const updated = await store.updateRecipe(currentId.value, data);
      recipe.value = { ...updated, imageName: recipe.value.imageName };
    }
    mode.value = 'view';
  } catch (err) {
    error.value = err.message || 'Failed to save recipe.';
  } finally {
    isLoading.value = false;
  }
}

function handleCancel() {
  error.value = null;
  if (mode.value === 'create') {
    clearPendingImage();
    emit('close');
  } else {
    mode.value = 'view';
  }
}

async function handleDelete() {
  if (!confirm('Delete this recipe? This cannot be undone.')) return;
  isLoading.value = true;
  try {
    await store.deleteRecipe(currentId.value);
    emit('close');
  } catch {
    error.value = 'Failed to delete recipe.';
    isLoading.value = false;
  }
}
</script>

<template>
  <DialogRoot :open="open" @update:open="(v) => !v && emit('close')">
    <DialogPortal>
      <DialogOverlay class="overlay" />
      <DialogContent class="modal" aria-describedby="undefined">

        <!-- Loading -->
        <div v-if="isLoading" class="loading">Loading…</div>

        <!-- View Mode -->
        <template v-else-if="mode === 'view' && recipe">
          <div class="modal-inner">
            <div class="modal-header">
              <DialogTitle class="modal-title">{{ recipe.title }}</DialogTitle>
              <div class="modal-actions">
                <button class="icon-btn" type="button" title="Edit" aria-label="Edit" @click="startEdit">
                  <span class="mdi mdi-pencil" aria-hidden="true"></span>
                </button>
                <button class="icon-btn" type="button" title="Delete" aria-label="Delete" @click="handleDelete">
                  <span class="mdi mdi-trash-can-outline" aria-hidden="true"></span>
                </button>
                <button class="icon-btn" type="button" title="Close" aria-label="Close" @click="emit('close')">
                  <span class="mdi mdi-close" aria-hidden="true"></span>
                </button>
              </div>
            </div>
            <div class="modal-scroll">
              <div v-if="recipe.tags.length > 0" class="tags-row">
                <span v-for="tag in recipe.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <div v-if="recipe.body" class="body-text">{{ recipe.body }}</div>
              <div v-if="displayImageUrl" class="image-section">
                <img :src="displayImageUrl" class="recipe-image" alt="Recipe image" />
              </div>
              <div v-if="error" class="error-msg">{{ error }}</div>
            </div>
          </div>
        </template>

        <!-- Edit / Create Mode -->
        <template v-else-if="mode === 'edit' || mode === 'create'">
          <div class="modal-inner">
            <div class="modal-header">
              <DialogTitle class="modal-title">
                {{ mode === 'create' ? 'New Recipe' : 'Edit Recipe' }}
              </DialogTitle>
              <button class="icon-btn" type="button" title="Cancel" aria-label="Cancel" @click="handleCancel">
                <span class="mdi mdi-close" aria-hidden="true"></span>
              </button>
            </div>

            <div class="modal-scroll">
              <div class="form">
                <label class="field-label">Title</label>
                <input
                  v-model="editTitle"
                  class="field-input"
                  type="text"
                  placeholder="Recipe title"
                  @keydown="handleTitleKeydown"
                  @input="handleTitleInput"
                />

                <label class="field-label">Tags</label>
                <div class="tags-edit">
                  <span
                    v-for="tag in editTags"
                    :key="tag"
                    class="tag tag--chip"
                  >
                    {{ tag }}
                    <button class="tag-remove" type="button" aria-label="Remove tag" @click="removeTag(tag)">
                      <span class="mdi mdi-close" aria-hidden="true"></span>
                    </button>
                  </span>
                  <input
                    v-model="tagInput"
                    class="tag-input"
                    type="text"
                    placeholder="Add tag…"
                    @keydown="handleTagKeydown"
                    @input="handleTagInput"
                    @blur="commitTag"
                  />
                </div>

                <label class="field-label">Body</label>
                <textarea
                  v-model="editBody"
                  class="field-textarea"
                  rows="6"
                  placeholder="Recipe instructions…"
                />

                <label class="field-label">Image</label>
                <div v-if="displayImageUrl" class="image-edit-row">
                  <img :src="displayImageUrl" class="image-thumb" alt="Current image" />
                  <button class="btn btn--danger btn--sm" type="button" @click="handleImageRemove">
                    Remove image
                  </button>
                </div>
                <div v-else class="image-upload-row">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif"
                    @change="handleImageFileSelect"
                  />
                </div>
              </div>

              <div v-if="error" class="error-msg">{{ error }}</div>

              <div class="modal-footer">
                <button class="btn btn--secondary" type="button" @click="handleCancel">Cancel</button>
                <button class="btn btn--primary" type="button" :disabled="isLoading" @click="handleSave">
                  Save
                </button>
              </div>
            </div>
          </div>
        </template>

      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 85vh;
}

.modal-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 20px;
  background: #f7f8f5;
}

.loading {
  padding: 60px;
  text-align: center;
  color: #888;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--color-primary);
  color: #fff;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: inherit;
  flex: 1;
  word-break: break-word;
}

.modal-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  color: #fff;
  line-height: 1;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.icon-btn .mdi {
  font-size: 20px;
}

/* Tags (view mode) */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.tag {
  background: var(--color-primary-soft);
  color: var(--color-primary-dark);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 13px;
}

/* Image */
.image-section {
  margin-bottom: 14px;
}

.recipe-image {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 6px;
  display: block;
}

.body-text {
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-top: 10px;
}

.field-input,
.field-textarea {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  width: 100%;
  font-family: inherit;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--color-primary);
}

.field-textarea {
  resize: vertical;
}

/* Tags edit */
.tags-edit {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  min-height: 42px;
  align-items: center;
  cursor: text;
}

.tag--chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
}

.tag-remove {
  background: none;
  border: none;
  color: var(--color-primary-dark);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tag-remove .mdi {
  font-size: 16px;
  line-height: 1;
}

.tag-input {
  border: none;
  outline: none;
  font-size: 14px;
  flex: 1;
  min-width: 80px;
  background: transparent;
}

/* Image edit */
.image-edit-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.image-thumb {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
  display: block;
}

.image-upload-row {
  margin-top: 4px;
}

/* Error */
.error-msg {
  color: #c00;
  font-size: 13px;
  margin-top: 10px;
}

/* Buttons */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover {
  background: var(--color-primary-dark);
}

.btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--secondary {
  background: #f0f0f0;
  color: #333;
}

.btn--secondary:hover {
  background: #e0e0e0;
}

.btn--danger {
  background: #fee2e2;
  color: #b00;
}

.btn--danger:hover {
  background: #fecaca;
}

.btn--sm {
  padding: 5px 12px;
  font-size: 13px;
}
</style>
