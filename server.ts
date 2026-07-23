import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // TMDB Proxy and Health Check API
  app.get('/api/health', (req, res) => {
    const tmdbKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN;
    res.json({
      status: 'ok',
      hasTmdbKey: Boolean(tmdbKey),
      app: 'VIDARIX'
    });
  });

  app.get('/api/tmdb/proxy', async (req, res) => {
    const tmdbKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN;
    const endpoint = req.query.endpoint as string;

    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint parameter' });
      return;
    }

    if (!tmdbKey) {
      // Respond with indication to client to use local rich mock dataset
      res.json({ fallback: true, message: 'TMDB_API_KEY is not configured on server' });
      return;
    }

    try {
      const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
      url.searchParams.set('api_key', tmdbKey);
      url.searchParams.set('language', 'pt-BR');
      url.searchParams.set('region', 'BR');

      // Forward extra query params
      Object.keys(req.query).forEach((key) => {
        if (key !== 'endpoint') {
          url.searchParams.set(key, req.query[key] as string);
        }
      });

      const tmdbRes = await fetch(url.toString());
      if (!tmdbRes.ok) {
        res.json({ fallback: true, status: tmdbRes.status });
        return;
      }
      const data = await tmdbRes.json();
      res.json(data);
    } catch (err) {
      res.json({ fallback: true, error: (err as Error).message });
    }
  });

  // Vite middleware for dev or Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VIDARIX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
