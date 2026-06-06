<template>
  <div class="recipe-list">
    <div v-if="filtered.length === 0" class="empty-state">
      <template v-if="store.searchQuery">No recipes match your search.</template>
      <template v-else>No recipes yet. Click the add button to create one.</template>
    </div>
    <button
      v-for="recipe in filtered"
      :key="recipe.id"
      class="recipe-card"
      @click="emit('open-recipe', recipe.id)"
    >
      <span class="recipe-title">{{ recipe.title }}</span>
      <span class="recipe-tags">{{ recipe.tags.join(', ') }}</span>
    </button>
  </div>
</template>

<style scoped>
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.empty-state {
  text-align: center;
  color: #888;
  margin-top: 40px;
  font-size: 15px;
}

.recipe-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: box-shadow 0.15s;
}

.recipe-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recipe-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.recipe-tags {
  font-size: 13px;
  color: #777;
}
</style>

<script setup>
import { computed } from 'vue';
import { useRecipeStore } from '../stores/recipeStore.js';

const emit = defineEmits(['open-recipe']);
const store = useRecipeStore();

const filtered = computed(() => {
  const q = store.searchQuery.toLowerCase().trim();
  if (!q) return store.recipes;
  return store.recipes.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  );
});
</script>