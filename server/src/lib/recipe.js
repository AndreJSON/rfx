/**
 * Parse recipe.txt text into a recipe object.
 * Format (6 fixed sections):
 *   TITLE: <value>
 *   CREATED: <iso>
 *   UPDATED: <iso>
 *   DELETED: <iso or empty>
 *   TAGS: <comma-separated or empty>
 *   BODY: <first line>
 *   <continuation lines...>
 */
export function parseRecipe(text) {
  const lines = text.split('\n');
  const title = lines[0].replace(/^TITLE: /, '');
  const created = lines[1].replace(/^CREATED: /, '');
  const updated = lines[2].replace(/^UPDATED: /, '');
  const deleted = lines[3].replace(/^DELETED: /, '');
  const tagsStr = lines[4].replace(/^TAGS: /, '');
  const tags = tagsStr ? tagsStr.split(',').filter(t => t.length > 0) : [];
  const bodyFirstLine = lines[5] ? lines[5].replace(/^BODY: /, '') : '';
  const bodyRest = lines.slice(6).join('\n');
  const body = bodyRest.length > 0 ? bodyFirstLine + '\n' + bodyRest : bodyFirstLine;
  return { title, created, updated, deleted, tags, body };
}

/**
 * Serialise a recipe object to recipe.txt text.
 */
export function serialiseRecipe({ title, created, updated, deleted, tags, body }) {
  const tagsStr = (tags ?? []).join(',');
  const bodyStr = body ?? '';
  return `TITLE: ${title}\nCREATED: ${created}\nUPDATED: ${updated}\nDELETED: ${deleted ?? ''}\nTAGS: ${tagsStr}\nBODY: ${bodyStr}`;
}
