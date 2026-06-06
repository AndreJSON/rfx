<script setup>
import { onMounted, ref } from 'vue';
import { useRecipeStore } from './stores/recipeStore.js';
import RecipeList from './components/RecipeList.vue';
import RecipeModal from './components/RecipeModal.vue';

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

<template>
  <div class="app">
    <header class="toolbar">
      <input
        v-model="store.searchQuery"
        class="search-input"
        type="search"
        placeholder="Search recipes…"
      />
      <button class="add-btn" title="New recipe" @click="openCreate">+</button>
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
  --color-primary: #008080;
  --color-primary-dark: #006666;
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
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
}

.add-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  background: white;
  color: var(--color-primary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.add-btn:hover {
  background: #e6e6e6;
}

.content {
  flex: 1;
  padding: 16px;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}
</style>
