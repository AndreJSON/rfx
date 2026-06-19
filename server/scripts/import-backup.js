import { access, copyFile, mkdir, readFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { writeRecipeAtomic } from '../src/lib/recipeStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaults = {
  sqlPath: resolve(__dirname, '../../rfxbk/dump.sql'),
  imagesDir: resolve(__dirname, '../../rfxbk/images'),
  dataDir: resolve(__dirname, '../data'),
};

function parseArgs(argv) {
  const parsed = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sql' && argv[i + 1]) {
      parsed.sqlPath = resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--images' && argv[i + 1]) {
      parsed.imagesDir = resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--data' && argv[i + 1]) {
      parsed.dataDir = resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--help') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printUsage() {
  console.log('Usage: npm run import:backup --workspace=server -- [--sql <path>] [--images <dir>] [--data <dir>]');
}

function extractRecipesInsertValues(sqlDump) {
  const marker = 'INSERT INTO `recipes` VALUES ';
  const start = sqlDump.indexOf(marker);
  if (start === -1) {
    throw new Error('Could not find recipes INSERT statement in SQL dump.');
  }

  let inString = false;
  let statement = '';
  for (let i = start + marker.length; i < sqlDump.length; i += 1) {
    const ch = sqlDump[i];
    const next = i + 1 < sqlDump.length ? sqlDump[i + 1] : '';

    if (inString) {
      statement += ch;
      if (ch === '\\') {
        if (next) {
          statement += next;
          i += 1;
        }
        continue;
      }
      if (ch === "'" && next === "'") {
        statement += next;
        i += 1;
        continue;
      }
      if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      statement += ch;
      continue;
    }

    if (ch === ';') {
      return statement;
    }

    statement += ch;
  }

  throw new Error('Could not determine end of recipes INSERT statement.');
}

function splitRecipeTuples(valuesSection) {
  const tuples = [];
  let inString = false;
  let depth = 0;
  let buffer = '';

  for (let i = 0; i < valuesSection.length; i += 1) {
    const ch = valuesSection[i];
    const next = i + 1 < valuesSection.length ? valuesSection[i + 1] : '';

    if (inString) {
      if (depth > 0) {
        buffer += ch;
      }
      if (ch === '\\') {
        if (depth > 0 && next) {
          buffer += next;
        }
        i += 1;
        continue;
      }
      if (ch === "'" && next === "'") {
        if (depth > 0) {
          buffer += next;
        }
        i += 1;
        continue;
      }
      if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      if (depth > 0) {
        buffer += ch;
      }
      continue;
    }

    if (ch === '(') {
      if (depth === 0) {
        buffer = '';
      } else {
        buffer += ch;
      }
      depth += 1;
      continue;
    }

    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        tuples.push(buffer);
        buffer = '';
      } else if (depth > 0) {
        buffer += ch;
      } else {
        throw new Error('Malformed SQL tuple list.');
      }
      continue;
    }

    if (depth > 0) {
      buffer += ch;
    }
  }

  if (depth !== 0 || inString) {
    throw new Error('Unbalanced SQL data while splitting tuples.');
  }

  return tuples;
}

function decodeSqlString(sqlStringContent) {
  let out = '';
  for (let i = 0; i < sqlStringContent.length; i += 1) {
    const ch = sqlStringContent[i];
    const next = i + 1 < sqlStringContent.length ? sqlStringContent[i + 1] : '';

    if (ch === "'" && next === "'") {
      out += "'";
      i += 1;
      continue;
    }

    if (ch !== '\\') {
      out += ch;
      continue;
    }

    const escaped = next;
    i += 1;
    if (escaped === 'n') out += '\n';
    else if (escaped === 'r') out += '\r';
    else if (escaped === 't') out += '\t';
    else if (escaped === '0') out += '\0';
    else if (escaped === 'b') out += '\b';
    else if (escaped === 'Z') out += '\x1A';
    else if (escaped) out += escaped;
  }
  return out;
}

function parseSqlValue(rawValue) {
  const token = rawValue.trim();
  if (/^NULL$/i.test(token)) {
    return null;
  }
  if (token.startsWith("'") && token.endsWith("'")) {
    return decodeSqlString(token.slice(1, -1));
  }
  if (/^-?\d+$/.test(token)) {
    return Number(token);
  }
  return token;
}

