<template>
  <input
    :value="modelValue"
    :class="inputClasses"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emit('update:modelValue', $event.target.value)"
    @keydown="emit('keydown', $event)"
    @blur="emit('blur', $event)"
  />
</template>

<style scoped>
.input {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  width: 100%;
  font-family: inherit;
  background: #fff;
}

.input:focus {
  border-color: var(--color-primary);
}

.input--search {
  border: none;
  padding: 8px 12px;
}

.input--tag {
  border: none;
  outline: none;
  font-size: 14px;
  flex: 1;
  min-width: 80px;
  background: transparent;
  padding: 0;
}
</style>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  variant: { type: String, default: 'default' },
});

const emit = defineEmits(['update:modelValue', 'keydown', 'blur']);

const inputClasses = computed(() => ['input', `input--${props.variant}`]);
</script>