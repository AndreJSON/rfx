import express from 'express';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { CLIENT_DIST, DATA_DIR } from './config/constants.js';
import recipesRouter from './routes/recipes.js';

const app = express();
app.use(express.json());

app.use('/api/recipes', recipesRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const env = process.argv[2];

if (env === 'prod') {
  console.log('Running in production mode');
  app.use(express.static(CLIENT_DIST));
  app.use((req, res) => {
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });
} else {
  console.log('Running in development mode');
  app.use((req, res) => {
    res.redirect(`http://localhost:5173${req.originalUrl}`);
  });
}

await mkdir(DATA_DIR, { recursive: true });
app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});
