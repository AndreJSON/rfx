<template>
  <textarea
    :value="modelValue"
    class="textarea"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>

<style scoped>
.textarea {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  outline: none;
  width: 100%;
  font-family: inherit;
  resize: vertical;
  background: #fff;
}

.textarea:focus {
  border-color: var(--color-primary);
}
</style>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  rows: { type: [Number, String], default: 4 },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
</script>