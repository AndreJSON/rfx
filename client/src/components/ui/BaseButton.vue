<template>
  <button
    :class="buttonClasses"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  border: none;
  border-radius: 6px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover:enabled {
  background: var(--color-primary-dark);
}

.btn--secondary {
  background: #f0f0f0;
  color: #333;
}

.btn--secondary:hover:enabled {
  background: #e0e0e0;
}

.btn--danger {
  background: #fee2e2;
  color: #b00;
}

.btn--danger:hover:enabled {
  background: #fecaca;
}

.btn--surface {
  background: #fff;
  color: var(--color-primary);
}

.btn--surface:hover:enabled {
  background: #e6e6e6;
}

.btn--icon {
  background: none;
  color: #fff;
}

.btn--icon:hover:enabled {
  background: rgba(255, 255, 255, 0.18);
}

.btn--card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: #fff;
  border: 1px solid #e0e0e0;
  text-align: left;
  width: 100%;
}

.btn--card:hover:enabled {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.btn--ghost {
  background: transparent;
}

.btn--xs {
  padding: 0;
  font-size: 14px;
}

.btn--sm {
  padding: 5px 12px;
  font-size: 13px;
}

.btn--md {
  padding: 8px 20px;
  font-size: 14px;
}

.btn--lg {
  padding: 10px 24px;
  font-size: 15px;
}

.btn--square-sm {
  width: 36px;
  height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn--square-xs {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn--rounded {
  border-radius: 999px;
}
</style>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: { type: String, default: 'button' },
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
  square: { type: Boolean, default: false },
  rounded: { type: Boolean, default: false },
});

const buttonClasses = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  props.square ? `btn--square-${props.size}` : null,
  props.rounded ? 'btn--rounded' : null,
]);
</script>