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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res) => {
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.redirect(`http://localhost:5173${req.originalUrl}`);
  });
}

await mkdir(DATA_DIR, { recursive: true });
app.listen(8080, () => {
  console.log('Server running on http://localhost:8080');
});
