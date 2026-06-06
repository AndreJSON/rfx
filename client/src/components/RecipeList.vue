<template>
  <div class="recipe-list">
    <div v-if="filtered.length === 0" class="empty-state">
      <template v-if="store.searchQuery">No recipes match your search.</template>
      <template v-else>No recipes yet. Click the add button to create one.</template>
    </div>
    <BaseButton
      v-for="recipe in filtered"
      :key="recipe.id"
      variant="card"
      size="lg"
      class="recipe-card"
      @click="emit('open-recipe', recipe.id)"
    >
      <span class="recipe-title">{{ recipe.title }}</span>
      <span class="recipe-tags">{{ recipe.tags.join(', ') }}</span>
    </BaseButton>
  </div>
</template>

<style scoped>
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.empty-state {
  text-align: center;
  color: #888;
  margin-top: 40px;
  font-size: 15px;
}

.recipe-card {
  border-radius: 8px;
  padding: 6px 12px;
  gap: 1px;
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
import BaseButton from './ui/BaseButton.vue';

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