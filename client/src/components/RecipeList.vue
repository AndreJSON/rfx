<template>
  <div class="recipe-list">
    <div v-if="filtered.length === 0" class="empty-state">
      <template v-if="store.searchQuery">No recipes match your search.</template>
      <template v-else>No recipes yet. Click the add button to create one.</template>
    </div>
    <section
      v-for="section in recipesBySection"
      :key="section.label"
      class="recipe-section"
    >
      <h2 class="section-title">{{ section.label }}</h2>
      <BaseButton
        v-for="recipe in section.recipes"
        :key="`${section.label}-${recipe.id}`"
        variant="card"
        size="lg"
        class="recipe-card"
        @click="emit('open-recipe', recipe.id)"
      >
        <span class="recipe-title">{{ recipe.title }}</span>
        <span class="recipe-tags">{{ recipe.tags.join(', ') }}</span>
      </BaseButton>
    </section>
  </div>
</template>

<style scoped>
.recipe-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.recipe-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.section-title {
  position: sticky;
  top: 0;
  font-size: 15px;
  font-weight: 700;
  color: #444;
  margin: 4px 0;
  position: sticky;
  top: 0;
  background: rgba(129, 199, 132, 0.08);
  padding: 8px 0;
  z-index: 5;
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
const SECTIONS = [
  { label: 'Varmrätt', tag: 'varmrätt' },
  { label: 'Tillbehör', tag: 'tillbehör' },
  { label: 'Smårätt', tag: 'smårätt' },
  { label: 'Sött', tag: 'sött' },
  { label: 'Bakat', tag: 'bakat' },
];
const OTHER_SECTION_LABEL = 'Övrigt';

const filtered = computed(() => {
  const q = store.searchQuery.toLowerCase().trim();
  if (!q) return store.recipes;
  return store.recipes.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.tags.some(t => t.toLowerCase().includes(q))
  );
});

const recipesBySection = computed(() => {
  const sectionMap = new Map(SECTIONS.map(section => [section.label, []]));
  const otherRecipes = [];

  for (const recipe of filtered.value) {
    const recipeTags = new Set(recipe.tags.map(tag => tag.toLowerCase()));
    let appearsInAnySection = false;

    for (const section of SECTIONS) {
      if (recipeTags.has(section.tag)) {
        sectionMap.get(section.label).push(recipe);
        appearsInAnySection = true;
      }
    }

    if (!appearsInAnySection) {
      otherRecipes.push(recipe);
    }
  }

  return [
    ...SECTIONS.map(section => ({
      label: section.label,
      recipes: sectionMap.get(section.label),
    })),
    { label: OTHER_SECTION_LABEL, recipes: otherRecipes },
  ];
});
</script>