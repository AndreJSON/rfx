import express from 'express';
import multer from 'multer';
import { createReadStream } from 'fs';
import { readdir, rm, mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import { ACCEPTED_MIMES, DATA_DIR, EXT_TO_MIME, MIME_TO_EXT } from '../config/constants.js';
import {
  findImageFile,
  listRecipeIds,
  readRecipeFromDisk,
  writeRecipeAtomic,
} from '../lib/recipeStore.js';
import { validateTags, validateTitle } from '../lib/validation.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  try {
    const ids = await listRecipeIds();
    const results = [];

    for (const id of ids) {
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

router.get('/:id', async (req, res) => {
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

router.post('/', async (req, res) => {
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

    res.status(201).json({
      id,
      title: recipe.title,
      tags: recipe.tags,
      body: recipe.body,
      imageName: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
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

router.post('/:id/image', upload.single('image'), async (req, res) => {
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

    const existing = await readdir(dir);
    for (const filename of existing) {
      if (/^image\.\w+$/.test(filename)) {
        await rm(join(dir, filename));
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

router.delete('/:id/image', async (req, res) => {
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

router.get('/:id/image', async (req, res) => {
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

export default router;
