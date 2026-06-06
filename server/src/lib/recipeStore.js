import { readFile, writeFile, readdir, rename } from 'fs/promises';
import { join } from 'path';
import { DATA_DIR } from '../config/constants.js';
import { parseRecipe, serialiseRecipe } from './recipe.js';

export async function findImageFile(dir) {
  try {
    const files = await readdir(dir);
    return files.find(f => /^image\.\w+$/.test(f)) ?? null;
  } catch {
    return null;
  }
}

export async function listRecipeIds() {
  try {
    const entries = await readdir(DATA_DIR, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  } catch {
    return [];
  }
}

export async function readRecipeFromDisk(id) {
  const dir = join(DATA_DIR, id);
  const text = await readFile(join(dir, 'recipe.txt'), 'utf8');
  return { id, ...parseRecipe(text) };
}

export async function writeRecipeAtomic(dir, recipe) {
  const tmpPath = join(dir, 'recipe.tmp');
  const targetPath = join(dir, 'recipe.txt');
  await writeFile(tmpPath, serialiseRecipe(recipe), 'utf8');
  await rename(tmpPath, targetPath);
}
