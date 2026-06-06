export function validateTitle(title) {
  return typeof title === 'string' && title.trim().length > 0 && !title.includes('\n');
}

export function validateTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter(t => typeof t === 'string' && /^\S+$/.test(t)))];
}
