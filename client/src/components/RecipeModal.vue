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
                <BaseButton variant="icon" size="sm" square title="Edit" aria-label="Edit" @click="startEdit">
                  <span class="mdi mdi-pencil" aria-hidden="true"></span>
                </BaseButton>
                <BaseButton variant="icon" size="sm" square title="Delete" aria-label="Delete" @click="handleDelete">
                  <span class="mdi mdi-trash-can-outline" aria-hidden="true"></span>
                </BaseButton>
                <BaseButton variant="icon" size="sm" square title="Close" aria-label="Close" @click="emit('close')">
                  <span class="mdi mdi-close" aria-hidden="true"></span>
                </BaseButton>
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
              <BaseButton variant="icon" size="sm" square title="Cancel" aria-label="Cancel" @click="handleCancel">
                <span class="mdi mdi-close" aria-hidden="true"></span>
              </BaseButton>
            </div>

            <div class="modal-scroll">
              <div class="form">
                <label class="field-label">Title</label>
                <BaseInput
                  v-model="editTitle"
                  type="text"
                  placeholder="Recipe title"
                  @keydown="handleTitleKeydown"
                  @update:model-value="handleTitleInput"
                />

                <label class="field-label">Tags</label>
                <div class="tags-edit">
                  <span
                    v-for="tag in editTags"
                    :key="tag"
                    class="tag tag--chip"
                  >
                    {{ tag }}
                    <BaseButton
                      class="tag-remove"
                      variant="ghost"
                      size="xs"
                      square
                      aria-label="Remove tag"
                      @click="removeTag(tag)"
                    >
                      <span class="mdi mdi-close" aria-hidden="true"></span>
                    </BaseButton>
                  </span>
                  <BaseInput
                    v-model="tagInput"
                    class="tag-input"
                    variant="tag"
                    type="text"
                    placeholder="Add tag…"
                    @keydown="handleTagKeydown"
                    @update:model-value="handleTagInput"
                    @blur="commitTag"
                  />
                </div>

                <label class="field-label">Body</label>
                <BaseTextarea
                  v-model="editBody"
                  rows="6"
                  placeholder="Recipe instructions…"
                />

                <label class="field-label">Image</label>
                <div v-if="displayImageUrl" class="image-edit-row">
                  <img :src="displayImageUrl" class="image-thumb" alt="Current image" />
                  <BaseButton variant="danger" size="sm" @click="handleImageRemove">
                    Remove image
                  </BaseButton>
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
                <BaseButton variant="secondary" @click="handleCancel">Cancel</BaseButton>
                <BaseButton variant="primary" :disabled="isLoading" @click="handleSave">
                  Save
                </BaseButton>
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

.modal-actions .mdi {
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
  color: var(--color-primary-dark);
}

.tag-remove .mdi {
  font-size: 16px;
  line-height: 1;
}

.tag-input {
  flex: 1;
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
</style>

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
import BaseButton from './ui/BaseButton.vue';
import BaseInput from './ui/BaseInput.vue';
import BaseTextarea from './ui/BaseTextarea.vue';

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
  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
    e.preventDefault();
    commitTag();
  }
}

function handleTagInput(e) {
  // Strip whitespace and enforce uppercase as user types
  tagInput.value = e.replace(/\s/g, '').toUpperCase();
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

function handleTitleInput(value) {
  editTitle.value = value.replace(/\n/g, '');
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