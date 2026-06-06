<template>
  <div class="app">
    <header class="toolbar">
      <BaseInput
        v-model="store.searchQuery"
        variant="search"
        class="search-input"
        type="search"
        placeholder="Search recipes…"
      />
      <BaseButton
        class="add-btn"
        variant="surface"
        size="sm"
        square
        title="New recipe"
        aria-label="New recipe"
        @click="openCreate"
      >
        <span class="mdi mdi-plus" aria-hidden="true"></span>
      </BaseButton>
    </header>
    <main class="content">
      <RecipeList @open-recipe="openRecipe" />
    </main>
    <RecipeModal
      :open="modalOpen"
      :recipe-id="selectedRecipeId"
      @close="closeModal"
    />
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-primary: #81c784;
  --color-primary-dark: #66bb6a;
  --color-primary-soft: #e8f5e9;
  font-family: system-ui, -apple-system, sans-serif;
}

body {
  background: #f5f5f5;
  color: #333;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  background: var(--color-primary);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-input {
  flex: 1;
}

.add-btn {
  flex-shrink: 0;
}

.add-btn .mdi {
  font-size: 24px;
}

.content {
  flex: 1;
  padding: 16px;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}
</style>

<script setup>
import { onMounted, ref } from 'vue';
import { useRecipeStore } from './stores/recipeStore.js';
import RecipeList from './components/RecipeList.vue';
import RecipeModal from './components/RecipeModal.vue';
import BaseButton from './components/ui/BaseButton.vue';
import BaseInput from './components/ui/BaseInput.vue';

const store = useRecipeStore();
const modalOpen = ref(false);
const selectedRecipeId = ref(null);

onMounted(() => {
  store.fetchRecipes();
});

function openCreate() {
  selectedRecipeId.value = null;
  modalOpen.value = true;
}

function openRecipe(id) {
  selectedRecipeId.value = id;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}
</script>