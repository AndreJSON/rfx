import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRecipeStore = defineStore('recipes', () => {
  const recipes = ref([]);
  const searchQuery = ref('');

  async function fetchRecipes() {
    const res = await fetch('/api/recipes');
    if (!res.ok) throw new Error('Failed to fetch recipes');
    recipes.value = await res.json();
  }

  async function fetchRecipe(id) {
    const res = await fetch(`/api/recipes/${id}`);
    if (!res.ok) throw new Error('Failed to fetch recipe');
    return res.json();
  }

  async function createRecipe(data) {
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create recipe');
    }
    const created = await res.json();
    await fetchRecipes();
    return created;
  }

  async function updateRecipe(id, data) {
    const res = await fetch(`/api/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update recipe');
    }
    const updated = await res.json();
    await fetchRecipes();
    return updated;
  }

  async function deleteRecipe(id) {
    const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete recipe');
    recipes.value = recipes.value.filter(r => r.id !== id);
  }

  async function uploadImage(id, file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`/api/recipes/${id}/image`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image');
    }
    return res.json();
  }

  async function removeImage(id) {
    const res = await fetch(`/api/recipes/${id}/image`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove image');
  }

  return {
    recipes,
    searchQuery,
    fetchRecipes,
    fetchRecipe,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    uploadImage,
    removeImage,
  };
});