function splitTupleFields(tupleContent) {
  const fields = [];
  let inString = false;
  let buffer = '';

  for (let i = 0; i < tupleContent.length; i += 1) {
    const ch = tupleContent[i];
    const next = i + 1 < tupleContent.length ? tupleContent[i + 1] : '';

    if (inString) {
      buffer += ch;
      if (ch === '\\') {
        if (next) {
          buffer += next;
          i += 1;
        }
        continue;
      }
      if (ch === "'" && next === "'") {
        buffer += next;
        i += 1;
        continue;
      }
      if (ch === "'") {
        inString = false;
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      buffer += ch;
      continue;
    }

    if (ch === ',') {
      fields.push(parseSqlValue(buffer));
      buffer = '';
      continue;
    }

    buffer += ch;
  }

  fields.push(parseSqlValue(buffer));
  return fields;
}

function tryMysqlDateTimeToIso(mysqlDateTime) {
  if (typeof mysqlDateTime !== 'string' || mysqlDateTime.trim().length === 0) {
    return null;
  }
  const parsed = new Date(mysqlDateTime.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed.toISOString();
}

function parseTags(tagsRaw) {
  if (typeof tagsRaw !== 'string' || tagsRaw.trim() === '') return [];
  const tags = tagsRaw
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0 && !/\s/.test(tag));
  return [...new Set(tags)];
}

async function exists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toImportedRecipe(legacyRow) {
  const [legacyId, createdAt, updatedAt, title, text, tags, imageName] = legacyRow;
  if (legacyRow.length !== 7) {
    throw new Error(`Unexpected recipe row length (${legacyRow.length}) for legacy id ${legacyId}`);
  }

  if (typeof title !== 'string' || title.includes('\n')) {
    throw new Error(`Invalid title for legacy id ${legacyId}`);
  }

  const normalizedTitle = title.trim() === '' ? `Recipe ${legacyId}` : title.trim();

  const updatedIso = tryMysqlDateTimeToIso(updatedAt);
  if (!updatedIso) {
    throw new Error(`Invalid updatedAt datetime for legacy id ${legacyId}: ${updatedAt}`);
  }

  const createdIso = tryMysqlDateTimeToIso(createdAt) ?? updatedIso;

  return {
    legacyId,
    title: normalizedTitle,
    body: typeof text === 'string' ? text : '',
    tags: parseTags(tags),
    imageName: typeof imageName === 'string' && imageName.trim() !== '' ? imageName.trim() : null,
    created: createdIso,
    updated: updatedIso,
    deleted: '',
    id: uuidv4(),
  };
}

async function copyImageIfPresent(importedRecipe, imagesDir, destinationDir) {
  if (!importedRecipe.imageName) return false;

  const sourcePath = join(imagesDir, importedRecipe.imageName);
  const sourceExists = await exists(sourcePath);
  if (!sourceExists) {
    console.warn(
      `Missing image for legacy id ${importedRecipe.legacyId}: ${importedRecipe.imageName}. Importing without image.`,
    );
    return false;
  }

  const extension = extname(importedRecipe.imageName).toLowerCase();
  if (!extension) {
    throw new Error(`Image file has no extension: ${importedRecipe.imageName}`);
  }

  const targetName = `image${extension}`;
  await copyFile(sourcePath, join(destinationDir, targetName));
  return true;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sqlDump = await readFile(options.sqlPath, 'utf8');

  const valuesSection = extractRecipesInsertValues(sqlDump);
  const tuples = splitRecipeTuples(valuesSection);
  const rows = tuples.map(splitTupleFields);
  const imported = rows.map(toImportedRecipe);

  await mkdir(options.dataDir, { recursive: true });

  let importedCount = 0;
  let imageCount = 0;
  for (const recipe of imported) {
    const recipeDir = join(options.dataDir, recipe.id);
    await mkdir(recipeDir, { recursive: false });

    await writeRecipeAtomic(recipeDir, {
      id: recipe.id,
      title: recipe.title,
      body: recipe.body,
      tags: recipe.tags,
      created: recipe.created,
      updated: recipe.updated,
      deleted: recipe.deleted,
    });

    if (await copyImageIfPresent(recipe, options.imagesDir, recipeDir)) {
      imageCount += 1;
    }

    importedCount += 1;
  }

  console.log(`Imported ${importedCount} recipes to ${options.dataDir}.`);
  console.log(`Copied ${imageCount} images from ${options.imagesDir}.`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
