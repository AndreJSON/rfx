import express from 'express';
import { readFile, writeFile, mkdir, rm, readdir, rename } from 'fs/promises';
import { createReadStream } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import multer from 'multer';
import { parseRecipe, serialiseRecipe } from './lib/recipe.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const CLIENT_DIST = join(__dirname, '../../client/dist');

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/avif': '.avif',
};

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.avif': 'image/avif',
};

const ACCEPTED_MIMES = new Set(Object.keys(MIME_TO_EXT));

const app = express();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// --- Helpers ---

async function findImageFile(dir) {
  try {
    const files = await readdir(dir);
    return files.find(f => /^image\.\w+$/.test(f)) ?? null;
  } catch {
    return null;
  }
}

async function readRecipeFromDisk(id) {
  const dir = join(DATA_DIR, id);
  const text = await readFile(join(dir, 'recipe.txt'), 'utf8');
  return { id, ...parseRecipe(text) };
}

async function writeRecipeAtomic(dir, recipe) {
  const tmpPath = join(dir, 'recipe.tmp');
  const targetPath = join(dir, 'recipe.txt');
  await writeFile(tmpPath, serialiseRecipe(recipe), 'utf8');
  await rename(tmpPath, targetPath);
}

function validateTitle(title) {
  return typeof title === 'string' && title.trim().length > 0 && !title.includes('\n');
}

function validateTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter(t => typeof t === 'string' && /^\S+$/.test(t)))];
}

// --- API Routes ---

app.get('/api/recipes', async (req, res) => {
  try {
    let entries;
    try {
      entries = await readdir(DATA_DIR, { withFileTypes: true });
    } catch {
      return res.json([]);
    }
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    const results = [];
    for (const id of dirs) {
      try {
        const recipe = await readRecipeFromDisk(id);
        if (!recipe.deleted) {
          results.push({ id: recipe.id, title: recipe.title, tags: recipe.tags, _created: recipe.created });
        }
      } catch {
        // skip unreadable recipe folders
      }
    }
    results.sort((a, b) => new Date(a._created) - new Date(b._created));
    res.json(results.map(({ id, title, tags }) => ({ id, title, tags })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const recipe = await readRecipeFromDisk(id);
    if (recipe.deleted) return res.status(404).json({ error: 'Recipe not found' });
    const imageName = await findImageFile(dir);
    res.json({ id: recipe.id, title: recipe.title, tags: recipe.tags, body: recipe.body, imageName });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { title, tags = [], body = '' } = req.body;
    if (!validateTitle(title)) return res.status(400).json({ error: 'Invalid title' });
    const id = uuidv4();
    const now = new Date().toISOString();
    const recipe = {
      id,
      title: title.trim(),
      created: now,
      updated: now,
      deleted: '',
      tags: validateTags(tags),
      body: typeof body === 'string' ? body : '',
    };
    const dir = join(DATA_DIR, id);
    await mkdir(dir, { recursive: true });
    await writeRecipeAtomic(dir, recipe);
    res.status(201).json({ id, title: recipe.title, tags: recipe.tags, body: recipe.body, imageName: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const existing = await readRecipeFromDisk(id);
    if (existing.deleted) return res.status(404).json({ error: 'Recipe not found' });
    const { title, tags, body } = req.body;
    if (!validateTitle(title)) return res.status(400).json({ error: 'Invalid title' });
    const updated = {
      id,
      title: title.trim(),
      created: existing.created,
      updated: new Date().toISOString(),
      deleted: existing.deleted,
      tags: validateTags(tags),
      body: typeof body === 'string' ? body : '',
    };
    await writeRecipeAtomic(dir, updated);
    const imageName = await findImageFile(dir);
    res.json({ id, title: updated.title, tags: updated.tags, body: updated.body, imageName });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const recipe = await readRecipeFromDisk(id);
    if (recipe.deleted) return res.status(404).json({ error: 'Recipe not found' });
    const softDeleted = {
      ...recipe,
      deleted: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    await writeRecipeAtomic(dir, softDeleted);
    res.status(204).send();
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recipes/:id/image', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const recipe = await readRecipeFromDisk(id);
    if (recipe.deleted) return res.status(404).json({ error: 'Recipe not found' });
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const fileType = await fileTypeFromBuffer(req.file.buffer);
    if (!fileType || !ACCEPTED_MIMES.has(fileType.mime)) {
      return res.status(400).json({ error: 'Unsupported image type' });
    }

    // Remove any existing image files
    const existing = await readdir(dir);
    for (const f of existing) {
      if (/^image\.\w+$/.test(f)) {
        await rm(join(dir, f));
      }
    }

    const ext = MIME_TO_EXT[fileType.mime];
    const imageName = `image${ext}`;
    await writeFile(join(dir, imageName), req.file.buffer);
    res.json({ imageName });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/recipes/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const recipe = await readRecipeFromDisk(id);
    if (recipe.deleted) return res.status(404).json({ error: 'Recipe not found' });
    const imageName = await findImageFile(dir);
    if (imageName) {
      await rm(join(dir, imageName));
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/recipes/:id/image', async (req, res) => {
  try {
    const { id } = req.params;
    const dir = join(DATA_DIR, id);
    const recipe = await readRecipeFromDisk(id);
    if (recipe.deleted) return res.status(404).json({ error: 'Recipe not found' });
    const imageName = await findImageFile(dir);
    if (!imageName) return res.status(404).json({ error: 'Image not found' });
    const ext = extname(imageName);
    const mimeType = EXT_TO_MIME[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    createReadStream(join(dir, imageName)).pipe(res);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Recipe not found' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 catch-all for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve Vue SPA static files
app.use(express.static(CLIENT_DIST));
app.use((req, res) => {
  res.sendFile(join(CLIENT_DIST, 'index.html'));
});

// Start server
await mkdir(DATA_DIR, { recursive: true });
app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});
